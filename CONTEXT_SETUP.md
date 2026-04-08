# Playwright MCP Automation Framework - Context and Setup Guide

## Project Overview
This is a Playwright MCP (Model Context Protocol) automation framework for web testing. It allows running automated browser tests using natural language test steps defined in JSON format, with MCP server integration for browser automation.

## Key Components
- **CLI Tool**: `src/cli/index.ts` - Main entry point for running tests
- **Executor**: `src/executor/` - Handles test execution logic
- **Selectors**: `config/selectors.json` - Maps logical names to locator expressions (CSS/XPath)
- **Test Files**: `tests/` directory - JSON test case files
- **MCP Server**: `playwright-mcp-server.js` - Playwright MCP server implementation

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Playwright browsers (installed automatically)

## Installation Steps

### 1. Clone/Transfer Code Assets
Copy the entire project directory to your new system.

### 2. Install Dependencies
```bash
npm install
```

### 3. Install Playwright Browsers
```bash
npx playwright install
```

### 4. Optional: Configure LLM Self-Heal (Ollama local)

The framework uses bundled `playwright-mcp-server.js` automatically. No global MCP package is required.

To enable local LLM healing for broken locators:

```bash
ollama serve
ollama pull llama3.1
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set OLLAMA_MODEL=llama3.1
```

## Configuration

### Environment Configuration
Edit `config/env.json` for environment-specific settings:
```json
{
  "baseUrl": "https://example.com",
  "timeout": 30000
}
```

### Selectors Configuration
Update `config/selectors.json` to map logical names to actual locator expressions:
```json
{
  "username_field": "input[type=\"text\"]",
  "password_field": "input[type=\"password\"]",
  "login_button": "button[type=\"submit\"]",
  "searchButton": "button[type=\"submit\"]"
}
```

## Running Tests

### Basic Test Execution
```bash
npm run run-test -- --file tests/TC01.json
```

### Available Test Files
- `tests/TC01.json` - SauceDemo login and cart test
- `tests/simple.json` - Basic navigation test
- `tests/sample.json` - Sample test case
- `tests/Guru99.json` - Guru99 demo site test

### Test File Format
Test files are JSON arrays with step objects:
```json
[
  {
    "id": "step-1",
    "action": "navigate",
    "target": "https://example.com",
    "metadata": {
      "originalEnglish": "Navigate to example.com"
    }
  },
  {
    "id": "step-2",
    "action": "fill",
    "target": "username_field",
    "value": "testuser",
    "metadata": {
      "originalEnglish": "Enter username"
    }
  },
  {
    "id": "step-3",
    "action": "click",
    "target": "login_button",
    "metadata": {
      "originalEnglish": "Click login button"
    }
  }
]
```

### Supported Actions
- `navigate` - Navigate to URL
- `fill` - Fill input field with text
- `click` - Click on element
- `waitFor` - Wait for time or condition
- `press` - Press keyboard key

## Converting Text Test Cases to JSON

### From Text File
1. Create a text file with steps (one per line)
2. Use the framework's conversion logic or manually create JSON

### Example Text to JSON Conversion
**Input (Guru99.txt):**
```
Navigate to https://demo.guru99.com/V4/
Enter "XYZ" in user Id field
Enter "password" in password field
click on login button
```

**Output (Guru99.json):**
```json
[
  {
    "id": "step-1",
    "action": "navigate",
    "target": "https://demo.guru99.com/V4/",
    "metadata": {
      "originalEnglish": "Navigate to https://demo.guru99.com/V4/"
    }
  },
  {
    "id": "step-2",
    "action": "fill",
    "target": "username_field",
    "value": "XYZ",
    "metadata": {
      "originalEnglish": "Enter \"XYZ\" in user Id field"
    }
  },
  {
    "id": "step-3",
    "action": "fill",
    "target": "password_field",
    "value": "password",
    "metadata": {
      "originalEnglish": "Enter \"password\" in password field"
    }
  },
  {
    "id": "step-4",
    "action": "click",
    "target": "login_button",
    "metadata": {
      "originalEnglish": "click on login button"
    }
  }
]
```

## Artifacts and Output
- Test artifacts are saved in `artifacts/` directory
- Each test run creates a unique subdirectory
- Includes screenshots, logs, and execution details
- Includes self-heal events when locator recovery is triggered

## Runtime Self-Heal Flow

On element action failure (`click`, `fill`, etc.), the runtime can:
1. Capture cleaned DOM (scripts/styles removed)
2. Ask LLM for stable XPath (only on failure)
3. Validate XPath resolves to exactly one element
4. Retry action with healed XPath
5. Persist healed locator atomically if retry succeeds
6. Re-throw original error if retry fails

## Locator Discovery Flow

When running `discover-locators`, the framework can:
1. Capture cleaned DOM and page snapshot context
2. Ask LLM for XPath for unresolved logical targets
3. Validate XPath resolves to exactly one element
4. Fall back to built-in heuristic discovery if LLM is unavailable/invalid
5. Persist discovered locators atomically

## Troubleshooting

### Common Issues
1. **MCP Server Connection Failed**
   - Ensure `playwright-mcp-server.js` exists
   - Check Node.js version compatibility

2. **Selector Not Found**
   - Verify selectors in `config/selectors.json`
   - Use browser dev tools to inspect actual selectors
   - Update selectors for target website

3. **Timeout Errors**
   - Increase timeout in `config/env.json`
   - Add `waitFor` steps between actions

4. **Browser Not Installed**
   - Run `npx playwright install`
   - Ensure system has required dependencies for browsers

### Debug Mode
Run tests with debug logging:
```bash
DEBUG=* npm run run-test -- --file tests/your-test.json
```

## Development

### Project Structure
```
├── src/
│   ├── cli/           # Command line interface
│   ├── executor/      # Test execution engine
│   ├── schema/        # JSON schema definitions
│   └── utils/         # Utility functions
├── config/            # Configuration files
├── tests/             # Test case files
├── artifacts/         # Test output artifacts
└── package.json       # Dependencies and scripts
```

### Adding New Selectors
1. Edit `config/selectors.json`
2. Add new key-value pairs
3. Use logical names in test steps

### Extending Actions
Modify `src/executor/executor.ts` to add new action types.

## Quick Start Checklist
- [ ] Code assets transferred
- [ ] `npm install` completed
- [ ] `npx playwright install` done
- [ ] `config/selectors.json` updated for target site
- [ ] Test file created/updated
- [ ] `npm run run-test -- --file tests/your-test.json` working

This context form provides everything needed to set up and use the framework on a new system.