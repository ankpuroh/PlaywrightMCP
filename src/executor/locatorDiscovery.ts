import { PlaywrightMCPClient } from "./mcpClient";
import { Logger } from "../utils/logger";
import { loadTestFile, loadSelectors } from "../utils/file";
import { StepExecutor } from "./executor";
import fs from "fs-extra";
import path from "path";
import { TestFlow } from "../schema/stepSchema";
import { generateXPathWithLLM } from "./selfHealLLM";

export const LOCATOR_NOT_OBSERVED_MESSAGE = "Need to provide locator as locator not observed";

export interface DiscoveredLocators {
  [key: string]: string;
}

/**
 * Locator Discovery - Discovers locators using Playwright Snapshot and updates selectors.json
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

  /**
   * Get page snapshot and analyze it for element locators
   */
  async getPageSnapshot(): Promise<any> {
    try {
      this.logger.info("Getting page snapshot for locator discovery");
      const result = await this.client.callTool(
        "mcp_microsoft_pla_browser_snapshot",
        {}
      );

      const snapshotText = result.content[0]?.text;
      if (!snapshotText) {
        throw new Error("No snapshot content received");
      }

      // Check if the response is an error message
      if (
        snapshotText.includes("Error:") ||
        result.isError ||
        !snapshotText.startsWith("{")
      ) {
        this.logger.warn("Snapshot returned an error, using fallback discovery", {
          error: snapshotText,
        });
        return null; // Return null to indicate error
      }

      return JSON.parse(snapshotText);
    } catch (error) {
      this.logger.warn("Failed to get page snapshot, using fallback discovery", {
        error: String(error),
      });
      return null; // Return null to use fallback
    }
  }

  /**
   * Discover locators using fallback strategy when snapshot is not available
   */
  private discoverLocatorsWithFallback(
    targetNames: string[]
  ): DiscoveredLocators {
    const discovered: DiscoveredLocators = {};

    this.logger.info(
      "Using fallback locator discovery based on naming patterns",
      {
        targetNames,
      }
    );

    for (const target of targetNames) {
      const locator = this.inferLocatorFromName(target);
      if (locator) {
        discovered[target] = locator;
        this.logger.info(`Inferred locator for "${target}"`, {
          locator,
        });
      } else {
        discovered[target] = LOCATOR_NOT_OBSERVED_MESSAGE;
        this.logger.warn(`Locator not observed for "${target}"`, {
          fallback: LOCATOR_NOT_OBSERVED_MESSAGE,
        });
      }
    }

    return discovered;
  }

  /**
   * Infer locator from target name using common patterns
   */
  private inferLocatorFromName(targetName: string): string | null {
    const normalized = targetName
      .toLowerCase()
      .replace(/field|input|element|container/i, "")
      .trim();

    // Check for role-based patterns
    if (normalized.includes("button")) {
      return 'button[type="submit"]';
    }
    if (normalized.includes("search") && normalized.includes("input")) {
      return 'input[type="search"]';
    }
    if (normalized.includes("search")) {
      return 'button[type="submit"]';
    }
    if (
      normalized.includes("username") ||
      normalized.includes("email")
    ) {
      return 'input[type="text"]';
    }
    if (normalized.includes("password")) {
      return 'input[type="password"]';
    }
    if (normalized.includes("form")) {
      return 'form';
    }
    if (normalized.includes("page") || normalized.includes("home")) {
      return "body"; // Page/homepage usually refers to body
    }

    return null;
  }

  /**
   * Discover locators by analyzing page structure and common patterns
   */
  private async discoverLocatorsFromSnapshot(
    snapshot: any,
    targetNames: string[]
  ): Promise<DiscoveredLocators> {
    const discovered: DiscoveredLocators = {};

    this.logger.info("Analyzing page snapshot for target elements", {
      targetNames,
    });

    const snapshotText = JSON.stringify(snapshot, null, 2);

    // Try to find elements by common patterns based on target name
    for (const target of targetNames) {
      const locator = this.findLocatorByName(target, snapshotText, snapshot);
      if (locator) {
        discovered[target] = locator;
        this.logger.info(`Discovered locator for "${target}"`, {
          locator,
        });
      } else {
        this.logger.warn(`Could not automatically discover locator for "${target}"`);
      }
    }

    return discovered;
  }

  /**
   * Find locator using common naming patterns and attributes
   */
  private findLocatorByName(
    targetName: string,
    snapshotText: string,
    snapshot: any
  ): string | null {
    // Normalize target name
    const normalizedName = targetName
      .toLowerCase()
      .replace(/button\s*for\s*/i, "")
      .replace(/field/i, "")
      .replace(/link/i, "")
      .replace(/input/i, "")
      .replace(/element/i, "")
      .replace(/container/i, "")
      .trim();

    // Display text candidate from logical name
    const displayText = normalizedName
      .replace(/[_-]+/g, " ")
      .replace(/\b(please\s*)?(click\s*)?\b/gi, "")
      .trim();

    // Try various selector patterns
    const patterns = [
      // Highest priority: stable test attributes
      (name: string) => `[data-testid="${name}"]`,
      (name: string) => `[data-testid*="${name}"]`,
      // Accessible name / aria
      (name: string) => `[aria-label="${displayText || name}"]`,
      (name: string) => `[aria-label*="${displayText || name}"]`,
      // Role-based selectors
      (name: string) =>
        `[role="${name.replace(/button$/i, "button")}"]`,
      // ID-based selectors
      (name: string) => `#${name}`,
      (name: string) => `[id*="${name}"]`,
      // Class-based selectors
      (name: string) => `.${name}`,
      (name: string) => `[class*="${name}"]`,
      // Name attribute
      (name: string) => `[name="${name}"]`,
      (name: string) => `[name*="${name}"]`,
      // Placeholder text
      (name: string) => displayText ? `[placeholder*="${displayText}"]` : null,
      // Type-based selectors for inputs
      (name: string) =>
        name.includes("search")
          ? 'input[type="search"]'
          : name.includes("password")
            ? 'input[type="password"]'
            : name.includes("input")
              ? 'input[type="text"]'
              : null,
      // Button type selectors
      (name: string) =>
        name.includes("button") ? 'button[type="submit"]' : null,
      // Text-based selectors for human-friendly names (Playwright selectors)
      (name: string) => displayText ? `a:has-text("${displayText}")` : null,
      (name: string) => displayText ? `button:has-text("${displayText}")` : null,
      (name: string) => displayText ? `text=${displayText}` : null,
      // XPath fallbacks
      (name: string) => displayText ? `//*[@name="${name}"]` : null,
      (name: string) => displayText ? `//*[@placeholder*="${displayText}"]` : null,
      (name: string) => displayText ? `//button[normalize-space()="${displayText}"]` : null,
      (name: string) => displayText ? `//a[normalize-space()="${displayText}"]` : null,
      (name: string) => displayText ? `//*[contains(text(),"${displayText}")]` : null,
    ];

    for (const pattern of patterns) {
      const selector = pattern(normalizedName);
      if (!selector) continue;

      // if pattern is text-specific, use softer match
      if (selector.startsWith("a:has-text") || selector.startsWith("button:has-text") || selector.startsWith("text=")) {
        if (displayText && snapshotText.toLowerCase().includes(displayText.toLowerCase())) {
          return selector;
        }
      } else if (snapshotText.toLowerCase().includes(selector.toLowerCase())) {
        return selector;
      }
    }

    // Fallback: return a sensible text-based locator when name is found in snapshot text
    if (displayText && snapshotText.toLowerCase().includes(displayText.toLowerCase())) {
      if (targetName.toLowerCase().includes("link")) {
        return `a:has-text("${displayText}")`;
      }
      if (targetName.toLowerCase().includes("button")) {
        return `button:has-text("${displayText}")`;
      }
      return `text=${displayText}`;
    }

    // Fallback: return a sensible default based on target name
    if (normalizedName.includes("search")) {
      return 'input[type="search"]';
    }
    if (normalizedName.includes("button")) {
      return 'button[type="submit"]';
    }
    if (normalizedName.includes("input") || normalizedName.includes("field")) {
      return 'input[type="text"]';
    }

    return null;
  }

  /**
   * Self-heal: given a logical target name that previously failed, take a fresh
   * DOM snapshot and return the best candidate selector, then persist it.
   * Returns the healed selector string, or null if healing failed.
   */
  async healLocator(
    target: string,
    selectorsPath: string = this.selectorsPath
  ): Promise<string | null> {
    this.logger.info(`[self-heal] Attempting to heal locator for "${target}"`);

    // 1) Capture cleaned DOM only after a failure-triggered self-heal call.
    const dom = await this.client.getDOMContent();
    if (!dom) {
      this.logger.warn(`[self-heal] Empty DOM for "${target}", cannot heal`);
      return null;
    }

    // 2) Ask LLM for a stable XPath using target as natural-language description.
    const llmXPath = await generateXPathWithLLM(dom, target);

    if (llmXPath) {
      // 3) Validate XPath must resolve to exactly one element.
      const count = await this.client.validateXPath(llmXPath);
      if (count === 1) {
        this.logger.success(`[self-heal] LLM healed locator for "${target}"`, {
          healed: llmXPath,
        });
        await this.persistHealedLocator(target, llmXPath, selectorsPath);
        return llmXPath;
      }

      this.logger.warn(`[self-heal] Rejected LLM XPath for "${target}"`, {
        xpath: llmXPath,
        matchCount: count,
      });
    }

    // 4) Fallback heuristic using DOM text and/or snapshot, still validated.
    const snapshot = await this.getPageSnapshot();
    const snapshotText = snapshot ? JSON.stringify(snapshot, null, 2) : dom;
    const healed = this.findLocatorByName(target, snapshotText, snapshot);

    if (!healed) {
      this.logger.warn(`[self-heal] Could not find alternative locator for "${target}"`);
      return null;
    }

    const isXPath = healed.startsWith("/");
    if (isXPath) {
      const count = await this.client.validateXPath(healed);
      if (count !== 1) {
        this.logger.warn(`[self-heal] Rejected heuristic XPath for "${target}"`, {
          healed,
          matchCount: count,
        });
        return null;
      }
    }

    this.logger.success(`[self-heal] Healed locator for "${target}"`, { healed });
    await this.persistHealedLocator(target, healed, selectorsPath);
    return healed;
  }

  private async persistHealedLocator(
    target: string,
    selector: string,
    selectorsPath: string = this.selectorsPath
  ): Promise<void> {
    const absolutePath = path.resolve(selectorsPath);
    const ext = path.extname(absolutePath).toLowerCase();

    if (ext === ".json") {
      const existing = (await fs.pathExists(absolutePath))
        ? await fs.readJSON(absolutePath)
        : {};
      existing[target] = selector;
      const tmpPath = `${absolutePath}.tmp-${Date.now()}`;
      await fs.ensureDir(path.dirname(absolutePath));
      await fs.writeJSON(tmpPath, existing, { spaces: 2 });
      await fs.move(tmpPath, absolutePath, { overwrite: true });
      this.logger.info("[self-heal] Updated locator file", { file: absolutePath, target, selector });
      return;
    }

    if (ext === ".properties") {
      const content = (await fs.pathExists(absolutePath))
        ? await fs.readFile(absolutePath, "utf8")
        : "";
      const escapedKey = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const lineRegex = new RegExp(`^${escapedKey}\\s*=.*$`, "m");
      const replacement = `${target}=${selector}`;
      const updated = lineRegex.test(content)
        ? content.replace(lineRegex, replacement)
        : `${content}${content.endsWith("\n") || content.length === 0 ? "" : "\n"}${replacement}\n`;
      await this.atomicWriteTextFile(absolutePath, updated);
      this.logger.info("[self-heal] Updated locator file", { file: absolutePath, target, selector });
      return;
    }

    if (ext === ".ts" || ext === ".js") {
      const content = (await fs.pathExists(absolutePath))
        ? await fs.readFile(absolutePath, "utf8")
        : "";
      const escapedKey = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const keyRegex = new RegExp(`(["'])${escapedKey}\\1\\s*:\\s*(["'])(.*?)\\2`);

      let updated = content;
      if (keyRegex.test(content)) {
        updated = content.replace(keyRegex, `'${target}': '${selector.replace(/'/g, "\\'")}'`);
      } else {
        const objectCloseIndex = content.lastIndexOf("}");
        if (objectCloseIndex === -1) {
          throw new Error(`Could not safely update ${absolutePath}: no object literal found`);
        }
        const prefix = content.slice(0, objectCloseIndex).trimEnd();
        const suffix = content.slice(objectCloseIndex);
        const needsComma = prefix.endsWith("{") ? "" : ",";
        updated = `${prefix}${needsComma}\n  '${target}': '${selector.replace(/'/g, "\\'")}'\n${suffix}`;
      }

      await this.atomicWriteTextFile(absolutePath, updated);
      this.logger.info("[self-heal] Updated locator file", { file: absolutePath, target, selector });
      return;
    }

    throw new Error(`Unsupported locator file format for self-heal update: ${ext}`);
  }

  /**
   * Load current selectors from file
   */
  private async loadCurrentSelectors(): Promise<DiscoveredLocators> {
    try {
      const absolutePath = path.resolve(this.selectorsPath);
      if (!(await fs.pathExists(absolutePath))) {
        this.logger.warn("Selectors file does not exist, starting with empty map");
        return {};
      }
      return await fs.readJSON(absolutePath);
    } catch (error) {
      this.logger.warn("Could not load existing selectors", {
        error: String(error),
      });
      return {};
    }
  }

  /**
   * Save discovered locators to selectors.json
   */
  private async saveDiscoveredLocators(
    locators: DiscoveredLocators
  ): Promise<void> {
    try {
      const absolutePath = path.resolve(this.selectorsPath);
      await fs.ensureDir(path.dirname(absolutePath));
      const tmpPath = `${absolutePath}.tmp-${Date.now()}`;
      await fs.writeJSON(tmpPath, locators, { spaces: 2 });
      await fs.move(tmpPath, absolutePath, { overwrite: true });
      this.logger.success("Updated selectors.json with discovered locators", {
        locatorCount: Object.keys(locators).length,
      });
    } catch (error) {
      this.logger.error("Failed to save discovered locators", {
        error: String(error),
      });
      throw error;
    }
  }

  private async atomicWriteTextFile(filePath: string, content: string): Promise<void> {
    const tmpPath = `${filePath}.tmp-${Date.now()}`;
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(tmpPath, content, "utf8");
    await fs.move(tmpPath, filePath, { overwrite: true });
  }

  /**
   * Indicates if target is a logical name rather than a raw selector
   */
  private isLogicalTarget(target: string): boolean {
    if (!target || target.trim().length === 0) return false;
    const selectorChars = ["[", "]", ".", "#", ":", ">", "<", "=", " ", "(", ")"];
    return !selectorChars.some((ch) => target.includes(ch));
  }

  /**
   * Extract target names from an array of steps
   */
  private extractTargetNamesFromSteps(steps: any[]): string[] {
    const targets = new Set<string>();

    for (const step of steps) {
      // Only include targets that are not URLs
      if (step.action !== "navigate" && step.target && this.isLogicalTarget(step.target)) {
        targets.add(step.target);
      }
    }

    return Array.from(targets);
  }

  /**
   * Discover locators from test flow
   */
  async discoverFromFlow(flow: TestFlow): Promise<DiscoveredLocators> {
    const targetNames = this.extractTargetNamesFromSteps(flow);

    if (targetNames.length === 0) {
      this.logger.warn("No logical target names found in test flow");
      return {};
    }

    this.logger.info("Extracted target names from test flow", {
      targets: targetNames,
    });

    // Get page snapshot
    const snapshot = await this.getPageSnapshot();

    let discovered: DiscoveredLocators;

    if (snapshot) {
      // Use snapshot-based discovery
      discovered = await this.discoverLocatorsFromSnapshot(
        snapshot,
        targetNames
      );
    } else {
      // Use fallback discovery based on naming patterns
      discovered = this.discoverLocatorsWithFallback(targetNames);
    }

    // Load existing selectors and merge (only update missing or fallback ones)
    const existing = await this.loadCurrentSelectors();
    const merged = { ...existing };

    for (const [target, locator] of Object.entries(discovered)) {
      if (!merged[target] || merged[target] === LOCATOR_NOT_OBSERVED_MESSAGE) {
        merged[target] = locator;
      }
    }

    // Save updated selectors
    await this.saveDiscoveredLocators(merged);

    return merged;
  }

  /**
   * Run interactive locator discovery procedure step-by-step across the entire flow
   */
  async runDiscovery(testFlowPath: string): Promise<void> {
    try {
      this.logger.info("Starting locator discovery process");

      // Load test flow
      const flow = await loadTestFile<TestFlow>(testFlowPath);

      if (!flow || flow.length === 0) {
        throw new Error("Test flow is empty");
      }

      // Load existing selectors
      const existingSelectors = await this.loadCurrentSelectors();
      const selectors: DiscoveredLocators = { ...existingSelectors };

      // Create executor with current selectors for action execution
      const stepExecutor = new StepExecutor(this.client, this.logger, selectors, ".");

      let totalDiscovered = 0;

      for (let i = 0; i < flow.length; i++) {
        const step = flow[i];
        this.logger.info(`Executing step ${i + 1}/${flow.length}`, {
          id: step.id,
          action: step.action,
          target: step.target,
        });

        // Pre-discover selector for the step target if it is logical and unresolved
        if (step.target && this.isLogicalTarget(step.target) && (!selectors[step.target] || selectors[step.target] === LOCATOR_NOT_OBSERVED_MESSAGE)) {
          const preSnapshot = await this.getPageSnapshot();
          if (preSnapshot) {
            const preSnapshotText = JSON.stringify(preSnapshot, null, 2);
            const inferred = this.findLocatorByName(step.target, preSnapshotText, preSnapshot);
            if (inferred) {
              selectors[step.target] = inferred;
              stepExecutor.updateSelector(step.target, inferred);
              totalDiscovered++;
              this.logger.success("Pre-execution locator discovered", {
                target: step.target,
                selector: inferred,
                stepId: step.id,
              });
              await this.saveDiscoveredLocators({ ...existingSelectors, ...selectors });
            }
          }
        }

        // Execute the action
        const executionResult = await stepExecutor.execute(step);

        if (!executionResult.success) {
          this.logger.warn("Step failed, continuing after snapshot check", {
            stepId: step.id,
            error: executionResult.error,
          });
        }

        // Fetch DOM snapshot after every step
        const postSnapshot = await this.getPageSnapshot();
        const postSnapshotText = postSnapshot ? JSON.stringify(postSnapshot, null, 2) : null;

        if (!postSnapshot) {
          this.logger.warn("Snapshot unavailable after step", { step: step.id });
        }

        // Discover additional locators for the current step target (if unresolved) and upcoming steps
        const targetsToConsider = new Set<string>();
        if (step.target && this.isLogicalTarget(step.target) && (!selectors[step.target] || selectors[step.target] === LOCATOR_NOT_OBSERVED_MESSAGE)) {
          targetsToConsider.add(step.target);
        }

        const upcomingTargets = this.extractTargetNamesFromSteps(flow.slice(i + 1));
        for (const t of upcomingTargets) {
          if (!selectors[t] || selectors[t] === LOCATOR_NOT_OBSERVED_MESSAGE) {
            targetsToConsider.add(t);
          }
        }

        for (const target of targetsToConsider) {
          if (!target) continue;
          if (selectors[target] && selectors[target] !== LOCATOR_NOT_OBSERVED_MESSAGE) continue;

          let discoveredLocator = null;
          if (postSnapshotText) {
            discoveredLocator = this.findLocatorByName(target, postSnapshotText, postSnapshot);
          }

          if (discoveredLocator) {
            selectors[target] = discoveredLocator;
            stepExecutor.updateSelector(target, discoveredLocator);
            totalDiscovered++;
            this.logger.success("Post-execution locator discovered", {
              target,
              selector: discoveredLocator,
              stepId: step.id,
            });
          } else {
            selectors[target] = LOCATOR_NOT_OBSERVED_MESSAGE;
            this.logger.warn("Locator missing after step, marking as not observed", {
              target,
              fallback: LOCATOR_NOT_OBSERVED_MESSAGE,
              stepId: step.id,
            });
          }
          await this.saveDiscoveredLocators({ ...existingSelectors, ...selectors });
        }
      }

      // Final save of all selectors
      const finalSelectors = { ...existingSelectors, ...selectors };
      await this.saveDiscoveredLocators(finalSelectors);

      this.logger.success("Locator discovery completed for full test flow", {
        steps: flow.length,
        discovered: totalDiscovered,
      });
    } catch (error) {
      this.logger.error("Locator discovery failed", {
        error: String(error),
      });
      throw error;
    }
  }
}
