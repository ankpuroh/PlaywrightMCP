import { PlaywrightMCPClient } from "./mcpClient";
import { Logger } from "../utils/logger";
import { loadTestFile } from "../utils/file";
import fs from "fs-extra";
import path from "path";
import { TestFlow } from "../schema/stepSchema";

export interface DiscoveredLocators {
  [key: string]: string;
}

/**
 * Corrected Locator Discovery with proper MCP tool names.
 * Fully functional multi-screen execution flow.
 */
export class LocatorDiscovery {
  private client: PlaywrightMCPClient;
  private logger: Logger;
  private selectorsPath: string;

  constructor(
    client: PlaywrightMCPClient,
    logger: Logger,
    selectorsPath: string = "config/selectors.json"
  ) {
    this.client = client;
    this.logger = logger;
    this.selectorsPath = selectorsPath;
  }

  /** Correct MCP tool name mappings (validated) */
  private ACTION_TO_TOOL = {
    navigate: "browser_navigate",
    click: "browser_click",
    fill: "browser_type",
    press: "browser_press_key",
    select: "browser_select_option",
    wait: "browser_wait_for",
    snapshot: "browser_snapshot",
  } as const;

  /** Take a snapshot */
  async getPageSnapshot(): Promise<any> {
    try {
      const result = await this.client.callTool(this.ACTION_TO_TOOL.snapshot, {});
      const snapshotText = result.content?.[0]?.text;
      if (!snapshotText?.trim().startsWith("{")) return null;
      return JSON.parse(snapshotText);
    } catch {
      return null;
    }
  }

  /** Fallback inference */
  private inferLocatorFromName(name: string): string {
    const n = name.toLowerCase();
    if (n.includes("password")) return 'input[type="password"]';
    if (n.includes("email") || n.includes("user")) return 'input[type="text"]';
    if (n.includes("button")) return 'button';
    if (n.includes("search")) return 'input[type="search"]';
    return `[id*="${n}"]`;
  }

  /** Snapshot-based discovery */
  private findInSnapshot(name: string, snapshotText: string): string | null {
    const n = name.toLowerCase();
    const patterns = [
      `[id*="${n}"]`,
      `[data-testid="${n}"]`,
      `[aria-label*="${n}"]`,
      `.${n}`,
    ];

    for (const sel of patterns) {
      if (snapshotText.includes(sel)) return sel;
    }

    return null;
  }

  /** Load selectors.json */
  private async loadSelectors(): Promise<DiscoveredLocators> {
    const p = path.resolve(this.selectorsPath);
    if (!(await fs.pathExists(p))) return {};
    return fs.readJSON(p);
  }

  /** Save selectors.json */
  private async saveSelectors(locators: DiscoveredLocators) {
    const p = path.resolve(this.selectorsPath);
    await fs.ensureDir(path.dirname(p));
    await fs.writeJSON(p, locators, { spaces: 2 });
  }

  /** Resolve a logical name to an actual selector */
  private async resolveSelector(
    target: string,
    snapshot: any,
    existing: DiscoveredLocators,
    discovered: DiscoveredLocators
  ): Promise<string> {
    // If it's already a CSS selector
    if (/[\[\].#>:]/.test(target)) return target;

    // If previously discovered
    if (existing[target]) return existing[target];
    if (discovered[target]) return discovered[target];

    // Try snapshot
    if (snapshot) {
      const snapSel = this.findInSnapshot(target, JSON.stringify(snapshot));
      if (snapSel) return snapSel;
    }

    // Fallback
    return this.inferLocatorFromName(target);
  }

  /** Execute the flow completely (multi-screen) */
  private async executeFlow(flow: TestFlow): Promise<DiscoveredLocators> {
    const existing = await this.loadSelectors();
    const discovered: DiscoveredLocators = { ...existing };

    for (const step of flow) {
      this.logger.info(`Executing: ${step.action} → ${step.target ?? ""}`);

      let snapshot = await this.getPageSnapshot();

      try {
        switch (step.action) {
          case "navigate":
            await this.client.callTool(this.ACTION_TO_TOOL.navigate, {
              url: step.target,
            });
            break;

          case "wait":
            await this.client.callTool(this.ACTION_TO_TOOL.wait, {
              time: step.time ?? 1,
            });
            break;

          case "click": {
            const sel = await this.resolveSelector(step.target!, snapshot, existing, discovered);
            await this.client.callTool(this.ACTION_TO_TOOL.click, { selector: sel });
            break;
          }

          case "fill": {
            const sel = await this.resolveSelector(step.target!, snapshot, existing, discovered);
            await this.client.callTool(this.ACTION_TO_TOOL.fill, {
              selector: sel,
              text: step.value ?? "",
            });
            break;
          }

          case "press": {
            const sel = await this.resolveSelector(step.target!, snapshot, existing, discovered);
            await this.client.callTool(this.ACTION_TO_TOOL.press, {
              selector: sel,
              key: step.value ?? "Enter",
            });
            break;
          }

          case "select": {
            const sel = await this.resolveSelector(step.target!, snapshot, existing, discovered);
            await this.client.callTool(this.ACTION_TO_TOOL.select, {
              selector: sel,
              value: step.value,
            });
            break;
          }

          default:
            this.logger.warn(`Unknown action: ${step.action}`);
        }
      } catch (err) {
        this.logger.error("Step execution failed", { step, error: String(err) });
      }

      // Snapshot AFTER action (next screen)
      snapshot = await this.getPageSnapshot();

      // Discover new locators on each screen
      for (const s of flow) {
        if (!s.target) continue;
        if (discovered[s.target]) continue;

        const snapSel = snapshot
          ? this.findInSnapshot(s.target, JSON.stringify(snapshot))
          : null;

        if (snapSel) {
          discovered[s.target] = snapSel;
          this.logger.info(`Discovered: ${s.target} = ${snapSel}`);
        }
      }

      // Save intermediate results
      await this.saveSelectors(discovered);
    }

    return discovered;
  }

  /** Entry point */
  async runDiscovery(testFlowPath: string) {
    this.logger.info("Starting multi-screen locator discovery...");

    const flow = await loadTestFile<TestFlow>(testFlowPath);

    const result = await this.executeFlow(flow);

    this.logger.success("Completed locator discovery", {
      count: Object.keys(result).length,
      locators: result,
    });
  }
}