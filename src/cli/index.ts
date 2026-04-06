import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import path from "path";
import { nanoid } from "nanoid";
import chalk from "chalk";

import {
  loadTestFile,
  loadSelectors,
  ensureArtifactDir,
  loadPageObjects,
} from "../utils/file";
import { Logger } from "../utils/logger";
import { PlaywrightMCPClient } from "../executor/mcpClient";
import { StepExecutor } from "../executor/executor";
import { TestRunner } from "../executor/runner";
import { LocatorDiscovery } from "../executor/locatorDiscovery";
import { validateFlow } from "../schema/stepSchema";
import { flattenPageObjectsToSelectors } from "../pom/pageObjectModel";
import { generateEmailReport } from "../reporting/emailReport";
import { validateSuite } from "../suite/suiteSchema";
import { resolveLayeredTestData } from "../data/resolver";

type ExecutionOptions = {
  file: string;
  selectorsPath: string;
  pomPath: string;
  dataCommonPath?: string;
  dataDomainPaths?: string[];
  dataPath?: string;
  dataset?: string;
  datasetCommon?: string;
  datasetDomain?: string;
  strictData: boolean;
  artifactDir: string;
  mcpCommand: string;
  selfHeal?: boolean;
};

function parseCsv(csv?: string): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function shouldRunByTags(
  testcaseTags: string[],
  includeTags: string[],
  excludeTags: string[]
): boolean {
  if (excludeTags.length > 0 && testcaseTags.some((tag) => excludeTags.includes(tag))) {
    return false;
  }

  if (includeTags.length === 0) {
    return true;
  }

  return testcaseTags.some((tag) => includeTags.includes(tag));
}

async function executeSingleFlow(options: ExecutionOptions): Promise<{
  status: "PASSED" | "FAILED";
  summary: { totalSteps: number; passedSteps: number; failedSteps: number; totalDuration: number };
}> {
  const logger = new Logger(options.artifactDir);

  const testContent = await loadTestFile<unknown>(options.file);
  validateFlow(testContent);

  const selectors = await loadSelectors(options.selectorsPath);
  const pom = await loadPageObjects(options.pomPath);
  const pomSelectors = flattenPageObjectsToSelectors(pom);
  const mergedSelectors = { ...pomSelectors, ...selectors };
  const layeredData = await resolveLayeredTestData({
    dataCommonPath: options.dataCommonPath,
    dataDomainPaths: options.dataDomainPaths,
    dataScenarioPath: options.dataPath,
    dataset: options.dataset,
    datasetCommon: options.datasetCommon,
    datasetDomain: options.datasetDomain,
  });

  logger.info("Resolved layered test data", {
    loadedSources: layeredData.loadedSources,
    dataset: layeredData.dataset,
    resolvedKeys: Object.keys(layeredData.data),
  });

  const client = new PlaywrightMCPClient(logger, options.mcpCommand);

  try {
    await client.connect();

    const tools = await client.listTools();
    logger.info(`Available MCP tools: ${tools.length}`, {
      tools: tools.map((t) => t.name),
    });

    const selfHeal = options.selfHeal !== false;
    const locatorDiscovery = selfHeal
      ? new LocatorDiscovery(client, logger, options.selectorsPath)
      : undefined;

    if (selfHeal) {
      logger.info("Self-heal mode enabled: stale locators will be automatically healed");
    }

    const executor = new StepExecutor(client, logger, mergedSelectors, options.artifactDir, {
      locatorDiscovery,
      selfHeal,
    });
    const runner = new TestRunner(client, executor, logger, layeredData.data, {
      strictMissing: options.strictData,
    });
    const summary = await runner.runFromJSON(testContent);
    await generateEmailReport(options.artifactDir, summary);

    return {
      status: summary.status,
      summary: {
        totalSteps: summary.totalSteps,
        passedSteps: summary.passedSteps,
        failedSteps: summary.failedSteps,
        totalDuration: summary.totalDuration,
      },
    };
  } finally {
    await client.disconnect();
    await logger.saveLogs();
  }
}

/**
 * Discover locators from test flow
 */
async function discoverLocatorsCommand(argv: {
  file: string;
  selectors?: string;
  pom?: string;
  dataCommon?: string;
  dataDomain?: string;
  data?: string;
  dataset?: string;
  datasetCommon?: string;
  datasetDomain?: string;
  strictData?: boolean;
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

      await client.disconnect();

      const { status, summary } = await executeSingleFlow({
        file: argv.file,
        selectorsPath,
        pomPath: argv.pom || "./config/locators/pageObjects.json",
        dataCommonPath: argv.dataCommon,
        dataDomainPaths: parseCsv(argv.dataDomain),
        dataPath: argv.data,
        dataset: argv.dataset,
        datasetCommon: argv.datasetCommon,
        datasetDomain: argv.datasetDomain,
        strictData: argv.strictData !== false,
        artifactDir,
        mcpCommand,
      });

      // Print final results
      console.log(chalk.bold("\n╔════════════════════════════════════════╗"));
      console.log(chalk.bold("║     TEST EXECUTION COMPLETED           ║"));
      console.log(chalk.bold("╚════════════════════════════════════════╝"));
      console.log(
        chalk[status === "PASSED" ? "green" : "red"](
          `Status: ${status}`
        )
      );
      console.log(chalk.white(`Total Steps: ${summary.totalSteps}`));
      console.log(chalk.green(`Passed: ${summary.passedSteps}`));
      console.log(chalk.red(`Failed: ${summary.failedSteps}`));
      console.log(chalk.white(`Duration: ${summary.totalDuration}ms`));
      console.log(chalk.cyan(`Email HTML Report: ${path.join(artifactDir, "report-email.html")}`));
      console.log(chalk.cyan(`Email Text Report: ${path.join(artifactDir, "report-email.txt")}`));

      await logger.saveLogs();
      process.exit(status === "PASSED" ? 0 : 1);
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
  pom?: string;
  dataCommon?: string;
  dataDomain?: string;
  data?: string;
  dataset?: string;
  datasetCommon?: string;
  datasetDomain?: string;
  strictData?: boolean;
  output?: string;
  mcp?: string;
  selfHeal?: boolean;
}): Promise<void> {
  const executionId = nanoid(8);
  const outputDir = argv.output || `./artifacts/${executionId}`;
  const selectorsPath = argv.selectors || "./config/selectors.json";
  const pomPath = argv.pom || "./config/locators/pageObjects.json";
  const mcpCommand = argv.mcp || "node playwright-mcp-server.js";

  try {
    // Initialize artifact directory
    const artifactDir = await ensureArtifactDir(outputDir);
    console.log(chalk.cyan(`📁 Artifact directory: ${artifactDir}`));

    console.log(chalk.cyan(`📄 Loading test file: ${argv.file}`));
    console.log(chalk.cyan(`🔍 Loading selectors from: ${selectorsPath}`));
    console.log(chalk.cyan(`🔌 Initializing Playwright MCP server...`));
    console.log(chalk.cyan(`⚙️  Executing test steps...`));
    const { status, summary } = await executeSingleFlow({
      file: argv.file,
      selectorsPath,
      pomPath,
      dataCommonPath: argv.dataCommon,
      dataDomainPaths: parseCsv(argv.dataDomain),
      dataPath: argv.data,
      dataset: argv.dataset,
      datasetCommon: argv.datasetCommon,
      datasetDomain: argv.datasetDomain,
      strictData: argv.strictData !== false,
      artifactDir,
      mcpCommand,
      selfHeal: argv.selfHeal !== false,
    });

    // Print final results
    console.log(chalk.bold("\n╔════════════════════════════════════════╗"));
    console.log(chalk.bold("║     TEST EXECUTION COMPLETED           ║"));
    console.log(chalk.bold("╚════════════════════════════════════════╝"));
    console.log(
      chalk[status === "PASSED" ? "green" : "red"](
        `Status: ${status}`
      )
    );
    console.log(chalk.white(`Total Steps: ${summary.totalSteps}`));
    console.log(chalk.green(`Passed: ${summary.passedSteps}`));
    console.log(chalk.red(`Failed: ${summary.failedSteps}`));
    console.log(chalk.white(`Duration: ${summary.totalDuration}ms`));
    console.log(chalk.cyan(`Artifacts: ${artifactDir}`));
    console.log(chalk.cyan(`Email HTML Report: ${path.join(artifactDir, "report-email.html")}`));
    console.log(chalk.cyan(`Email Text Report: ${path.join(artifactDir, "report-email.txt")}`));

    process.exit(status === "PASSED" ? 0 : 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ Test execution failed: ${errorMessage}`));
    console.error(chalk.gray(error instanceof Error ? error.stack : ""));
    process.exit(1);
  }
}

/**
 * Run a tagged suite of testcases
 */
async function runSuiteCommand(argv: {
  suite: string;
  selectors?: string;
  pom?: string;
  data?: string;
  dataCommon?: string;
  dataDomain?: string;
  dataset?: string;
  datasetCommon?: string;
  datasetDomain?: string;
  strictData?: boolean;
  output?: string;
  mcp?: string;
  tags?: string;
  excludeTags?: string;
  selfHeal?: boolean;
  workers?: number;
}): Promise<void> {
  const executionId = nanoid(8);
  const outputDir = argv.output || `./artifacts/${executionId}`;
  const selectorsPath = argv.selectors || "./config/selectors.json";
  const pomPath = argv.pom || "./config/locators/pageObjects.json";
  const mcpCommand = argv.mcp || "node playwright-mcp-server.js";
  const includeTags = parseCsv(argv.tags);
  const excludeTags = parseCsv(argv.excludeTags);
  const workerCount = Number.isFinite(argv.workers)
    ? Math.max(1, Math.floor(argv.workers as number))
    : 1;
  const suiteSelfHeal = workerCount > 1 ? false : argv.selfHeal !== false;

  try {
    const artifactDir = await ensureArtifactDir(outputDir);
    const suiteInput = await loadTestFile<unknown>(argv.suite);
    const suite = validateSuite(suiteInput);

    const selected = suite.testcases.filter((tc) =>
      shouldRunByTags(tc.tags || [], includeTags, excludeTags)
    );

    if (selected.length === 0) {
      console.log(chalk.yellow("No testcases matched the provided tag filters."));
      process.exit(1);
      return;
    }

    console.log(chalk.bold("\n╔════════════════════════════════════════╗"));
    console.log(chalk.bold("║        SUITE EXECUTION STARTED         ║"));
    console.log(chalk.bold("╚════════════════════════════════════════╝"));
    console.log(chalk.white(`Suite: ${suite.name || path.basename(argv.suite)}`));
    console.log(chalk.white(`Selected Testcases: ${selected.length}`));
    console.log(chalk.white(`Workers: ${workerCount}`));
    if (workerCount > 1 && argv.selfHeal !== false) {
      console.log(
        chalk.yellow(
          "Self-heal has been disabled for parallel suite execution to avoid concurrent selector file updates."
        )
      );
    }

    const testcaseResults: Array<"PASSED" | "FAILED"> = new Array(selected.length);
    let nextIndex = 0;

    const runWorker = async (workerId: number): Promise<void> => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= selected.length) {
          return;
        }

        const testcase = selected[currentIndex];
        const testcaseArtifactDir = await ensureArtifactDir(
          path.join(artifactDir, testcase.id)
        );

        console.log(chalk.cyan(`\n▶ [W${workerId}] Running testcase: ${testcase.id}`));

        try {
          const result = await executeSingleFlow({
            file: testcase.file,
            selectorsPath,
            pomPath,
            dataCommonPath: testcase.dataCommon || argv.dataCommon,
            dataDomainPaths: parseCsv(testcase.dataDomain || argv.dataDomain),
            dataPath: testcase.data || argv.data,
            dataset: testcase.dataset || suite.dataset || argv.dataset,
            datasetCommon: testcase.datasetCommon || suite.datasetCommon || argv.datasetCommon,
            datasetDomain: testcase.datasetDomain || suite.datasetDomain || argv.datasetDomain,
            strictData: argv.strictData !== false,
            artifactDir: testcaseArtifactDir,
            mcpCommand,
            selfHeal: suiteSelfHeal,
          });

          testcaseResults[currentIndex] = result.status;
          if (result.status === "PASSED") {
            console.log(chalk.green(`✓ [W${workerId}] ${testcase.id} PASSED`));
          } else {
            console.log(chalk.red(`✗ [W${workerId}] ${testcase.id} FAILED`));
          }
        } catch (error) {
          testcaseResults[currentIndex] = "FAILED";
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(chalk.red(`✗ [W${workerId}] ${testcase.id} FAILED: ${errorMessage}`));
        }
      }
    };

    const activeWorkers = Math.min(workerCount, selected.length);
    await Promise.all(
      Array.from({ length: activeWorkers }, (_, idx) => runWorker(idx + 1))
    );

    const passed = testcaseResults.filter((status) => status === "PASSED").length;
    const failed = selected.length - passed;

    console.log(chalk.bold("\n╔════════════════════════════════════════╗"));
    console.log(chalk.bold("║        SUITE EXECUTION SUMMARY         ║"));
    console.log(chalk.bold("╚════════════════════════════════════════╝"));
    console.log(chalk.white(`Total: ${selected.length}`));
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(chalk.cyan(`Suite Artifacts: ${artifactDir}`));

    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`✗ Suite execution failed: ${errorMessage}`));
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
          .option("pom", {
            alias: "p",
            describe: "Path to pageObjects.json config file",
            type: "string",
            default: "./config/locators/pageObjects.json",
          })
          .option("data", {
            alias: "d",
            describe: "Path to scenario-level test data JSON file",
            type: "string",
          })
          .option("dataCommon", {
            describe: "Path to common/base test data JSON file",
            type: "string",
          })
          .option("dataDomain", {
            describe: "Comma-separated domain/feature data JSON file paths",
            type: "string",
          })
          .option("dataset", {
            describe: "Dataset name to apply from structured data files",
            type: "string",
          })
          .option("datasetCommon", {
            describe: "Dataset key for the common data layer (overrides dataset for common)",
            type: "string",
          })
          .option("datasetDomain", {
            describe: "Dataset key for the domain data layer(s) (overrides dataset for domain)",
            type: "string",
          })
          .option("strictData", {
            describe: "Fail run if any placeholder is missing from resolved data",
            type: "boolean",
            default: true,
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
          .option("pom", {
            alias: "p",
            describe: "Path to pageObjects.json config file",
            type: "string",
            default: "./config/locators/pageObjects.json",
          })
          .option("data", {
            alias: "d",
            describe: "Path to scenario-level test data JSON file",
            type: "string",
          })
          .option("dataCommon", {
            describe: "Path to common/base test data JSON file",
            type: "string",
          })
          .option("dataDomain", {
            describe: "Comma-separated domain/feature data JSON file paths",
            type: "string",
          })
          .option("dataset", {
            describe: "Dataset name to apply from structured data files",
            type: "string",
          })
          .option("datasetCommon", {
            describe: "Dataset key for the common data layer (overrides dataset for common)",
            type: "string",
          })
          .option("datasetDomain", {
            describe: "Dataset key for the domain data layer(s) (overrides dataset for domain)",
            type: "string",
          })
          .option("strictData", {
            describe: "Fail run if any placeholder is missing from resolved data",
            type: "boolean",
            default: true,
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
          .option("selfHeal", {
            describe: "Automatically heal stale locators at runtime (default: true)",
            type: "boolean",
            default: true,
          });
      },
      (argv) => runTestCommand(argv as any)
    )
    .command(
      "run-suite",
      "Execute testcases from a suite file with optional tag filters",
      (yargs) => {
        return yargs
          .option("suite", {
            describe: "Path to suite JSON file",
            type: "string",
            demandOption: true,
          })
          .option("tags", {
            describe: "Comma-separated include tags (run testcase if any tag matches)",
            type: "string",
          })
          .option("excludeTags", {
            describe: "Comma-separated exclude tags",
            type: "string",
          })
          .option("selectors", {
            alias: "s",
            describe: "Path to selectors.json config file",
            type: "string",
            default: "./config/selectors.json",
          })
          .option("pom", {
            alias: "p",
            describe: "Path to pageObjects.json config file",
            type: "string",
            default: "./config/locators/pageObjects.json",
          })
          .option("data", {
            alias: "d",
            describe: "Fallback scenario-level test data file path (used if testcase entry has no data)",
            type: "string",
          })
          .option("dataCommon", {
            describe: "Path to common/base test data JSON file",
            type: "string",
          })
          .option("dataDomain", {
            describe: "Comma-separated domain/feature data JSON file paths",
            type: "string",
          })
          .option("dataset", {
            describe: "Dataset name to apply from structured data files",
            type: "string",
          })
          .option("datasetCommon", {
            describe: "Dataset key for the common data layer (overrides dataset for common)",
            type: "string",
          })
          .option("datasetDomain", {
            describe: "Dataset key for the domain data layer(s) (overrides dataset for domain)",
            type: "string",
          })
          .option("strictData", {
            describe: "Fail run if any placeholder is missing from resolved data",
            type: "boolean",
            default: true,
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
          .option("selfHeal", {
            describe: "Automatically heal stale locators at runtime (default: true)",
            type: "boolean",
            default: true,
          })
          .option("workers", {
            alias: "w",
            describe: "Number of testcases to execute in parallel",
            type: "number",
            default: 1,
          });
      },
      (argv) => runSuiteCommand(argv as any)
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
