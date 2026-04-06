import { TestFlow, TestStep } from "../schema/stepSchema";

export interface DataTemplateOptions {
  strictMissing?: boolean;
}

interface InterpolateResult {
  value: string;
  missingKeys: string[];
}

function resolveDataPath(data: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) =>
      acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
    data);
}

function interpolateValue(input: string, data: Record<string, unknown>): InterpolateResult {
  const missingKeys: string[] = [];

  const value = input.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key: string) => {
    const value = resolveDataPath(data, key);
    if (value === undefined || value === null) {
      missingKeys.push(key);
      return "";
    }
    return String(value);
  });

  return { value, missingKeys };
}

export function applyDataTemplateToStep(
  step: TestStep,
  data: Record<string, unknown>,
  options: DataTemplateOptions = {}
): TestStep {
  const next: TestStep = { ...step };
  const missingKeys = new Set<string>();

  const targetResult = interpolateValue(step.target, data);
  next.target = targetResult.value;
  targetResult.missingKeys.forEach((k) => missingKeys.add(k));

  if (step.value !== undefined) {
    const valueResult = interpolateValue(step.value, data);
    next.value = valueResult.value;
    valueResult.missingKeys.forEach((k) => missingKeys.add(k));
  }
  if (step.assert !== undefined) {
    const assertResult = interpolateValue(step.assert, data);
    next.assert = assertResult.value;
    assertResult.missingKeys.forEach((k) => missingKeys.add(k));
  }

  if (step.metadata?.originalEnglish) {
    const englishResult = interpolateValue(step.metadata.originalEnglish, data);
    next.metadata = {
      ...step.metadata,
      originalEnglish: englishResult.value,
    };
    englishResult.missingKeys.forEach((k) => missingKeys.add(k));
  }

  if (options.strictMissing && missingKeys.size > 0) {
    throw new Error(
      `Missing data placeholders for step '${step.id}': ${Array.from(missingKeys).join(", ")}`
    );
  }

  return next;
}

export function applyDataTemplateToFlow(
  flow: TestFlow,
  data: Record<string, unknown>,
  options: DataTemplateOptions = {}
): TestFlow {
  return flow.map((step) => applyDataTemplateToStep(step, data, options));
}
