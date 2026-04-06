import { TestFlow, validateFlow } from "../schema/stepSchema";
import { PlaywrightMCPClient } from "./mcpClient";
import { StepExecutor, ExecutionResult } from "./executor";
import { Logger } from "../utils/logger";
import { applyDataTemplateToFlow, DataTemplateOptions } from "../data/template";

export interface ExecutionSummary {
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  totalDuration: number;
  results: ExecutionResult[];
  status: "PASSED" | "FAILED";
}

/**
 * Test Runner - Executes entire test flows
 */
export class TestRunner {
  private client: PlaywrightMCPClient;
  private executor: StepExecutor;
  private logger: Logger;
  private testData: Record<string, unknown>;
  private dataTemplateOptions: DataTemplateOptions;

  constructor(
    client: PlaywrightMCPClient,
    executor: StepExecutor,
    logger: Logger,
    testData: Record<string, unknown> = {},
    dataTemplateOptions: DataTemplateOptions = {}
  ) {
    this.client = client;
    this.executor = executor;
    this.logger = logger;
    this.testData = testData;
    this.dataTemplateOptions = dataTemplateOptions;
  }

  /**
   * Run a complete test flow
   */
  async run(flow: TestFlow): Promise<ExecutionSummary> {
    const startTime = Date.now();
    const results: ExecutionResult[] = [];
    const preparedFlow = applyDataTemplateToFlow(
      flow,
      this.testData,
      this.dataTemplateOptions
    );

    this.logger.info("Starting test execution", {
      totalSteps: preparedFlow.length,
      dataKeys: Object.keys(this.testData),
    });

    for (const step of preparedFlow) {
      const result = await this.executor.execute(step);
      results.push(result);

      // Optionally stop on first failure
      if (!result.success) {
        this.logger.warn("Step failed, but continuing with next step");
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedSteps = results.filter((r) => r.success).length;
    const failedSteps = results.filter((r) => !r.success).length;

    const summary: ExecutionSummary = {
      totalSteps: preparedFlow.length,
      passedSteps,
      failedSteps,
      totalDuration,
      results,
      status: failedSteps === 0 ? "PASSED" : "FAILED",
    };

    this.logSummary(summary);
    return summary;
  }

  /**
   * Run from JSON file content
   */
  async runFromJSON(jsonContent: unknown): Promise<ExecutionSummary> {
    try {
      const flow = validateFlow(jsonContent);
      return this.run(flow);
    } catch (error) {
      this.logger.error("Failed to validate test flow", {
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Log execution summary
   */
  private logSummary(summary: ExecutionSummary): void {
    this.logger.info("=== Test Execution Summary ===", {
      status: summary.status,
      totalSteps: summary.totalSteps,
      passed: summary.passedSteps,
      failed: summary.failedSteps,
      duration: `${summary.totalDuration}ms`,
    });

    if (summary.failedSteps > 0) {
      this.logger.warn("Failed steps:", {
        steps: summary.results
          .filter((r) => !r.success)
          .map((r) => ({
            stepId: r.stepId,
            action: r.action,
            error: r.error,
          })),
      });
    }

    this.logger.info("Step-by-step results:", {
      results: summary.results.map((r) => ({
        stepId: r.stepId,
        action: r.action,
        success: r.success,
        duration: `${r.duration}ms`,
        error: r.error,
      })),
    });
  }
}
