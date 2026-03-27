import { z } from "zod";

export const ActionTypes = z.enum([
  "navigate",
  "click",
  "fill",
  "press",
  "waitFor",
  "assertText",
  "assertVisible",
  "screenshot",
  "select",
  "waitForSelector",
  "wait"
]);

export type ActionType = z.infer<typeof ActionTypes>;

export const TestStepSchema = z.object({
  id: z.string().describe("Unique step identifier"),
  action: ActionTypes,
  target: z.string().describe("Logical name or element selector"),
  value: z.string().optional().describe("Value for fill/press actions"),
  time: z.number().optional().describe("Time in seconds for wait actions"),
  assert: z
    .string()
    .optional()
    .describe("Expected value for assertion actions"),
  metadata: z
    .object({
      originalEnglish: z.string().optional(),
    })
    .optional()
    .describe("Additional metadata from AI"),
});

export const TestFlowSchema = z.array(TestStepSchema);

export type TestStep = z.infer<typeof TestStepSchema>;
export type TestFlow = z.infer<typeof TestFlowSchema>;

/**
 * Validate a single step against the schema
 */
export function validateStep(step: unknown): TestStep {
  return TestStepSchema.parse(step);
}

/**
 * Validate an entire test flow
 */
export function validateFlow(flow: unknown): TestFlow {
  return TestFlowSchema.parse(flow);
}
