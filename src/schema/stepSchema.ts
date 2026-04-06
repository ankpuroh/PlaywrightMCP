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
  "wait",
  "reload_window",
  "quit",
  "get_value",
  "clear_text",
  "assert_value",
  "is_element_visible",
  "element_exists",
  "scroll_page",
  "focus_then_downarrow",
  "send_downarrow_then_tab",
  "select_dropdown_by_index",
  "mat_select_by_value",
  "mat_scroll_to_value",
  "click_n_switch_tab",
  "switch_to_tab",
  "wait_for_new_tab",
  "switch_to_latest_tab",
  "click_and_switch_to_new_tab",
  "get_all_tabs_info"
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
