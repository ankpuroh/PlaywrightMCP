import { TestStep } from "../schema/stepSchema";
import { PlaywrightMCPClient } from "./mcpClient";
import { Logger } from "../utils/logger";
import { saveArtifact } from "../utils/file";

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

  constructor(
    client: PlaywrightMCPClient,
    logger: Logger,
    selectors: Record<string, string>,
    artifactDir: string
  ) {
    this.client = client;
    this.logger = logger;
    this.selectors = selectors;
    this.artifactDir = artifactDir;
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
          const clickSelector = this.resolveSelector(step.target);
          await this.client.click(clickSelector, step.target);
          result = `Clicked on ${step.target}`;
          break;

        case "fill":
          const fillSelector = this.resolveSelector(step.target);
          if (!step.value) throw new Error("fill action requires a value");
          await this.client.fill(fillSelector, step.value, step.target);
          result = `Filled ${step.target} with "${step.value}"`;
          break;

        case "press":
          if (!step.value) throw new Error("press action requires a value");
          await this.client.pressKey(step.value);
          result = `Pressed key: ${step.value}`;
          break;

        case "waitFor":
          // Check if this is a time-based wait (target contains "wait" or "completion" or "load")
          if (step.target.toLowerCase().includes('wait') || 
              step.target.toLowerCase().includes('completion') || 
              step.target.toLowerCase().includes('load') ||
              step.target.toLowerCase().includes('update')) {
            await this.client.waitFor(undefined, 5); // Wait 5 seconds
            result = `Waited 5 seconds for: ${step.target}`;
          } else {
            await this.client.waitFor(step.target, 5000);
            result = `Waited for: ${step.target}`;
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
          const visibleSnapshot = await this.client.getSnapshot();
          const visibleSnapshotText = JSON.stringify(visibleSnapshot);
          const expectedElement = step.target;

          if (!visibleSnapshotText.includes(expectedElement)) {
            throw new Error(
              `Assertion failed: element "${expectedElement}" not visible on page`
            );
          }
          result = `Assertion passed: element "${expectedElement}" is visible`;
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
