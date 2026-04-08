# Development Guide

## Getting Started with Development

### Prerequisites
- Node.js 18+
- npm or yarn
- TypeScript knowledge
- Familiarity with Playwright MCP

### Setup Development Environment

```bash
# Clone/setup project
npm install

# Build TypeScript
npm run build

# Run tests
npm run run-test -- --file tests/sample.json
```

Note: `run-test` starts the bundled MCP server automatically (`node playwright-mcp-server.js`) unless overridden with `--mcp`.

### Optional Local LLM for Self-Heal

Self-heal LLM is invoked only on action failures.

```bash
ollama serve
ollama pull llama3.1
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set OLLAMA_MODEL=llama3.1
```

Implementation files:
- `src/executor/selfHealLLM.ts` (provider integration + prompt)
- `src/executor/locatorDiscovery.ts` (heal flow + atomic persistence)
- `src/executor/executor.ts` (`withHeal` retry/original-error semantics)
- `src/executor/mcpClient.ts` (`getDOMContent`, `validateXPath`)
- `playwright-mcp-server.js` (`mcp_microsoft_pla_browser_get_dom`, `mcp_microsoft_pla_browser_validate_xpath`)

## Adding New Actions

### Step 1: Update Schema

Edit `src/schema/stepSchema.ts`:

```typescript
export const ActionTypes = z.enum([
  // ... existing actions
  "myNewAction",  // Add here
]);
```

### Step 2: Implement in StepExecutor

Edit `src/executor/executor.ts`:

```typescript
case "myNewAction":
  const customResult = await this.client.myNewMCPTool(step.target, step.value);
  result = `Custom action executed: ${step.target}`;
  break;
```

### Step 3: Add MCP Tool Method (if needed)

Edit `src/executor/mcpClient.ts`:

```typescript
/**
 * Custom MCP tool call
 */
async myNewMCPTool(param1: string, param2?: string): Promise<MCPToolResult> {
  return this.callTool("mcp_tool_name", {
    param1,
    param2,
  });
}
```

### Step 4: Update Tests

Create test JSON with new action:

```json
{
  "id": "step-1",
  "action": "myNewAction",
  "target": "element-name",
  "value": "optional-value"
}
```

### Step 5: Test Locally

```bash
npm run build
npm run run-test -- --file tests/my-test.json
```

## Adding Custom Selectors

### Option 1: Static in selectors.json

```json
{
  "myElement": "div.my-class button"
}
```

Then use in step:
```json
{
  "action": "click",
  "target": "myElement"
}
```

### Option 2: Dynamic Resolution

Extend `resolveSelector()` in `StepExecutor`:

```typescript
private resolveSelector(target: string): string {
  // Custom resolution logic
  if (target.startsWith("dynamic-")) {
    return this.resolveDynamicSelector(target);
  }
  // Existing logic
  return this.selectors[target] || target;
}

private resolveDynamicSelector(target: string): string {
  // Implement custom logic
  return target.replace("dynamic-", "");
}
```

## Creating Custom Loggers

Extend the `Logger` class:

```typescript
import { Logger } from './utils/logger';

class CustomLogger extends Logger {
  customLevel(message: string, data?: Record<string, unknown>): void {
    this.log("CUSTOM", message, data);
  }
}
```

## Writing Custom Utilities

Add to `src/utils/`:

```typescript
// src/utils/custom.ts
export async function customOperation(): Promise<void> {
  // Your custom logic
}
```

Import and use:
```typescript
import { customOperation } from '../utils/custom';
```

## Modifying MCP Client

### Add New Tool Wrapper

```typescript
// In mcpClient.ts
async customTool(param: string): Promise<MCPToolResult> {
  return this.callTool("mcp_tool_name", {
    param,
    additionalParam: "value",
  });
}
```

### Change MCP Server Command

```typescript
// In CLI or programmatically
const client = new PlaywrightMCPClient(logger, "custom-command");
```

## Debugging

### Enable Debug Logging

The framework supports debug logs. Modify logger level:

```typescript
// In executor classes
logger.debug("Detailed message", { data: value });
```

Run with debug output in `execution.log`.

### Debugging MCP Calls

Add to `mcpClient.ts`:

```typescript
async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
  console.log("MCP Call:", { tool: name, args });
  const result = await this.client.callTool({ name, arguments: args });
  console.log("MCP Result:", result);
  return result as MCPToolResult;
}
```

### Step-by-Step Debugging

```bash
# Run specific test with detailed logging
DEBUG=true npm run run-test -- --file tests/debug-test.json
```

## Testing & Validation

### Unit Testing Example

Create `src/__tests__/stepSchema.test.ts`:

```typescript
import { validateStep, validateFlow } from '../schema/stepSchema';

describe('Step Schema', () => {
  it('should validate correct step', () => {
    const step = {
      id: "test-1",
      action: "click",
      target: "button",
    };
    expect(() => validateStep(step)).not.toThrow();
  });

  it('should reject invalid action', () => {
    const step = {
      id: "test-1",
      action: "invalidAction",
      target: "button",
    };
    expect(() => validateStep(step)).toThrow();
  });
});
```

### Manual Testing

```bash
# Test with sample flow
npm run run-test -- --file tests/sample.json --output ./test-output

# Check logs
cat test-output/execution.log

# Review screenshots
ls -la test-output/screenshot-*.png
```

## Performance Optimization

### 1. Selective Screenshots

Only screenshot when necessary:
```json
{
  "action": "click",
  "target": "button"
  // No screenshot needed
},
{
  "action": "screenshot",
  "target": "result"
  // Screenshot after important step
}
```

### 2. Reduce Wait Times

Use specific waitFor conditions:
```json
{
  "action": "waitFor",
  "target": "Specific text"
  // More specific than just waiting 5s
}
```

### 3. Batch Related Steps

Group steps logically to minimize context switches.

## Configuration Best Practices

### selectors.json Structure

```json
{
  "auth-username": "input#username",
  "auth-password": "input#password",
  "auth-submit": "button[type='submit']",
  "dashboard-title": "h1.title",
  "dashboard-logout": "button.logout"
}
```

Use prefixes to organize selectors by context.

### env.json Configuration

```json
{
  "baseUrl": "https://staging.example.com",
  "timeout": "30000",
  "headless": "true",
  "screenshotFormat": "png"
}
```

## Error Handling in Custom Code

### Proper Error Handling Pattern

```typescript
try {
  const result = await this.client.navigate(url);
  this.logger.success("Navigation successful");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  this.logger.error("Navigation failed", { error: message });
  throw error; // Re-throw or handle
}
```

## Code Style & Convention

### TypeScript

- Use explicit types
- Avoid `any` type
- Use interfaces for public APIs
- Document public methods with JSDoc

Example:
```typescript
/**
 * Execute a single test step
 * @param step The test step to execute
 * @returns Execution result with status and timing
 */
async execute(step: TestStep): Promise<ExecutionResult> {
  // Implementation
}
```

### Naming Conventions

- **Functions**: camelCase, verb-based (execute, resolve, load)
- **Classes**: PascalCase, noun-based (StepExecutor, TestRunner)
- **Constants**: UPPER_SNAKE_CASE
- **Private methods**: _prefixed (optional)

### Directory Organization

```
src/
├── schema/      # Input validation (Zod)
├── executor/    # Core execution logic
├── cli/         # Command-line interface
├── utils/       # Helper functions
└── types/       # Type definitions (if separate)
```

## Building for Production

### Prepare Build

```bash
npm run clean
npm run build
```

### Verify Build

```bash
ls -la dist/
node dist/cli/index.js --help
```

### Package for Distribution

```bash
# Create tarball
npm pack

# Or build Docker image
docker build -t playwright-automation-framework .
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Suite
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm run run-test -- --file tests/sample.json
```

## Documentation

### Documenting New Actions

When adding new actions, document in:
1. `README.md` - Add to supported actions table
2. `stepSchema.ts` - Add Zod schema description
3. `ARCHITECTURE.md` - Update action mapping
4. Example JSON - Add example in `tests/`

Example:
```typescript
export const TestStepSchema = z.object({
  // ...
  action: ActionTypes.describe("Action to perform"),
  // ...
});
```

## Troubleshooting Development Issues

### TypeScript Compilation Errors

```bash
npm run build -- --listErrors
```

### Runtime Errors with ts-node

```bash
# Clear ts-node cache
rm -rf .ts-node

# Run with verbose output
NODE_DEBUG=* npm run dev -- run-json --file tests/sample.json
```

### MCP Connection Issues

1. Verify MCP server is running
2. Check server output for errors
3. Test with simple JSON first
4. Add debug logging in mcpClient.ts

### Missing Dependencies

```bash
npm install
npm run build
```

## Creating a Patch/Contribution

### Process

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes with tests
3. Build and test: `npm run build && npm run test`
4. Commit with clear message: `git commit -m "Description"`
5. Push and create pull request

### Commit Message Format

```
type(scope): subject

body

fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Performance Profiling

### Monitor Step Execution

The logger automatically tracks duration:
```
✓ SUCCESS Step step-1 completed in 523ms
```

Review `execution.log` for performance insights.

### Optimize MCP Calls

Profile which tools take longest:
```typescript
const start = Date.now();
const result = await this.client.callTool(name, args);
const duration = Date.now() - start;
this.logger.debug(`Tool ${name} took ${duration}ms`);
```

## Common Recipes

### Login Test Template

```json
[
  {"id": "1", "action": "navigate", "target": "https://app.example.com/login"},
  {"id": "2", "action": "fill", "target": "usernameField", "value": "user@example.com"},
  {"id": "3", "action": "fill", "target": "passwordField", "value": "password"},
  {"id": "4", "action": "click", "target": "submitButton"},
  {"id": "5", "action": "waitFor", "target": "Dashboard"},
  {"id": "6", "action": "assertText", "assert": "Welcome"},
  {"id": "7", "action": "screenshot", "target": "success"}
]
```

### Search & Navigate Template

```json
[
  {"id": "1", "action": "click", "target": "searchButton"},
  {"id": "2", "action": "fill", "target": "searchInput", "value": "query"},
  {"id": "3", "action": "press", "value": "Enter"},
  {"id": "4", "action": "waitFor", "target": "Results"},
  {"id": "5", "action": "screenshot", "target": "results"}
]
```

---

Happy developing! 🚀
