import express, { Request, Response } from "express";
import fs from "fs-extra";
import path from "path";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type DataFileResponse = {
  name: string;
  relativePath: string;
  content: JsonValue;
};

type PageObjectModel = Record<string, Record<string, string>>;

const app = express();
const port = Number(process.env.GUI_PORT || 4317);
const projectRoot = path.resolve(__dirname, "../..");
const uiRoot = path.join(projectRoot, "ui", "editor");
const metadataPath = path.join(projectRoot, "config", "TestMetaData.json");
const dataDirectory = path.join(projectRoot, "config", "TestData");
const pageObjectsPath = path.join(projectRoot, "config", "locators", "pageObjects.json");

app.use(express.json({ limit: "2mb" }));

function assertJsonObject(value: unknown, label: string): asserts value is Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
}

function assertPageObjectModel(value: unknown): asserts value is PageObjectModel {
  assertJsonObject(value, "Page objects");

  for (const [pageName, pageValue] of Object.entries(value)) {
    if (!pageValue || typeof pageValue !== "object" || Array.isArray(pageValue)) {
      throw new Error(`Page '${pageName}' must be an object of element-to-locator entries`);
    }

    for (const [elementName, locator] of Object.entries(pageValue)) {
      if (typeof locator !== "string") {
        throw new Error(`Locator '${pageName}.${elementName}' must be a string`);
      }
    }
  }
}

function resolveDataPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  const absolutePath = path.resolve(projectRoot, normalized);
  const allowedRoot = `${path.resolve(dataDirectory)}${path.sep}`;

  if (!absolutePath.startsWith(allowedRoot) && absolutePath !== path.resolve(dataDirectory)) {
    throw new Error("Data file path must stay within config/TestData");
  }

  return absolutePath;
}

async function writePrettyJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

async function loadDataFiles(): Promise<DataFileResponse[]> {
  const entries = await fs.readdir(dataDirectory);
  const jsonFiles = entries.filter((entry) => entry.toLowerCase().endsWith(".json")).sort();

  const results: DataFileResponse[] = [];
  for (const fileName of jsonFiles) {
    const absolutePath = path.join(dataDirectory, fileName);
    const content = await fs.readJSON(absolutePath);
    results.push({
      name: fileName,
      relativePath: path.relative(projectRoot, absolutePath).replace(/\\/g, "/"),
      content,
    });
  }

  return results;
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/api/test-metadata", async (_req: Request, res: Response) => {
  try {
    const content = await fs.readJSON(metadataPath);
    res.json({
      relativePath: path.relative(projectRoot, metadataPath).replace(/\\/g, "/"),
      content,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to load TestMetaData.json: ${String(error)}` });
  }
});

app.put("/api/test-metadata", async (req: Request, res: Response) => {
  try {
    assertJsonObject(req.body, "Test metadata");
    await writePrettyJson(metadataPath, req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/data-files", async (_req: Request, res: Response) => {
  try {
    res.json({ files: await loadDataFiles() });
  } catch (error) {
    res.status(500).json({ error: `Failed to load data files: ${String(error)}` });
  }
});

app.put("/api/data-files", async (req: Request, res: Response) => {
  try {
    const { relativePath, content } = req.body as {
      relativePath?: string;
      content?: unknown;
    };

    if (!relativePath || typeof relativePath !== "string") {
      throw new Error("relativePath is required");
    }

    assertJsonObject(content, "Data file content");
    const absolutePath = resolveDataPath(relativePath);
    await writePrettyJson(absolutePath, content);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.get("/api/page-objects", async (_req: Request, res: Response) => {
  try {
    const content = await fs.readJSON(pageObjectsPath);
    res.json({
      relativePath: path.relative(projectRoot, pageObjectsPath).replace(/\\/g, "/"),
      content,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to load pageObjects.json: ${String(error)}` });
  }
});

app.put("/api/page-objects", async (req: Request, res: Response) => {
  try {
    assertPageObjectModel(req.body);
    await writePrettyJson(pageObjectsPath, req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

app.use(express.static(uiRoot));

app.get(/.*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(uiRoot, "index.html"));
});

app.listen(port, () => {
  console.log(`Framework editor available at http://localhost:${port}`);
});