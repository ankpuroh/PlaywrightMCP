# Playwright MCP Automation Framework Handbook

## Overview

This framework executes JSON-based automation flows through the Playwright MCP server. It supports locator discovery, runtime self-heal for single-flow execution, layered test data, tagged suite execution, and bounded parallel suite runs.

## Table of Contents

1. [Setup and Installation](#setup-and-installation)
2. [Framework Architecture](#framework-architecture)
3. [Authoring Tests](#authoring-tests)
4. [JSON Step Format](#json-step-format)
5. [Layered Test Data](#layered-test-data)
6. [Locator Discovery](#locator-discovery)
7. [Running Tests](#running-tests)
8. [Viewing Reports and Artifacts](#viewing-reports-and-artifacts)
9. [Advanced Features](#advanced-features)
10. [Troubleshooting](#troubleshooting)

## Setup and Installation

### Prerequisites

- Node.js 18 or higher
- npm
- Git

### Installation

```bash
git clone <repository-url>
cd PlaywrightMCP2
npm install
npm run build
```

The framework starts the bundled MCP server by default with `node playwright-mcp-server.js`. Use `--mcp` only when you need to override that command.

### Repository Layout

```text
PlaywrightMCP2/
├── config/
│   ├── selectors.json
│   ├── TestData/
│   └── TestMetaData.json
├── src/
├── tests/
├── artifacts/
├── ui/editor/
└── playwright-mcp-server.js
```

## Framework Architecture

### Runtime Components

1. `src/cli/index.ts`
   Exposes `run-json`, `run-suite`, and `discover-locators`.

2. `src/executor/mcpClient.ts`
   Manages stdio transport to the Playwright MCP server and wraps browser tool calls.

3. `src/executor/executor.ts`
   Converts each JSON step into a concrete MCP action.

4. `src/executor/runner.ts`
   Applies data templating, executes the flow, and returns the execution summary.

5. `src/executor/locatorDiscovery.ts`
   Discovers selectors from page snapshots and supports runtime self-heal.

6. `src/data/resolver.ts` and `src/data/template.ts`
   Merge layered data sources and substitute `{{placeholders}}` before execution.

### GUI Scope

`npm run gui` starts the local editor server. The current GUI is for metadata and layered test-data management. It is not a test flow editor and it does not include an artifacts viewer.

## Authoring Tests

### JSON-first Authoring

The current framework is most reliable when tests are authored directly as JSON under `tests/`.

Recommended starting files:
- `tests/sample.json`
- `tests/seed.json`

### Plain-English Inputs

Plain-English files can still live under `tests/Test_English/`, but this repository does not expose a standalone conversion CLI. Conversion is typically handled through the repository's Converter agent workflow or by manual JSON authoring.

### Planner as Upstream Design Input

Use this pipeline when you need exploratory design before JSON authoring:

1. `playwright-test-planner` explores the site and saves a markdown plan in `specs/`.
2. `Converter agent` converts the plan into runnable framework artifacts (`tests/*.json`, layered `config/TestData/*`, locator/POM updates, and `config/TestMetaData.json`).
3. `Executor` runs the produced JSON via `run-test` or `run-suite`.

This keeps planning and execution concerns separate while preserving the framework's JSON-first runtime.

## JSON Step Format

Each test file is an array of steps.

```json
{
  "id": "step-1",
  "action": "click",
  "target": "LoginPage.submitButton",
  "value": "optional",
  "time": 10,
  "assert": "optional",
  "metadata": {
    "originalEnglish": "Click submit"
  }
}
```

### Supported Core Actions

| Action | Purpose |
|--------|---------|
| `navigate` | Navigate to a URL |
| `click` | Click an element |
| `fill` | Type into an element |
| `press` | Press a keyboard key |
| `wait` | Wait a fixed number of seconds |
| `waitFor` | Wait for text to appear, or wait fixed seconds if the target is numeric |
| `waitForSelector` | Poll until a selector or logical target exists |
| `select` | Select option(s) from dropdown |
| `screenshot` | Save a screenshot into the artifact directory |
| `assertText` | Assert text is present in the page snapshot |
| `assertVisible` | Assert a target is visible using selector-based visibility check |

Additional advanced actions are defined in `src/schema/stepSchema.ts`.

## Layered Test Data

The framework supports three data layers:

1. Common: `--dataCommon`
2. Domain/feature: `--dataDomain`
3. Scenario: `--data`

Precedence is `scenario > domain > common`.

Example structured file:

```json
{
  "defaults": {
    "baseUrl": "https://example.com",
    "username": "user1"
  },
  "datasets": {
    "qa": {
      "baseUrl": "https://qa.example.com"
    },
    "staging": {
      "baseUrl": "https://staging.example.com"
    }
  }
}
```

Use `--dataset`, `--datasetCommon`, and `--datasetDomain` when selecting structured variants.

## Locator Discovery

Run locator discovery before the first execution of a new test or after major DOM changes:

```bash
npm run discover-locators -- --file tests/MyFlow.json
```

Optional combined run:

```bash
npm run discover-locators -- --file tests/MyFlow.json --run
```

What it does:

1. Loads the flow.
2. Executes it step by step.
3. Captures cleaned DOM and snapshots before/after steps.
4. For unresolved targets, tries LLM-generated XPath first and validates it resolves to exactly one element.
5. Falls back to heuristic snapshot analysis when LLM is unavailable or invalid.
6. Writes newly discovered selectors into `config/selectors.json`.

## Running Tests

### Single Flow

```bash
npm run run-test -- --file tests/MyFlow.json \
  --dataCommon config/TestData/common.json \
  --dataDomain config/TestData/domain.myapp.json \
  --data config/TestData/testdata.myflow.json \
  --selfHeal true
```

### Suite Execution

Suite files use the `testcases` property, not `tests`.

Example shape:

```json
{
  "name": "Sample Tagged Suite",
  "testcases": [
    {
      "id": "my-feature",
      "file": "tests/MyFlow.json",
      "tags": ["smoke", "regression"]
    }
  ]
}
```

Run the suite:

```bash
npm run run-suite -- --suite config/TestMetaData.json
```

Run only one tag group:

```bash
npm run run-suite -- --suite config/TestMetaData.json --tags smoke
```

Run in parallel:

```bash
npm run run-suite -- --suite config/TestMetaData.json --workers 3
```

When `--workers` is greater than `1`, self-heal is disabled automatically to prevent concurrent updates to `config/selectors.json`.

## Viewing Reports and Artifacts

Each execution creates an artifact directory such as `artifacts/<execution-id>/`.

Typical outputs:

- `execution.log`
- `report-email.html`
- `report-email.txt`
- screenshot PNG files when screenshot steps are used

The current GUI does not provide an Artifacts tab, so inspect these files directly in the artifact folder.

## Advanced Features

### Self-Heal

Single-flow execution enables self-heal by default. When an element action fails, the framework executes this flow:
1. Capture cleaned DOM from current page (remove scripts/styles/inline handlers).
2. Send DOM + logical target description to configured LLM (only on failure).
3. Generate stable XPath with preference for `id`, `name`, `aria-label`, `role`, and visible text.
4. Validate XPath resolves to exactly one element.
5. Retry original action using healed XPath.
6. If retry succeeds, persist locator atomically and log self-heal event.
7. If retry fails, throw original action error.

LLM provider priority:
- `OPENAI_API_KEY`
- local Ollama (`OLLAMA_BASE_URL` / `OLLAMA_MODEL`)

If no provider is configured, heuristic healing is used as fallback.

The same provider configuration is used by locator discovery for LLM-first discovery with heuristic fallback.

### Parallel Suite Runs

Parallelism is controlled by `--workers`. Each testcase gets its own MCP client process and artifact subdirectory.

### Custom MCP Command

Override the default server command when needed:

```bash
npm run run-test -- --file tests/sample.json --mcp "node custom-mcp-server.js"
```

## Troubleshooting

### Missing Placeholder Data

If execution fails with a missing placeholder message, supply the required keys through layered `config/TestData/*.json` files or the scenario file passed with `--data`.

### Element Not Found

1. Run `discover-locators` again.
2. Check `config/selectors.json`.
3. Add an explicit `wait`, `waitFor`, or `waitForSelector` step before the interaction.

### Parallel Run Caveat

If you need selector healing, keep `--workers 1`. Parallel runs trade healing for file-write safety.

### Logs and Reports

Use `artifacts/<runId>/execution.log` for the detailed step trace and `artifacts/<runId>/report-email.html` for the summary report.

## Quick Start

1. Install and build: `npm install && npm run build`
2. Create or copy a JSON flow under `tests/`
3. Resolve data placeholders with `config/TestData/*.json`
4. Run locator discovery: `npm run discover-locators -- --file tests/MyFlow.json`
5. Execute the flow: `npm run run-test -- --file tests/MyFlow.json ...`
6. Review `artifacts/<runId>/`

This handbook reflects the current codebase behavior as of April 2026.
