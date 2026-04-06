import fs from "fs-extra";
import path from "path";

export interface LayeredDataOptions {
  dataCommonPath?: string;
  dataDomainPaths?: string[];
  dataScenarioPath?: string;
  dataset?: string;
  datasetCommon?: string;
  datasetDomain?: string;
}

export interface LayeredDataResult {
  data: Record<string, unknown>;
  loadedSources: string[];
  dataset?: string;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base: JsonRecord, incoming: JsonRecord): JsonRecord {
  const result: JsonRecord = { ...base };

  for (const [key, incomingValue] of Object.entries(incoming)) {
    const baseValue = result[key];

    if (isRecord(baseValue) && isRecord(incomingValue)) {
      result[key] = deepMerge(baseValue, incomingValue);
    } else {
      result[key] = incomingValue;
    }
  }

  return result;
}

function normalizeDataFile(
  fileData: unknown,
  dataset?: string,
  sourcePath?: string
): JsonRecord {
  if (!isRecord(fileData)) {
    throw new Error(`Data file must be a JSON object${sourcePath ? `: ${sourcePath}` : ""}`);
  }

  const defaultsRaw = fileData.defaults;
  const datasetsRaw = fileData.datasets;
  const hasStructuredSections = defaultsRaw !== undefined || datasetsRaw !== undefined;

  if (!hasStructuredSections) {
    return fileData;
  }

  const defaults = isRecord(defaultsRaw) ? defaultsRaw : {};

  if (!dataset) {
    return defaults;
  }

  if (!isRecord(datasetsRaw)) {
    throw new Error(
      `Dataset '${dataset}' requested but no datasets section found${sourcePath ? ` in ${sourcePath}` : ""}`
    );
  }

  const datasetValue = datasetsRaw[dataset];
  if (!isRecord(datasetValue)) {
    throw new Error(
      `Dataset '${dataset}' not found${sourcePath ? ` in ${sourcePath}` : ""}`
    );
  }

  return deepMerge(defaults, datasetValue);
}

async function loadAndNormalizeDataFile(
  filePath: string,
  dataset?: string
): Promise<JsonRecord> {
  const absolutePath = path.resolve(filePath);
  const exists = await fs.pathExists(absolutePath);

  if (!exists) {
    throw new Error(`Data file not found at ${absolutePath}`);
  }

  const rawData = await fs.readJSON(absolutePath);
  return normalizeDataFile(rawData, dataset, absolutePath);
}

export async function resolveLayeredTestData(
  options: LayeredDataOptions
): Promise<LayeredDataResult> {
  let mergedData: JsonRecord = {};
  const loadedSources: string[] = [];

  const commonPath = options.dataCommonPath;
  const domainPaths = (options.dataDomainPaths || []).filter(Boolean);
  const scenarioPath = options.dataScenarioPath;

  if (commonPath) {
    const normalized = await loadAndNormalizeDataFile(commonPath, options.datasetCommon ?? options.dataset);
    mergedData = deepMerge(mergedData, normalized);
    loadedSources.push(path.resolve(commonPath));
  }

  for (const domainPath of domainPaths) {
    const normalized = await loadAndNormalizeDataFile(domainPath, options.datasetDomain ?? options.dataset);
    mergedData = deepMerge(mergedData, normalized);
    loadedSources.push(path.resolve(domainPath));
  }

  if (scenarioPath) {
    const normalized = await loadAndNormalizeDataFile(scenarioPath, options.dataset);
    mergedData = deepMerge(mergedData, normalized);
    loadedSources.push(path.resolve(scenarioPath));
  }

  return {
    data: mergedData,
    loadedSources,
    dataset: options.dataset,
  };
}
