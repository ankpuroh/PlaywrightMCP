import { z } from "zod";

export const SuiteTestCaseSchema = z.object({
  id: z.string().describe("Unique testcase id"),
  file: z.string().describe("Path to testcase JSON file"),
  tags: z.array(z.string()).default([]).describe("Tags used for selective execution"),
  data: z.string().optional().describe("Optional scenario-level data file path"),
  dataCommon: z.string().optional().describe("Optional common/base data file path override"),
  dataDomain: z
    .string()
    .optional()
    .describe("Optional comma-separated domain/feature data file paths"),
  dataset: z.string().optional().describe("Optional dataset key for structured data files"),
  datasetCommon: z.string().optional().describe("Dataset key for the common data layer"),
  datasetDomain: z.string().optional().describe("Dataset key for the domain data layer(s)"),
});

export const TestSuiteSchema = z.object({
  name: z.string().optional(),
  dataset: z.string().optional().describe("Default dataset key applied to all testcases unless overridden"),
  datasetCommon: z.string().optional().describe("Suite-wide default dataset key for common layer"),
  datasetDomain: z.string().optional().describe("Suite-wide default dataset key for domain layer"),
  testcases: z.array(SuiteTestCaseSchema),
});

export type SuiteTestCase = z.infer<typeof SuiteTestCaseSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;

export function validateSuite(input: unknown): TestSuite {
  return TestSuiteSchema.parse(input);
}
