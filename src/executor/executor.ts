import { TestStep } from "../schema/stepSchema";
import { PlaywrightMCPClient } from "./mcpClient";
import { Logger } from "../utils/logger";
import { saveArtifact } from "../utils/file";
import type { LocatorDiscovery } from "./locatorDiscovery";

export interface ExecutionResult {
  stepId: string;
  action: string;
  success: boolean;
  duration: number;
  result?: string;
  error?: string;
  screenshotPath?: string;
}

/**
 * Step Executor - Converts JSON steps to MCP tool calls
 */
export class StepExecutor {
  private client: PlaywrightMCPClient;
  private logger: Logger;
  private selectors: Record<string, string>;
  private artifactDir: string;
  private locatorDiscovery?: LocatorDiscovery;
  private selfHeal: boolean;

  constructor(
    client: PlaywrightMCPClient,
    logger: Logger,
    selectors: Record<string, string>,
    artifactDir: string,
    options?: { locatorDiscovery?: LocatorDiscovery; selfHeal?: boolean }
  ) {
    this.client = client;
    this.logger = logger;
    this.selectors = selectors;
    this.artifactDir = artifactDir;
    this.locatorDiscovery = options?.locatorDiscovery;
    this.selfHeal = options?.selfHeal !== false; // default true
  }

  /**
   * Resolve target to selector
   */
  private resolveSelector(target: string): string {
    // First check if it's in selectors map
    if (this.selectors[target]) {
      const resolved = this.selectors[target];
      if (resolved === "Need to provide locator as locator not observed") {
        this.logger.warn(`Locator for target '${target}' is not observed yet; using target as fallback selector.`);
        return target;
      }
      return resolved;
    }
    // Otherwise treat it as a direct selector
    return target;
  }

  /**
   * Execute a MCP action call, retrying once with a healed selector on failure.
   */
  private async withHeal<T>(
    target: string,
    action: (selector: string) => Promise<T>
  ): Promise<T> {
    const selector = this.resolveSelector(target);
    try {
      return await action(selector);
    } catch (firstError) {
      if (!this.selfHeal || !this.locatorDiscovery) {
        throw firstError;
      }
      this.logger.warn(`[self-heal] Primary selector failed for "${target}", attempting heal...`, {
        selector,
        error: firstError instanceof Error ? firstError.message : String(firstError),
      });
      const healed = await this.locatorDiscovery.healLocator(target);
      if (!healed) {
        throw firstError;
      }
      // Update in-memory selector so subsequent steps also benefit
      this.selectors[target] = healed;
      this.logger.info(`[self-heal] Retrying "${target}" with healed selector`, { healed });
      return await action(healed);
    }
  }

  private extractBoolean(result: { content?: Array<{ text?: string }> }): boolean {
    const text = result.content?.[0]?.text?.trim().toLowerCase() || "";
    return text === "true" || text === "visible:true" || text === "exists:true";
  }

  private async waitForSelectorState(target: string, timeoutSeconds: number): Promise<void> {
    const deadline = Date.now() + timeoutSeconds * 1000;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        const exists = await this.withHeal(target, (sel) => this.client.elementExists(sel));
        if (this.extractBoolean(exists)) {
          return;
        }
      } catch (error) {
        lastError = error;
      }

      await this.client.waitFor(undefined, 1);
    }

    if (lastError instanceof Error) {
      throw new Error(`waitForSelector timed out for ${target}: ${lastError.message}`);
    }
    throw new Error(`waitForSelector timed out for ${target}`);
  }

  /**
   * Execute a single test step
   */
  async execute(step: TestStep): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Executing step: ${step.id}`, {
        action: step.action,
        target: step.target,
        metadata: step.metadata,
      });

      let result = "";

      switch (step.action) {
        case "navigate":
          await this.client.navigate(step.target);
          result = `Navigated to ${step.target}`;
          break;

        case "click":
          await this.withHeal(step.target, (sel) => this.client.click(sel, step.target));
          result = `Clicked on ${step.target}`;
          break;

        case "fill":
          if (!step.value) throw new Error("fill action requires a value");
          await this.withHeal(step.target, (sel) => this.client.fill(sel, step.value!, step.target));
          result = `Filled ${step.target} with "${step.value}"`;
          break;

        case "press":
          if (!step.value) throw new Error("press action requires a value");
          await this.client.pressKey(step.value);
          result = `Pressed key: ${step.value}`;
          break;

        case "wait":
          {
            const waitSeconds = step.time ?? (step.value ? Number(step.value) : Number(step.target));
            if (!Number.isFinite(waitSeconds) || waitSeconds < 0) {
              throw new Error("wait action requires a numeric time or value");
            }
            await this.client.waitFor(undefined, waitSeconds);
            result = `Waited ${waitSeconds} second(s)`;
          }
          break;

        case "waitForSelector":
          {
            const timeoutSeconds = step.time ?? 30;
            await this.waitForSelectorState(step.target, timeoutSeconds);
            result = `Waited for selector: ${step.target}`;
          }
          break;

        case "select":
          // Select dropdown option using MCP select tool (more reliable than clicking option text).
          if (!step.value) throw new Error("select action requires a value");
          try {
            await this.withHeal(step.target, (sel) => this.client.selectOption(sel, [step.value!]));
          } catch (error) {
            this.logger.warn("selectOption failed, falling back to click path", {
              target: step.target,
              option: step.value,
              error: error instanceof Error ? error.message : String(error),
            });
            await this.withHeal(step.target, (sel) => this.client.click(sel, step.target));
            await this.client.waitFor(undefined, 1);
            const optionFallback = `text="${step.value}"`;
            await this.client.click(optionFallback, step.value);
          }

          result = `Selected ${step.value} in ${step.target}`;
          break;

        case "reload_window":
          await this.client.reload();
          result = "Page reloaded";
          break;

        case "quit":
          await this.client.close();
          result = "Browser closed";
          break;

        case "get_value":
          {
            const valueResult = await this.withHeal(step.target, (sel) => this.client.getValue(sel));
            const valueText = valueResult.content?.[0]?.text || "";
            result = `Value for ${step.target}: ${valueText}`;
          }
          break;

        case "clear_text":
          await this.withHeal(step.target, (sel) => this.client.clearText(sel));
          result = `Cleared text on ${step.target}`;
          break;

        case "assert_value":
          if (!step.value) throw new Error("assert_value action requires a value");
          {
            const valueResult = await this.withHeal(step.target, (sel) => this.client.getValue(sel));
            const actual = valueResult.content?.[0]?.text || "";
            if (actual !== step.value) {
              throw new Error(`Assertion failed: expected ${step.value}, got ${actual}`);
            }
            result = `Assertion passed: ${step.target} == ${step.value}`;
          }
          break;

        case "is_element_visible":
          {
            const vis = await this.withHeal(step.target, (sel) => this.client.isVisible(sel));
            result = `Visible:${vis.content?.[0]?.text}`;
          }
          break;

        case "element_exists":
          {
            const exists = await this.withHeal(step.target, (sel) => this.client.elementExists(sel));
            result = `Exists:${exists.content?.[0]?.text}`;
          }
          break;

        case "scroll_page":
          {
            const count = step.value ? Number(step.value) : 1;
            // If target is provided, resolve and use it; otherwise just scroll page
            if (step.target && step.target.trim()) {
              await this.withHeal(step.target, (sel) => this.client.scroll(count));
            } else {
              await this.client.scroll(count);
            }
            result = `Scrolled ${count} page(s)`;
          }
          break;

        case "focus_then_downarrow":
          await this.withHeal(step.target, (sel) => this.client.focusThenDownarrow(sel));
          result = `Focused and ArrowDown on ${step.target}`;
          break;

        case "send_downarrow_then_tab":
          await this.withHeal(step.target, (sel) => this.client.sendDownarrowThenTab(sel));
          result = `Focused, ArrowDown + Tab on ${step.target}`;
          break;

        case "select_dropdown_by_index":
          {
            const idx = Number(step.value);
            if (Number.isNaN(idx)) throw new Error("select_dropdown_by_index requires numeric value");
            await this.withHeal(step.target, (sel) => this.client.selectByIndex(sel, idx));
            result = `Selected index ${idx} for ${step.target}`;
          }
          break;

        case "mat_select_by_value":
          if (!step.value) throw new Error("mat_select_by_value requires a value");
          await this.withHeal(step.target, (sel) => this.client.selectOption(sel, [step.value!]));
          result = `Mat select ${step.value} on ${step.target}`;
          break;

        case "mat_scroll_to_value":
          if (!step.value) throw new Error("mat_scroll_to_value requires a value");
          await this.withHeal(step.target, (sel) => this.client.selectOption(sel, [step.value!]));
          result = `Mat scroll to ${step.value} on ${step.target}`;
          break;

        case "click_n_switch_tab":
          await this.withHeal(step.target, (sel) => this.client.click(sel, step.target));
          await this.client.waitForNewTab(undefined, 10);
          await this.client.switchTab(step.value ? Number(step.value) : -1); // optional index
          result = `Clicked ${step.target} and switched tab`;
          break;

        case "switch_to_tab":
          if (step.value === undefined) throw new Error("switch_to_tab requires value index");
          await this.client.switchTab(Number(step.value));
          result = `Switched to tab ${step.value}`;
          break;

        case "wait_for_new_tab":
          await this.client.waitForNewTab(step.value ? Number(step.value) : undefined, 10);
          result = "New tab detected";
          break;

        case "switch_to_latest_tab":
          {
            const allTabs = await this.client.getAllTabs();
            const tabs = JSON.parse(allTabs.content?.[0]?.text || "[]");
            if (!Array.isArray(tabs) || tabs.length === 0) {
              throw new Error("No tabs found for switch_to_latest_tab");
            }
            await this.client.switchTab(tabs.length - 1);
            result = "Switched to latest tab";
          }
          break;

        case "click_and_switch_to_new_tab":
          await this.client.click(this.resolveSelector(step.target), step.target);
          await this.client.waitForNewTab(undefined, 10);
          await this.client.switchToLatestTab();
          result = `Clicked ${step.target} and switched to newest tab`;
          break;

        case "get_all_tabs_info":
          {
            const tabs = await this.client.getAllTabs();
            result = `Tabs: ${tabs.content?.[0]?.text || "[]"}`;
          }
          break;

        case "waitFor":
          {
            const timeoutSeconds = step.time ?? 30;
            const numericTarget = Number(step.target);
            if (Number.isFinite(numericTarget) && step.target.trim() !== "") {
              await this.client.waitFor(undefined, numericTarget);
              result = `Waited ${numericTarget} second(s)`;
            } else {
              await this.client.waitFor(step.target, timeoutSeconds);
              result = `Waited for text: ${step.target}`;
            }
          }
          break;

        case "screenshot":
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const screenshotName = `screenshot-${step.id}-${timestamp}.png`;
          const screenshotPath = `${this.artifactDir}/${screenshotName}`;

          const screenshotResult = await this.client.screenshot(
            screenshotPath,
            false
          );
          result = `Screenshot saved to ${screenshotName}`;

          return {
            stepId: step.id,
            action: step.action,
            success: true,
            duration: Date.now() - startTime,
            result,
            screenshotPath: screenshotName,
          };

        case "assertText":
          const snapshot = await this.client.getSnapshot();
          const snapshotText = JSON.stringify(snapshot);
          const expectedText = step.assert || step.value;

          if (!snapshotText.includes(expectedText || "")) {
            throw new Error(
              `Assertion failed: expected text "${expectedText}" not found in page`
            );
          }
          result = `Assertion passed: found "${expectedText}"`;
          break;

        case "assertVisible":
          {
            // Resolve target to actual selector and check visibility using MCP tool
            const resolvedSelector = this.resolveSelector(step.target);
            const visibilityResult = await this.withHeal(step.target, (sel) => this.client.isVisible(sel));
            const isVisible = this.extractBoolean(visibilityResult);
            
            if (!isVisible) {
              throw new Error(
                `Assertion failed: element "${step.target}" not visible on page`
              );
            }
            result = `Assertion passed: element "${step.target}" is visible`;
          }
          break;

        default:
          throw new Error(`Unknown action: ${(step as any).action}`);
      }

      const duration = Date.now() - startTime;
      this.logger.success(`Step ${step.id} completed in ${duration}ms`, {
        result,
      });

      return {
        stepId: step.id,
        action: step.action,
        success: true,
        duration,
        result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Step ${step.id} failed after ${duration}ms`, {
        error: errorMessage,
      });

      return {
        stepId: step.id,
        action: step.action,
        success: false,
        duration,
        error: errorMessage,
      };
    }
  }

  /**
   * Update selector mapping while discovery is in progress
   */
  updateSelector(target: string, selector: string): void {
    this.selectors[target] = selector;
  }
}
