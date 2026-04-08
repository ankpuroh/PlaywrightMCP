# Playwright MCP Framework Execution Flow

This document outlines the detailed execution flow of the Playwright MCP automation framework, from the initial command to test completion. It includes file references and step-by-step explanations.

## Overview

The framework uses Model Context Protocol (MCP) to communicate between a Node.js client and a Playwright-based server for browser automation. Tests are defined as JSON files with steps, and the framework handles locator discovery, execution, and reporting.

## Execution Flow

### 1. Command Initiation (`package.json` and `src/cli/index.ts`)

- **User Command**: `npm run run-test -- --file tests/Hirolu3.json`
- **Package.json Script**: `"run-test": "ts-node src/cli/index.ts run-json"`
- **Entry Point**: `src/cli/index.ts`
  - Parses command-line arguments using `yargs`.
  - Extracts the test file path (e.g., `tests/Hirolu3.json`).
  - Calls the `runTest` function with the file path.

### 2. Test Loading and Validation (`src/cli/index.ts` and `src/schema/stepSchema.ts`)

- **File Loading**: Reads the JSON file using Node.js `fs` module.
- **Validation**: Parses and validates the test flow against `TestFlowSchema` from `src/schema/stepSchema.ts`.
  - Uses Zod for schema validation.
  - Ensures each step has required fields: `id`, `action`, `target`, etc.
  - Throws error if invalid.

### 3. MCP Client Connection (`src/executor/mcpClient.ts`)

- **Client Initialization**: Creates `PlaywrightMCPClient` instance.
- **Server Connection**: Calls `connect()` method.
  - Spawns the MCP server process: `node playwright-mcp-server.js`.
  - Establishes stdio transport using `@modelcontextprotocol/sdk`.
  - Logs successful connection.

### 4. Locator Discovery (Optional, `src/executor/locatorDiscovery.ts`)

- **Purpose**: Discovers missing selectors for logical targets.
- **Trigger**: If selectors are missing or marked as "Need to provide locator...".
- **Process**:
  - Loads `config/selectors.json`.
  - For each step in the test flow:
    - Navigates to pages and performs actions.
    - Captures cleaned DOM and page snapshots.
    - Tries LLM-generated XPath for unresolved targets and validates uniqueness.
    - Falls back to heuristic snapshot analysis when LLM is not configured/unusable.
    - Updates `selectors.json` with discovered locators.
  - Uses conservative updates: Only modifies missing/fallback selectors.
- **Key Methods**: `runDiscovery()`, `discoverLocator()`, `discoverLocatorWithLLM()`, `findLocatorByName()`.

### 5. Step Execution Loop (`src/executor/executor.ts`)

- **Executor Creation**: Instantiates `StepExecutor` with MCP client, logger, selectors, and artifact directory.
- **Loop Over Steps**:
  - For each step in the validated test flow:
    - Logs step start.
    - Resolves target selector using `resolveSelector()` (from `selectors.json` or direct).
    - Calls appropriate action handler based on `step.action`.
    - On selector failure, `withHeal()` triggers runtime self-heal.

### 6. Individual Step Execution (`src/executor/executor.ts` and `src/executor/mcpClient.ts`)

- **Action Handlers** (in `executor.ts`):
  - `navigate`: Calls `client.navigate(url)`.
  - `click`: Resolves selector, calls `client.click(selector, target)`.
  - `fill`: Resolves selector, calls `client.fill(selector, value, target)`.
  - `select`: Resolves selector, calls `client.selectOption(selector, [value])` with fallback.
  - `waitFor`: Calls `client.waitFor(text?, time?)`.
  - `screenshot`: Calls `client.screenshot(path, false)`.
  - `assertText`: Gets snapshot and checks text content.
  - `assertVisible`: Calls visibility tool using resolved selector and asserts boolean result.
- **MCP Client Methods** (`mcpClient.ts`):
  - Each method calls `callTool()` with specific MCP tool name and arguments.
  - Tools: `mcp_microsoft_pla_browser_navigate`, `click`, `type`, `select_option`, etc.
  - Self-heal helpers: `getDOMContent()` and `validateXPath()`.

### Runtime Self-Heal Path (`src/executor/executor.ts`, `src/executor/locatorDiscovery.ts`, `src/executor/selfHealLLM.ts`)

- Triggered only when an element action fails (`click`, `fill`, `select`, etc.).
- Captures cleaned DOM from MCP (`mcp_microsoft_pla_browser_get_dom`).
- Sends DOM + natural-language target description to configured LLM (OpenAI or Ollama local).
- Validates generated XPath with MCP (`mcp_microsoft_pla_browser_validate_xpath`) and accepts only exactly one match.
- Retries original action once with healed XPath.
- On retry success, persists healed locator atomically.
- On retry failure, throws the original action error.

### 7. MCP Server Processing (`playwright-mcp-server.js`)

- **Server Setup**: Uses `@modelcontextprotocol/sdk` for MCP server.
- **Tool Handlers**:
  - Receives tool calls via stdio.
  - For each tool (e.g., `mcp_microsoft_pla_browser_click`):
    - Ensures browser/page is initialized (`ensureBrowser()`).
    - Executes Playwright action: `page.click(ref)`.
    - Returns result or error.
- Additional self-heal tools:
  - `mcp_microsoft_pla_browser_get_dom` (clean DOM capture)
  - `mcp_microsoft_pla_browser_validate_xpath` (XPath uniqueness check)
- **Browser Management**: Launches Chromium, creates pages, handles snapshots.

### 8. Result Collection and Logging (`src/utils/logger.ts`)

- **Per-Step Results**: Each step returns `ExecutionResult` with success, duration, result/error.
- **Logging**: Uses `Logger` class for info, success, error messages.
- **Artifacts**: Screenshots saved to `artifacts/` directory.

### 9. Completion and Cleanup (`src/cli/index.ts` and `src/executor/mcpClient.ts`)

- **Test Completion**: After all steps, logs summary.
- **Client Disconnect**: Calls `client.disconnect()` to close MCP server.
- **Exit**: Process exits with success/failure code.

## Key Files and Responsibilities

- **`src/cli/index.ts`**: Command parsing, test loading, orchestration.
- **`src/schema/stepSchema.ts`**: Zod schemas for validation.
- **`src/executor/mcpClient.ts`**: MCP communication, tool calls.
- **`src/executor/executor.ts`**: Step execution logic, action handlers.
- **`src/executor/locatorDiscovery.ts`**: Locator discovery and selector updates.
- **`src/executor/selfHealLLM.ts`**: LLM provider integration for healing XPath generation.
- **`playwright-mcp-server.js`**: MCP server, Playwright browser control.
- **`config/selectors.json`**: Selector mappings.
- **`src/utils/logger.ts`**: Logging utilities.
- **`src/utils/file.ts`**: File operations for artifacts.

## Data Flow

1. JSON Test File → CLI → Validation → MCP Connect
2. Locator Discovery → Selector Updates → Step Loop
3. Step → Executor → MCP Client → MCP Server → Playwright → Browser
4. Results → Logging → Artifacts → Completion

This flow ensures reliable, automated browser testing with AI-assisted locator discovery.