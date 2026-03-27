# Playwright MCP Automation Framework Handbook

## Overview

The Playwright MCP Automation Framework is a powerful tool for converting plain English test descriptions into executable automated tests using Playwright and Model Context Protocol (MCP). The framework automatically discovers web element locators and executes tests through a standardized JSON-based step format.

## Table of Contents

1. [Setup and Installation](#setup-and-installation)
2. [Framework Architecture](#framework-architecture)
3. [Creating Test Cases in English](#creating-test-cases-in-english)
4. [Converting English to JSON Steps](#converting-english-to-json-steps)
5. [Locator Discovery](#locator-discovery)
6. [Running Tests](#running-tests)
7. [Viewing Reports and Artifacts](#viewing-reports-and-artifacts)
8. [Advanced Features](#advanced-features)
9. [Troubleshooting](#troubleshooting)

## Setup and Installation

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Latest version
- **Git**: For cloning the repository

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd PlaywrightMCP2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright MCP Server globally:**
   ```bash
   npm install -g @executeautomation/playwright-mcp-server
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

### Configuration

The framework uses several configuration files:

- **`config/selectors.json`**: Stores discovered element selectors
- **`config/env.json`**: Environment-specific configuration (optional)
- **`tests/`**: Directory for test case files

### Directory Structure

```
PlaywrightMCP2/
├── config/
│   ├── selectors.json    # Element selectors
│   └── env.json         # Environment config
├── src/
│   ├── cli/             # Command-line interface
│   ├── executor/        # Test execution engine
│   ├── schema/          # JSON schema validation
│   └── utils/           # Utility functions
├── tests/               # Test case files
├── artifacts/           # Execution artifacts and logs
├── package.json
└── playwright-mcp-server.js
```

## Framework Architecture

### Core Components

1. **CLI Interface** (`src/cli/index.ts`)
   - Command-line commands for test management
   - Supports `run-json`, `discover-locators` commands

2. **Test Executor** (`src/executor/`)
   - `executor.ts`: Main test execution logic
   - `mcpClient.ts`: MCP server communication
   - `locatorDiscovery.ts`: Automatic locator discovery

3. **Schema Validation** (`src/schema/stepSchema.ts`)
   - Zod-based validation for test steps
   - Ensures data integrity

4. **Utilities** (`src/utils/`)
   - File operations, logging, artifact management

### MCP Integration

The framework communicates with Playwright through the Model Context Protocol:
- Browser navigation and interaction
- Screenshot capture
- Element inspection and snapshot
- Keyboard and mouse events

## Creating Test Cases in English

### Test Case Format

Create test cases as plain text files with `.txt` extension in the `tests/Test_English/` directory. Each line represents one logical action.

### Supported Actions

- **Navigation**: "Open browser and navigate to https://example.com"
- **Input**: "Enter 'username' in username field"
- **Clicking**: "Click login button"
- **Waiting**: "Wait for dashboard to load"
- **Assertions**: "Verify welcome message is displayed"
- **Screenshots**: "Take screenshot of homepage"

### Example Test Case

Create `tests/Test_English/TC01.txt`:

```
Open browser and navigate to https://www.saucedemo.com/
Enter "standard_user" in username text field and "secret_sauce" in password field.
Click on login button
```

### Best Practices

1. **Be specific**: Use clear, descriptive element names
2. **One action per line**: Keep each line focused on a single action
3. **Use quotes for values**: Wrap input values in quotes
4. **Logical naming**: Use consistent naming conventions

## Converting English to JSON Steps

### JSON Step Schema

Each test step follows this structure:

```json
{
  "id": "step-1",
  "action": "navigate|click|fill|press|waitFor|assertText|assertVisible|screenshot",
  "target": "logical_element_name",
  "value": "input_value",           // Optional, for fill/press
  "assert": "expected_value",       // Optional, for assertions
  "metadata": {
    "originalEnglish": "Original English text"
  }
}
```

### Conversion Rules

1. **Target Naming**: Use underscores instead of spaces (e.g., `login_button`)
2. **Sequential IDs**: Number steps as `step-1`, `step-2`, etc.
3. **Optional Fields**: Omit `value` and `assert` when not applicable
4. **Metadata**: Include original English text for traceability

### Automated Conversion

The framework provides automated conversion. Place English test files in `tests/Test_English/` and the system will:

1. Read the `.txt` file
2. Convert each line to JSON steps
3. Save as `.json` file in `tests/` directory

### Manual Conversion Example

**Input (TC01.txt):**
```
Open browser and navigate to https://www.saucedemo.com/
Enter "standard_user" in username text field and "secret_sauce" in password field.
Click on login button
```

**Output (TC01.json):**
```json
[
  {
    "id": "step-1",
    "action": "navigate",
    "target": "https://www.saucedemo.com/",
    "metadata": {
      "originalEnglish": "Open browser and navigate to https://www.saucedemo.com/"
    }
  },
  {
    "id": "step-2",
    "action": "fill",
    "target": "username_field",
    "value": "standard_user",
    "metadata": {
      "originalEnglish": "Enter \"standard_user\" in username text field and \"secret_sauce\" in password field."
    }
  },
  {
    "id": "step-3",
    "action": "fill",
    "target": "password_field",
    "value": "secret_sauce",
    "metadata": {
      "originalEnglish": "Enter \"standard_user\" in username text field and \"secret_sauce\" in password field."
    }
  },
  {
    "id": "step-4",
    "action": "click",
    "target": "login_button",
    "metadata": {
      "originalEnglish": "Click on login button"
    }
  }
]
```

## Locator Discovery

### Purpose

Locator discovery automatically identifies CSS selectors for web elements by:
1. Navigating to the target page
2. Taking a page snapshot (accessibility tree)
3. Analyzing element patterns
4. Mapping logical names to actual selectors

### Running Locator Discovery

```bash
# Discover locators for a specific test
npm run discover-locators -- --file tests/TC01.json

# Discover and run test automatically
npm run discover-locators -- --file tests/TC01.json --run
```

### How It Works

1. **Page Navigation**: Opens the URL from the first navigate step
2. **Snapshot Analysis**: Captures page accessibility snapshot
3. **Pattern Matching**: Uses intelligent algorithms to find elements
4. **Fallback Discovery**: If snapshot fails, uses naming conventions
5. **Selector Storage**: Updates `config/selectors.json` with discovered locators

### Example Output

```
🔍 Discovering locators from test file...
ℹ️  INFO Extracted target names: ["username_field", "password_field", "login_button"]
ℹ️  INFO Inferred locator for "username_field": "input[type=\"text\"]"
ℹ️  INFO Inferred locator for "password_field": "input[type=\"password\"]"
ℹ️  INFO Inferred locator for "login_button": "button[type=\"submit\"]"
✓ SUCCESS Updated selectors.json with discovered locators
```

### Manual Selector Configuration

You can also manually add selectors to `config/selectors.json`:

```json
{
  "username_field": "input#user-name",
  "password_field": "input#password",
  "login_button": "input#login-button"
}
```

## Running Tests

### Basic Test Execution

```bash
# Run a specific test
npm run run-test -- --file tests/TC01.json

# Run with custom selectors file
npm run run-test -- --file tests/TC01.json --selectors ./config/custom-selectors.json

# Run with custom output directory
npm run run-test -- --file tests/TC01.json --output ./my-artifacts
```

### Execution Flow

1. **Validation**: Validates JSON schema
2. **MCP Connection**: Connects to Playwright MCP server
3. **Step Execution**: Executes each step sequentially
4. **Artifact Generation**: Saves screenshots, logs, and reports
5. **Result Summary**: Displays pass/fail status

### Example Execution Output

```
📁 Artifact directory: ./artifacts/abc123
📄 Loading test file: tests/TC01.json
🔍 Loading selectors: ./config/selectors.json
⚙️  Executing test steps...

✅ Step step-1 completed: Navigated to https://www.saucedemo.com/
✅ Step step-2 completed: Filled username_field with "standard_user"
✅ Step step-3 completed: Filled password_field with "secret_sauce"
✅ Step step-4 completed: Clicked on login_button

╔════════════════════════════════════════╗
║     TEST EXECUTION COMPLETED           ║
╚════════════════════════════════════════╝
Status: PASSED
Total Steps: 4
Passed: 4
Failed: 0
Duration: 33290ms
Artifacts: ./artifacts/abc123
```

## Viewing Reports and Artifacts

### Artifact Structure

Each test execution creates an artifact directory with:

```
artifacts/{execution-id}/
├── execution.log          # Detailed execution logs
├── screenshots/           # Screenshot files (if any)
├── step-1-screenshot.png  # Step-specific screenshots
└── ...
```

### Log Files

**execution.log** contains:
- Step-by-step execution details
- MCP tool calls and responses
- Error messages and stack traces
- Performance timing information

### Viewing Logs

```bash
# View latest execution log
cat artifacts/$(ls -t artifacts | head -1)/execution.log

# Search for specific errors
grep "ERROR" artifacts/*/execution.log
```

### Screenshot Analysis

Screenshots are automatically captured for:
- Screenshot actions in test steps
- Failed steps (for debugging)
- Key interaction points

### Test Reports

The CLI provides real-time reporting:
- Step-by-step status (✅/❌)
- Execution timing
- Pass/fail summary
- Artifact locations

## Advanced Features

### Custom MCP Server

```bash
# Use custom MCP server command
npm run run-test -- --file tests/TC01.json --mcp "node custom-mcp-server.js"
```

### Environment Configuration

Create `config/env.json` for environment-specific settings:

```json
{
  "baseUrl": "https://staging.example.com",
  "timeout": 30000,
  "headless": false
}
```

### Parallel Execution

The framework supports sequential execution. For parallel runs, use multiple terminal sessions or CI/CD pipelines.

### Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Automated Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run discover-locators -- --file tests/TC01.json
      - run: npm run run-test -- --file tests/TC01.json
```

## Troubleshooting

### Common Issues

#### 1. MCP Server Connection Failed
```
Error: Failed to connect to MCP server
```
**Solution:**
- Ensure Playwright MCP server is installed: `npm install -g @executeautomation/playwright-mcp-server`
- Check if the server is running
- Verify Node.js version compatibility

#### 2. Locator Discovery Fails
```
Error: Cannot read properties of undefined (reading 'snapshot')
```
**Solution:**
- The framework will automatically use fallback discovery
- Manually add selectors to `config/selectors.json`
- Check page load timing

#### 3. Element Not Found
```
Error: page.click: Timeout 30000ms exceeded
```
**Solution:**
- Run locator discovery again
- Verify selectors in `config/selectors.json`
- Check if page structure changed
- Add wait steps before interactions

#### 4. JSON Validation Errors
```
ZodError: Expected string, received null
```
**Solution:**
- Ensure optional fields are omitted, not set to `null`
- Validate JSON against the schema
- Check for syntax errors

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* npm run run-test -- --file tests/TC01.json
```

### Performance Optimization

1. **Selector Optimization**: Use specific selectors (IDs, data attributes)
2. **Wait Strategies**: Add appropriate wait steps
3. **Screenshot Reduction**: Only capture screenshots when necessary

### Getting Help

1. Check execution logs in artifacts directory
2. Review MCP server logs
3. Validate test JSON against schema
4. Test selectors manually in browser dev tools

---

## Quick Start Guide

1. **Setup**: `npm install && npm install -g @executeautomation/playwright-mcp-server`
2. **Create Test**: Write English steps in `tests/Test_English/TC01.txt`
3. **Convert**: Framework auto-converts to `tests/TC01.json`
4. **Discover**: `npm run discover-locators -- --file tests/TC01.json`
5. **Run**: `npm run run-test -- --file tests/TC01.json`
6. **Report**: Check artifacts directory for logs and screenshots

This handbook provides comprehensive guidance for using the Playwright MCP Automation Framework effectively.