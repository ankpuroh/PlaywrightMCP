import fs from "fs-extra";
import path from "path";

/**
 * Load JSON test file with validation
 */
export async function loadTestFile<T>(filePath: string): Promise<T> {
  try {
    const absolutePath = path.resolve(filePath);
    const fileContent = await fs.readFile(absolutePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to load test file ${filePath}: ${error}`);
  }
}

/**
 * Load selector configuration
 */
export async function loadSelectors(
  configPath: string = "./config/selectors.json"
): Promise<Record<string, string>> {
  try {
    const absolutePath = path.resolve(configPath);
    if (!(await fs.pathExists(absolutePath))) {
      console.warn(`Selectors file not found at ${absolutePath}, returning empty map`);
      return {};
    }
    return fs.readJSON(absolutePath);
  } catch (error) {
    throw new Error(`Failed to load selectors: ${error}`);
  }
}

/**
 * Load page object model configuration
 */
export async function loadPageObjects(
  configPath: string = "./config/locators/pageObjects.json"
): Promise<Record<string, Record<string, string>>> {
  try {
    const absolutePath = path.resolve(configPath);
    if (!(await fs.pathExists(absolutePath))) {
      console.warn(`POM config not found at ${absolutePath}, returning empty map`);
      return {};
    }
    return fs.readJSON(absolutePath);
  } catch (error) {
    throw new Error(`Failed to load page objects: ${error}`);
  }
}

/**
 * Load parameterized test data
 */
export async function loadTestData(
  dataPath?: string
): Promise<Record<string, unknown>> {
  try {
    if (!dataPath) {
      return {};
    }

    const absolutePath = path.resolve(dataPath);
    if (!(await fs.pathExists(absolutePath))) {
      throw new Error(`Test data file not found at ${absolutePath}`);
    }

    return fs.readJSON(absolutePath);
  } catch (error) {
    throw new Error(`Failed to load test data: ${error}`);
  }
}

/**
 * Load environment configuration
 */
export async function loadEnvConfig(
  configPath: string = "./config/env.json"
): Promise<Record<string, string>> {
  try {
    const absolutePath = path.resolve(configPath);
    if (!(await fs.pathExists(absolutePath))) {
      console.warn(`Env config not found at ${absolutePath}, returning empty map`);
      return {};
    }
    return fs.readJSON(absolutePath);
  } catch (error) {
    throw new Error(`Failed to load env config: ${error}`);
  }
}

/**
 * Ensure artifact directory exists
 */
export async function ensureArtifactDir(artifactDir: string): Promise<string> {
  const absolutePath = path.resolve(artifactDir);
  await fs.ensureDir(absolutePath);
  return absolutePath;
}

/**
 * Save artifact file (screenshot, etc.)
 */
export async function saveArtifact(
  artifactDir: string,
  fileName: string,
  content: string | Buffer
): Promise<string> {
  const filePath = path.join(artifactDir, fileName);
  await fs.ensureDir(artifactDir);
  await fs.writeFile(filePath, content);
  return filePath;
}
