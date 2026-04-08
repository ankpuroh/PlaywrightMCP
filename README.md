# Playwright MCP Automation Framework

A sophisticated Node.js + TypeScript automation framework that executes AI-generated JSON test steps via the Playwright MCP (Model Context Protocol) server. This framework enables seamless integration of AI-driven test generation with browser automation.

## 🎯 Overview

This framework bridges the gap between AI-generated test specifications (JSON) and actual browser automation through the Playwright MCP interface. Instead of using native Playwright APIs, all browser interactions happen exclusively through MCP tool calls.

### Key Features

- **JSON-Based Test Steps**: Tests defined as JSON arrays for easy AI generation and human readability
- **MCP Integration**: Communicates with Playwright MCP server via stdio transport
- **Planner Upstream Workflow**: Optional `playwright-test-planner` agent for exploratory plan creation before JSON conversion
- **Type Safety**: Full TypeScript implementation with Zod schema validation
- **Selector Resolution**: Configurable element locators via `selectors.json`
- **Runtime Self-Heal**: On failure, captures cleaned DOM, generates XPath through LLM, validates uniqueness, retries once, and persists healed locator
- **Local LLM Option**: Supports local Ollama for offline self-healing
- **Parallel Suite Execution**: Run tagged suites with configurable workers
- **Rich Logging**: Comprehensive execution logs with structured output
- **Artifact Management**: Automatic screenshot and log collection
- **CLI Interface**: Simple yargs-based command-line tool
- **Step Executor**: Converts JSON actions to MCP tool calls sequentially

## 📦 Architecture

```
automation-framework/
├── src/
│   ├── schema/          # Zod validation schemas
│   │   └── stepSchema.ts
│   ├── executor/        # Core execution engine
│   │   ├── mcpClient.ts       (MCP server connection & tool calls)
│   │   ├── executor.ts        (Individual step execution)
│   │   ├── selfHealLLM.ts     (LLM provider integration for XPath healing)
│   │   └── runner.ts          (Complete flow execution)
│   ├── cli/             # CLI interface
│   │   └── index.ts
│   └── utils/           # Helper utilities
│       ├── logger.ts
│       └── file.ts
├── config/
│   ├── selectors.json   # Element locator mappings
│   └── env.json         # Environment configuration
├── tests/
│   └── sample.json      # Example test flow
├── artifacts/           # Generated (logs, screenshots)
└── package.json
```

## 🚀 Quick Start

### Agent Workflow (Recommended)

Use the repository agent pipeline for new scenarios:

1. `playwright-test-planner` creates a markdown test plan under `specs/`.
2. `Converter agent` converts the plan into framework JSON/data/locator/metadata artifacts.
3. `Executor` runs generated tests with `npm run run-test` or `npm run run-suite`.

### 1. Installation

```bash
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Run a Test

```bash
npm run run-test -- --file tests/sample.json
```

Or with custom options:

```bash
npm run run-test -- \
  --file tests/sample.json \
  --selectors config/selectors.json \
  --pom config/locators/pageObjects.json \
  --dataCommon config/TestData/common.json \
  --dataDomain config/TestData/domain.herokuapp.json \
  --data config/TestData/testdata.sample.json \
  --dataset alt-search \
  --output ./my-artifacts \
  --selfHeal true
```

The framework starts the bundled MCP server automatically with `node playwright-mcp-server.js`. Use `--mcp` only when you want to override that command.

### Self-Heal LLM Setup (Optional)

Self-heal calls an LLM only when an element action fails due to missing/invalid locator.

Provider priority:
1. `OPENAI_API_KEY` (OpenAI)
2. `OLLAMA_BASE_URL` or `OLLAMA_MODEL` (local Ollama)

Example local Ollama setup:

```bash
# Start Ollama service and pull model once
ollama serve
ollama pull llama3.1

# Optional env overrides
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set OLLAMA_MODEL=llama3.1
```

If no provider is configured, self-heal falls back to non-LLM heuristic discovery.

### Page Object Model + Parameterized Data

- `--pom` loads page object aliases (for example `SamplePage.searchInput`)
- Data is resolved using layered precedence:
  - scenario data: `--data`
  - domain data: `--dataDomain` (comma-separated files)
  - common data: `--dataCommon`
- Precedence order: `scenario > domain > common`
- `--dataset` applies structured dataset variants from data files with `defaults` + `datasets`
- `--strictData` (default true) fails the run when any placeholder is missing

### Email-Friendly Reporting

After every execution, the framework generates:

- `report-email.html` (standard email-ready HTML report)
- `report-email.txt` (plain text summary for email clients)

## 🏷️ Tagged Testcase Execution

Create a suite file (see `config/TestMetaData.json`) where each testcase has `tags` and optional data layer paths.

Run all testcases in suite:

```bash
npm run run-suite -- --suite config/TestMetaData.json
```

Run only selected tag group:

```bash
npm run run-suite -- --suite config/TestMetaData.json --tags smoke,login
```

Exclude tag group:

```bash
npm run run-suite -- --suite config/TestMetaData.json --excludeTags slow,flaky
```

Run a suite with shared data layers:

```bash
npm run run-suite -- \
  --suite config/TestMetaData.json \
  --dataCommon config/TestData/common.json \
  --dataDomain config/TestData/domain.guru99.json,config/TestData/domain.herokuapp.json \
  --dataset qa
```

Run a suite in parallel:

```bash
npm run run-suite -- --suite config/TestMetaData.json --workers 3
```

When `--workers` is greater than `1`, self-heal is disabled automatically to avoid concurrent writes to `config/selectors.json`.

Self-heal writes locator updates atomically (temp file + replace) to keep locator files consistent.

## 📋 JSON Test Schema

Each test flow is an array of steps following this schema:

```typescript
{
  id: string;                    // Unique step identifier
  action: string;                // Action type (see below)
  target: string;                // Element logical name or selector
  value?: string;                // Optional value for fill/press
  assert?: string;               // Expected value for assertions
  metadata?: {
    originalEnglish?: string;    // Original AI instruction
  };
}
```

### Supported Actions

The framework supports the full action set defined in `src/schema/stepSchema.ts`.

| Action | Description |
|--------|-------------|
| `navigate` | Navigate to URL |
| `click` | Click element |
| `fill` | Type text into field |
| `press` | Press keyboard key |
| `waitFor` | Wait for text/time |
| `assertText` | Verify text presence in snapshot |
| `assertVisible` | Verify element visibility via MCP visibility check |
| `screenshot` | Capture screen |
| `select` | Select dropdown option (with click fallback) |
| `waitForSelector` | Wait until an element exists |
| `wait` | Wait a fixed number of seconds |
| `reload_window` | Reload current page |
| `quit` | Close browser |
| `get_value` | Read input value |
| `clear_text` | Clear input field |
| `assert_value` | Assert input value |
| `is_element_visible` | Return visibility status |
| `element_exists` | Return existence status |
| `scroll_page` | Scroll page |
| `focus_then_downarrow` | Focus then press ArrowDown |
| `send_downarrow_then_tab` | Focus then ArrowDown and Tab |
| `select_dropdown_by_index` | Select option by index |
| `mat_select_by_value` | Material-style select by value |
| `mat_scroll_to_value` | Material-style scroll/select by value |
| `click_n_switch_tab` | Click and switch tab |
| `switch_to_tab` | Switch to tab index |
| `wait_for_new_tab` | Wait for new tab |
| `switch_to_latest_tab` | Switch to latest tab |
| `click_and_switch_to_new_tab` | Click and switch to newest tab |
| `get_all_tabs_info` | Return all tab info |

## 🔧 Configuration

### selectors.json

Maps logical element names to locator expressions (CSS/XPath):

```json
{
  "searchButton": "button[type='submit']",
  "searchInput": "input[type='search']",
  "loginButton": "button.login-btn",
  "usernameField": "input#username",
  "passwordField": "input#password"
}
```

Self-heal update support:
- JSON locator files (`.json`)
- Java properties-style files (`.properties`)
- TypeScript/JavaScript object locator files (`.ts`, `.js`)

### layered TestData files

The current framework resolves placeholders primarily from layered files under `config/TestData/`:

```json
{
  "defaults": {
    "baseUrl": "https://example.com"
  },
  "datasets": {
    "qa": {
      "baseUrl": "https://qa.example.com"
    }
  }
}
```

Use `--dataCommon`, `--dataDomain`, `--data`, and optional dataset flags to resolve placeholders at runtime.

## 📝 Example Test Flow

```json
[
  {
    "id": "step-1",
    "action": "navigate",
    "target": "https://example.com",
    "metadata": {
      "originalEnglish": "Navigate to the application"
    }
  },
  {
    "id": "step-2",
    "action": "click",
    "target": "loginButton",
    "metadata": {
      "originalEnglish": "Click on login button"
    }
  },
  {
    "id": "step-3",
    "action": "fill",
    "target": "usernameField",
    "value": "testuser@example.com",
    "metadata": {
      "originalEnglish": "Enter username"
    }
  },
  {
    "id": "step-4",
    "action": "fill",
    "target": "passwordField",
    "value": "SecurePassword123",
    "metadata": {
      "originalEnglish": "Enter password"
    }
  },
  {
    "id": "step-5",
    "action": "press",
    "value": "Enter",
    "metadata": {
      "originalEnglish": "Submit login form"
    }
  },
  {
    "id": "step-6",
    "action": "waitFor",
    "target": "Dashboard",
    "metadata": {
      "originalEnglish": "Wait for dashboard to load"
    }
  },
  {
    "id": "step-7",
    "action": "assertText",
    "assert": "Welcome back",
    "metadata": {
      "originalEnglish": "Verify login success"
    }
  },
  {
    "id": "step-8",
    "action": "screenshot",
    "target": "dashboard",
    "metadata": {
      "originalEnglish": "Capture dashboard screenshot"
    }
  }
]
```

## 🔌 MCP Integration Details

### MCP Tool Mapping

The framework maps JSON actions to Playwright MCP tools:

| JSON Action | MCP Tool | Tool Arguments |
|-------------|----------|-----------------|
| navigate | `mcp_microsoft_pla_browser_navigate` | `{ url }` |
| click | `mcp_microsoft_pla_browser_click` | `{ ref, element }` |
| fill | `mcp_microsoft_pla_browser_type` | `{ ref, text, element }` |
| press | `mcp_microsoft_pla_browser_press_key` | `{ key }` |
| waitFor | `mcp_microsoft_pla_browser_wait_for` | `{ text?, time? }` |
| screenshot | `mcp_microsoft_pla_browser_take_screenshot` | `{ type, fullPage?, filename? }` |
| assertText | `mcp_microsoft_pla_browser_snapshot` | `{}` |
| assertVisible | `mcp_microsoft_pla_browser_is_visible` | `{ ref }` |

Internal self-heal tools:

| Tool | Purpose |
|------|---------|
| `mcp_microsoft_pla_browser_get_dom` | Returns cleaned DOM (scripts/styles/inline handlers removed) |
| `mcp_microsoft_pla_browser_validate_xpath` | Returns XPath match count for uniqueness validation |

### MCPClient Methods

```typescript
// Connection
await client.connect();
await client.disconnect();

// Navigation & Interaction
await client.navigate(url);
await client.click(ref, element);
await client.fill(ref, text, element);
await client.pressKey(key);

// Assertions & Capture
await client.waitFor(text?, time?);
await client.screenshot(filename?, fullPage?);
await client.getSnapshot();

// Server Management
await client.listTools();        // List available tools
await client.close();             // Close browser
```

## 📊 Execution Flow

```
┌─────────────────────────────────────────────────────┐
│  1. Load & Validate JSON Test File                   │
│     (Zod schema validation)                          │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  2. Load Configuration                               │
│     (selectors.json, env.json)                       │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  3. Connect to Playwright MCP Server                 │
│     (stdio transport)                                │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  4. Execute Each Step Sequentially                   │
│     ┌──────────────────────────────────────────┐    │
│     │ Step N:                                  │    │
│     │ - Resolve selector from selectors.json   │    │
│     │ - Call appropriate MCP tool              │    │
│     │ - Log result & timing                    │    │
│     │ - Capture screenshots on error           │    │
│     └──────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│  5. Generate Summary & Artifacts                     │
│     (logs, screenshots, execution report)            │
└─────────────────────────────────────────────────────┘
```

## 📂 Artifacts Generated

After each test run, the framework creates:

```
artifacts/{execution-id}/
├── execution.log              # Detailed step-by-step logs
├── screenshot-step-*.png      # Screenshots for each step
└── summary.json               # Execution summary (if implemented)
```

## 🛠️ CLI Commands

### run-json
Execute a test flow from a JSON file.

**Usage:**
```bash
npm run run-test -- --file <path> [options]
```

**Options:**
- `--file, -f` (required): Path to JSON test file
- `--selectors, -s`: Path to selectors.json (default: `./config/selectors.json`)
- `--pom, -p`: Path to pageObjects.json (default: `./config/locators/pageObjects.json`)
- `--data, -d`: Scenario-level data file path
- `--dataCommon`: Common/base data file path
- `--dataDomain`: Comma-separated domain data file paths
- `--dataset`: Dataset key for structured data files
- `--datasetCommon`: Dataset key override for common layer
- `--datasetDomain`: Dataset key override for domain layer(s)
- `--strictData`: Fail on missing placeholders (default: `true`)
- `--selfHeal`: Runtime locator self-heal (default: `true`)
- `--output, -o`: Output directory for artifacts/logs
- `--mcp, -m`: MCP server command (default: `node playwright-mcp-server.js`)
- `--help, -h`: Show help
- `--version, -v`: Show version

**Examples:**
```bash
# Run with defaults
npm run run-test -- --file tests/sample.json

# Custom output directory
npm run run-test -- --file tests/login.json --output ./test-results

# Custom selectors
npm run run-test -- --file tests/sample.json --selectors ./custom-selectors.json

# Custom MCP command
npm run run-test -- --file tests/sample.json --mcp "node server.js"
```

## 🔍 Logging

The framework provides detailed logging at multiple levels:

- **INFO**: General information about execution flow
- **SUCCESS**: Successful step completion
- **ERROR**: Step failures and exceptions
- **WARN**: Non-critical issues
- **DEBUG**: Detailed debugging information

All logs are:
- Printed to console with colors
- Saved to `execution.log` in artifacts directory
- Structured with timestamps and metadata

## 🧪 Step Executor Details

The `StepExecutor` class handles individual step execution:

1. **Selector Resolution**: Looks up logical names in `selectors.json`, or uses raw selector if not found
2. **Action Mapping**: Routes to appropriate MCP tool call
3. **Error Handling**: Captures exceptions with context
4. **Screenshot Capture**: Saves screenshots with step IDs and timestamps
5. **Assertions**: Uses snapshot-based text checks and selector-based visibility checks

## 📈 Error Handling

The framework gracefully handles errors:

- **Validation Errors**: Caught during schema validation with detailed messages
- **Connection Errors**: Detailed logging of MCP server connection issues
- **Execution Errors**: Each step failure is logged without stopping subsequent steps
- **File Errors**: Clear messages for missing or malformed files

## 🔐 Best Practices

1. **Unique Step IDs**: Use descriptive, unique identifiers for each step
2. **Selector Management**: Keep selectors.json organized and up-to-date
3. **Metadata**: Include original English instructions for debugging
4. **Assertions**: Use assertions to verify expected behavior
5. **Screenshots**: Take strategic screenshots for visual verification
6. **Error Recovery**: Plan test flows to handle expected failures

## 🐛 Troubleshooting

### MCP Server Not Connecting
```
✗ Error: Failed to connect to MCP server
Solution: By default, the CLI starts `node playwright-mcp-server.js` automatically. If you override `--mcp`, verify that custom command is valid.
```

### Selector Not Found
```
✗ Error: Element not found
Solution: Check selectors.json mapping or verify element exists on page
```

### Invalid JSON
```
✗ Error: ZodError: Invalid step schema
Solution: Validate JSON structure against TestStepSchema
```

### No Artifacts Generated
```
Solution: Ensure output directory path is valid and writable
```

## 📚 Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev -- run-json --file tests/sample.json
```

### Clean Build Artifacts
```bash
npm run clean
```

## 🔑 Key Technologies

- **TypeScript**: Type-safe implementation
- **@modelcontextprotocol/sdk**: MCP client library
- **Zod**: Runtime schema validation
- **yargs**: CLI argument parsing
- **chalk**: Colored console output
- **fs-extra**: Enhanced file operations
- **nanoid**: Unique ID generation

## 📄 License

MIT

## 🤝 Integration with GitHub Copilot

This framework is designed to work with AI-generated JSON test steps from GitHub Copilot:

1. **Generate Steps**: Use Copilot to generate JSON test steps from natural language
2. **Validate**: Framework validates against strict schema
3. **Execute**: Framework executes via Playwright MCP
4. **Review**: Logs and screenshots provide audit trail

Example Copilot prompt:
```
Generate a JSON test flow for logging in to an application.
Use the following action types: navigate, fill, click, press, waitFor, assertText, screenshot
For selectors, use these logical names: usernameField, passwordField, submitButton
```

## 🚀 Next Steps

1. Install dependencies: `npm install`
2. Build TypeScript: `npm run build`
3. Run sample test: `npm run run-test -- --file tests/sample.json`
4. Create your own test JSON files
5. Integrate with CI/CD pipeline

---

**Ready to automate with AI-generated test steps!** 🎯
