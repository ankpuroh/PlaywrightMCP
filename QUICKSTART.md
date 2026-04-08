# Quick Start Guide

Get up and running with the Playwright MCP Automation Framework in 5 minutes.

## 🚀 Installation (1 minute)

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build
```

✅ Framework is ready!

## 🎮 Running Your First Test (2 minutes)

The framework starts the bundled MCP server automatically (`node playwright-mcp-server.js`).

Optional: enable LLM-based self-heal using local Ollama (invoked only on locator failure):

```bash
ollama serve
ollama pull llama3.1
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set OLLAMA_MODEL=llama3.1
```

### Run Test
```bash
npm run run-test -- --file tests/sample.json
```

Expected output:
```
✓ SUCCESS Logs saved to artifacts/xxx/execution.log
```

## 📄 Creating Your Own Test (2 minutes)

### 1. Create test file: `tests/mytest.json`

```json
[
  {
    "id": "step-1",
    "action": "navigate",
    "target": "https://example.com",
    "metadata": {
      "originalEnglish": "Go to website"
    }
  },
  {
    "id": "step-2",
    "action": "click",
    "target": "loginButton",
    "metadata": {
      "originalEnglish": "Click login button"
    }
  },
  {
    "id": "step-3",
    "action": "screenshot",
    "target": "login-page",
    "metadata": {
      "originalEnglish": "Take screenshot"
    }
  }
]
```

### 2. Update selectors: `config/selectors.json`

```json
{
  "loginButton": "button.login-btn",
  "searchInput": "input[type='search']"
}
```

### 3. Run your test

```bash
npm run run-test -- --file tests/mytest.json
```

## 📋 Common Actions

### Navigate
```json
{
  "id": "step-1",
  "action": "navigate",
  "target": "https://example.com"
}
```

### Click
```json
{
  "id": "step-2",
  "action": "click",
  "target": "loginButton"
}
```

### Fill Form Field
```json
{
  "id": "step-3",
  "action": "fill",
  "target": "usernameField",
  "value": "myusername"
}
```

### Press Key
```json
{
  "id": "step-4",
  "action": "press",
  "value": "Enter"
}
```

### Wait for Element/Text
```json
{
  "id": "step-5",
  "action": "waitFor",
  "target": "Welcome message"
}
```

### Take Screenshot
```json
{
  "id": "step-6",
  "action": "screenshot",
  "target": "page"
}
```

### Assert Text Exists
```json
{
  "id": "step-7",
  "action": "assertText",
  "assert": "Success message"
}
```

### Assert Element Visible
```json
{
  "id": "step-8",
  "action": "assertVisible",
  "target": "successBanner"
}
```

## 🔍 Understanding Test Results

After running a test, check:

### Console Output
```
✓ SUCCESS Step step-1 completed in 234ms
✗ ERROR Step step-2 failed: Element not found
...
Status: FAILED
Total Steps: 8
Passed: 7
Failed: 1
Duration: 2500ms
Artifacts: ./artifacts/abc123
```

### Artifact Folder
```
artifacts/abc123/
├── execution.log          ← Detailed step logs
├── screenshot-step-1-*.png
├── screenshot-step-6-*.png
└── ...
```

### Check Logs
```bash
cat artifacts/abc123/execution.log
```

## ⚙️ CLI Options

### Basic Syntax
```bash
npm run run-test -- --file <path> [options]
```

### Common Options

```bash
# Custom output directory
npm run run-test -- --file tests/test.json --output ./my-results

# Custom selectors file
npm run run-test -- --file tests/test.json --selectors ./my-selectors.json

# Custom MCP server
npm run run-test -- --file tests/test.json --mcp "npm run mcp-server"
```

### Full Help
```bash
npm run run-test -- --help
```

## 🔧 Configuration Files

### selectors.json
Maps logical names to locator expressions:
```json
{
  "submitBtn": "button[type='submit']",
  "emailField": "input#email"
}
```

Runtime self-heal can update locator entries atomically when a better selector/XPath is discovered on failure.

Use in tests:
```json
{
  "action": "click",
  "target": "submitBtn"
}
```

### env.json
Environment settings:
```json
{
  "baseUrl": "https://myapp.com",
  "timeout": "30000"
}
```

## 📚 Example Tests

### Login Test
See `tests/login.json`

### Product Search & Add to Cart
See `tests/workflow.json`

### Basic Navigation
See `tests/sample.json`

## 🐛 Troubleshooting

### "MCP Server not found"
```
✗ Error: Failed to connect to MCP server

Solution:
1. By default, no separate terminal is required; CLI starts bundled MCP server automatically.
2. If `--mcp` was provided, verify the custom command is valid.
```

### "Element not found"

The framework can auto-heal a failed locator in single-test mode:
1. capture cleaned DOM,
2. ask configured LLM for stable XPath,
3. validate XPath resolves to exactly one element,
4. retry action,
5. persist healed locator if retry succeeds.

If healing also fails, the original action error is surfaced.
```
✗ Error: Element "submitBtn" not found

Solutions:
1. Check selectors.json for correct CSS
2. Verify element exists on page
3. Add screenshot before/after to debug
```

### "Selector mapping missing"
If target not in selectors.json, use raw CSS:
```json
{
  "action": "click",
  "target": "button.my-custom-class"
}
```

### "Invalid JSON format"
```
Error: ZodError: Invalid step schema

Solution: Validate JSON structure:
- All steps need "id" and "action"
- Action must be valid type
- target is usually required
```

## 💡 Best Practices

### 1. Use Descriptive Step IDs
```json
{
  "id": "login-username-entry",  // ✅ Good
  "id": "1",                      // ❌ Not clear
}
```

### 2. Include Metadata
```json
{
  "metadata": {
    "originalEnglish": "Click the submit button to complete login"
  }
}
```

### 3. Strategic Screenshots
```json
{
  "id": "step-3",
  "action": "click",
  "target": "submitBtn"
  // ❌ No screenshot needed for every click
},
{
  "id": "step-4",
  "action": "screenshot",  // ✅ Screenshot after important action
  "target": "success-page"
}
```

### 4. Organize Selectors
```json
{
  "auth-username": "input#username",
  "auth-password": "input#password",
  "dashboard-title": "h1.title",
  "dashboard-logout": "button.logout"
}
```

Use prefixes to group related selectors.

## 🚀 Next Steps

1. **Explore Examples**: Check `tests/` folder for examples
2. **Read Full README**: See `README.md` for complete documentation
3. **Understand Architecture**: See `ARCHITECTURE.md` for technical details
4. **Extend Framework**: See `DEVELOPMENT.md` to add custom actions

## 📞 Getting Help

### Check Logs
```bash
cat artifacts/last-run/execution.log
```

### Enable Debug Mode
Add more logging by checking execution.log details

### Review Architecture
See `ARCHITECTURE.md` for technical deep-dive

### Common Patterns
See `DEVELOPMENT.md` for recipes and templates

---

**You're all set!** 🎉

Run your first test:
```bash
npm run run-test -- --file tests/sample.json
```

Check results:
```bash
cat artifacts/*/execution.log
```

Happy automating! 🚀
