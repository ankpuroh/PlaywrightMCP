import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import { nanoid } from "nanoid";
import chalk from "chalk";

import { loadTestFile, loadSelectors, ensureArtifactDir } from "../utils/file";
import { Logger } from "../utils/logger";
import { PlaywrightMCPClient } from "../executor/mcpClient";
import { StepExecutor } from "../executor/executor";
import { TestRunner } from "../executor/runner";
import { LocatorDiscovery } from "../executor/locatorDiscovery";
import { validateFlow } from "../schema/stepSchema";

/**
 * Discover locators from test flow
 */
async function discoverLocatorsCommand(argv: {
  file: string;
  selectors?: string;
  output?: string;
  mcp?: string;
  run?: boolean;
}): Promise<void> {
  const executionId = nanoid(8);
  const outputDir = argv.output || `./artifacts/${executionId}`;
  const selectorsPath = argv.selectors || "./config/selectors.json";
  const mcpCommand = argv.mcp || "node playwright-mcp-server.js";

  try {
    // Initialize artifact directory
    const artifactDir = await ensureArtifactDir(outputDir);
    console.log(chalk.cyan(`📁 Artifact directory: ${artifactDir}`));

    // Initialize logger
    const logger = new Logger(artifactDir);

    // Load test file
    console.log(chalk.cyan(`📄 Loading test file: ${argv.file}`));
    const testContent = await loadTestFile<unknown>(argv.file);
    validateFlow(testContent); // Validate early
    logger.info(`Test file loaded successfully from ${argv.file}`);

    // Initialize MCP client
    console.log(chalk.cyan(`🔌 Initializing Playwright MCP server...`));
    const client = new PlaywrightMCPClient(logger, mcpCommand);
    await client.connect();

    // List available tools
    const tools = await client.listTools();
    logger.info(`Available MCP tools: ${tools.length}`, {
      tools: tools.map((t) => t.name),
    });

    // Run locator discovery
    console.log(chalk.cyan(`🔍 Discovering locators from test file...`));
    const discovery = new LocatorDiscovery(client, logger, selectorsPath);
    await discovery.runDiscovery(argv.file);

    // Save logs
    await logger.saveLogs();

    console.log(chalk.bold("\n╔════════════════════════════════════════╗"));
    console.log(chalk.bold("║     LOCATOR DISCOVERY COMPLETED        ║"));
    console.log(chalk.bold("╚════════════════════════════════════════╝"));
    console.log(chalk.green(`✓ Selectors updated at: ${selectorsPath}`));
    console.log(chalk.cyan(`Artifacts: ${artifactDir}`));

    // Optionally run test after discovery
    if (argv.run) {
      console.log(chalk.cyan(`\n⚙️  Running test with discovered locators...`));

      // Load updated selectors
      const selectors = await loadSelectors(selectorsPath);
      logger.info(`Loaded ${Object.keys(selectors).length} selectors`);

      // Create executor and runner
      const executor = new StepExecutor(client, logger, selectors, artifactDir);
      const runner = new TestRunner(client, executor, logger);

      // Run test
      const summary = await runner.runFromJSON(testContent);

      // Print final results
      console.log(chalk.bold("\n╔════════════════════════════════════════╗"));
      console.log(chalk.bold("║     TEST EXECUTION COMPLETED           ║"));
      console.log(chalk.bold("╚════════════════════════════════════════╝"));
      console.log(
        chalk[summary.status === "PASSED" ? "green" : "red"](
          `Status: ${summary.status}`
        )
      );
      console.log(chalk.white(`Total Steps: ${summary.totalSteps}`));
      console.log(chalk.green(`Passed: ${summary.passedSteps}`));
      console.log(chalk.red(`Failed: ${summary.failedSteps}`));
      console.log(chalk.white(`Duration: ${summary.totalDuration}ms`));

      await logger.saveLogs();
      await client.disconnect();
      process.exit(summary.status === "PASSED" ? 0 : 1);
    } else {
      // Cleanup
      await client.disconnect();
      process.exit(0);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ Locator discovery failed: ${errorMessage}`));
    console.error(chalk.gray(error instanceof Error ? error.stack : ""));
    process.exit(1);
  }
}

/**
 * Run test from JSON file
 */
async function runTestCommand(argv: {
  file: string;
  selectors?: string;
  output?: string;
  mcp?: string;
}): Promise<void> {
  const executionId = nanoid(8);
  const outputDir = argv.output || `./artifacts/${executionId}`;
  const selectorsPath = argv.selectors || "./config/selectors.json";
  const mcpCommand = argv.mcp || "node playwright-mcp-server.js";

  try {
    // Initialize artifact directory
    const artifactDir = await ensureArtifactDir(outputDir);
    console.log(chalk.cyan(`📁 Artifact directory: ${artifactDir}`));

    // Initialize logger
    const logger = new Logger(artifactDir);

    // Load test file
    console.log(chalk.cyan(`📄 Loading test file: ${argv.file}`));
    const testContent = await loadTestFile<unknown>(argv.file);
    validateFlow(testContent); // Validate early
    logger.info(`Test file loaded successfully from ${argv.file}`);

    // Load selectors
    console.log(chalk.cyan(`🔍 Loading selectors from: ${selectorsPath}`));
    const selectors = await loadSelectors(selectorsPath);
    logger.info(`Loaded ${Object.keys(selectors).length} selectors`);

    // Initialize MCP client
    console.log(chalk.cyan(`🔌 Initializing Playwright MCP server...`));
    const client = new PlaywrightMCPClient(logger, mcpCommand);
    await client.connect();

    // List available tools
    const tools = await client.listTools();
    logger.info(`Available MCP tools: ${tools.length}`, {
      tools: tools.map((t) => t.name),
    });

    // Create executor and runner
    const executor = new StepExecutor(client, logger, selectors, artifactDir);
    const runner = new TestRunner(client, executor, logger);

    // Run test
    console.log(chalk.cyan(`⚙️  Executing test steps...`));
    const summary = await runner.runFromJSON(testContent);

    // Save logs
    await logger.saveLogs();

    // Print final results
    console.log(chalk.bold("\n╔════════════════════════════════════════╗"));
    console.log(chalk.bold("║     TEST EXECUTION COMPLETED           ║"));
    console.log(chalk.bold("╚════════════════════════════════════════╝"));
    console.log(
      chalk[summary.status === "PASSED" ? "green" : "red"](
        `Status: ${summary.status}`
      )
    );
    console.log(chalk.white(`Total Steps: ${summary.totalSteps}`));
    console.log(chalk.green(`Passed: ${summary.passedSteps}`));
    console.log(chalk.red(`Failed: ${summary.failedSteps}`));
    console.log(chalk.white(`Duration: ${summary.totalDuration}ms`));
    console.log(chalk.cyan(`Artifacts: ${artifactDir}`));

    // Cleanup
    await client.disconnect();

    process.exit(summary.status === "PASSED" ? 0 : 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ Test execution failed: ${errorMessage}`));
    console.error(chalk.gray(error instanceof Error ? error.stack : ""));
    process.exit(1);
  }
}

/**
 * CLI entry point
 */
export async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .command(
      "discover-locators",
      "Discover and update locators from a test flow",
      (yargs) => {
        return yargs
          .option("file", {
            alias: "f",
            describe: "Path to JSON test file",
            type: "string",
            demandOption: true,
          })
          .option("selectors", {
            alias: "s",
            describe: "Path to selectors.json config file",
            type: "string",
            default: "./config/selectors.json",
          })
          .option("output", {
            alias: "o",
            describe: "Output directory for artifacts and logs",
            type: "string",
          })
          .option("mcp", {
            alias: "m",
            describe: "MCP server command",
            type: "string",
            default: "node playwright-mcp-server.js",
          })
          .option("run", {
            alias: "r",
            describe: "Run test after discovering locators",
            type: "boolean",
            default: false,
          });
      },
      (argv) => discoverLocatorsCommand(argv as any)
    )
    .command(
      "run-json",
      "Execute a test flow from a JSON file",
      (yargs) => {
        return yargs
          .option("file", {
            alias: "f",
            describe: "Path to JSON test file",
            type: "string",
            demandOption: true,
          })
          .option("selectors", {
            alias: "s",
            describe: "Path to selectors.json config file",
            type: "string",
            default: "./config/selectors.json",
          })
          .option("output", {
            alias: "o",
            describe: "Output directory for artifacts and logs",
            type: "string",
          })
          .option("mcp", {
            alias: "m",
            describe: "MCP server command",
            type: "string",
            default: "node playwright-mcp-server.js",
          });
      },
      (argv) => runTestCommand(argv as any)
    )
    .alias("h", "help")
    .alias("v", "version")
    .strict()
    .parseAsync();
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
  });
}
