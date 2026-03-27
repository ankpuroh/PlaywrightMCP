# Playwright MCP Automation Framework

A sophisticated Node.js + TypeScript automation framework that executes AI-generated JSON test steps via the Playwright MCP (Model Context Protocol) server. This framework enables seamless integration of AI-driven test generation with browser automation.

## 🎯 Overview

This framework bridges the gap between AI-generated test specifications (JSON) and actual browser automation through the Playwright MCP interface. Instead of using native Playwright APIs, all browser interactions happen exclusively through MCP tool calls.

### Key Features

- **JSON-Based Test Steps**: Tests defined as JSON arrays for easy AI generation and human readability
- **MCP Integration**: Communicates with Playwright MCP server via stdio transport
- **Type Safety**: Full TypeScript implementation with Zod schema validation
- **Selector Resolution**: Configurable element locators via `selectors.json`
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

### 1. Installation

```bash
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Start Playwright MCP Server

In a separate terminal:

```bash
# Ensure Playwright MCP server is running
# This should be started before running tests
playwright-mcp
```

### 4. Run a Test

```bash
npm run run-test -- --file tests/sample.json
```

Or with custom options:

```bash
npm run run-test -- \
  --file tests/sample.json \
  --selectors config/selectors.json \
  --output ./my-artifacts \
  --mcp playwright-mcp
```

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

| Action | Description | Example |
|--------|-------------|---------|
| `navigate` | Navigate to URL | `{ "action": "navigate", "target": "https://example.com" }` |
| `click` | Click element | `{ "action": "click", "target": "submitButton" }` |
| `fill` | Type text into field | `{ "action": "fill", "target": "usernameField", "value": "admin" }` |
| `press` | Press keyboard key | `{ "action": "press", "value": "Enter" }` |
| `waitFor` | Wait for text/time | `{ "action": "waitFor", "target": "Loading complete" }` |
| `screenshot` | Capture screen | `{ "action": "screenshot", "target": "page" }` |
| `assertText` | Verify text presence | `{ "action": "assertText", "assert": "Success" }` |
| `assertVisible` | Verify element visible | `{ "action": "assertVisible", "target": "welcomeMessage" }` |

## 🔧 Configuration

### selectors.json

Maps logical element names to CSS selectors:

```json
{
  "searchButton": "button[type='submit']",
  "searchInput": "input[type='search']",
  "loginButton": "button.login-btn",
  "usernameField": "input#username",
  "passwordField": "input#password"
}
```

### env.json

Environment-specific settings:

```json
{
  "baseUrl": "https://example.com",
  "timeout": "30000",
  "headless": "true",
  "screenshotOnFailure": "true"
}
```

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
| assertVisible | `mcp_microsoft_pla_browser_snapshot` | `{}` |

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
- `--output, -o`: Output directory for artifacts/logs
- `--mcp, -m`: MCP server command (default: `playwright-mcp`)
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
5. **Assertions**: Validates page state via snapshot analysis

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
Solution: Ensure playwright-mcp is running in a separate terminal
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
3. Start Playwright MCP server
4. Run sample test: `npm run run-test -- --file tests/sample.json`
5. Create your own test JSON files
6. Integrate with CI/CD pipeline

---

**Ready to automate with AI-generated test steps!** 🎯
