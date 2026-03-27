# Architecture & Implementation Guide

## Overview

The Playwright MCP Automation Framework is designed as a clean, layered architecture that separates concerns across distinct modules.

## Architecture Layers

### 1. Schema Layer (`src/schema/`)

**Responsibility**: Validate JSON test inputs

**Files**:
- `stepSchema.ts` - Zod schemas for test validation

**Key Concepts**:
- `ActionTypes` enum: Defines all valid action types
- `TestStepSchema`: Single step validation
- `TestFlowSchema`: Array of steps validation
- `validateStep()`: Helper to validate individual steps
- `validateFlow()`: Helper to validate complete flows

**Example Usage**:
```typescript
import { validateFlow } from './schema/stepSchema';

const jsonContent = JSON.parse(testFileContent);
const validatedFlow = validateFlow(jsonContent); // Throws on invalid input
```

### 2. Executor Layer (`src/executor/`)

#### A. MCP Client (`mcpClient.ts`)

**Responsibility**: Manage connection to Playwright MCP server and execute tool calls

**Key Methods**:
- `connect()` - Establish stdio transport to MCP server
- `callTool(name, args)` - Execute any MCP tool
- `navigate()`, `click()`, `fill()`, etc. - Convenience methods for common tools
- `listTools()` - Discover available server tools
- `disconnect()` - Clean up connection

**Architecture**:
```
StdioClientTransport
         ↓
    MCP Client
         ↓
  Playwright MCP Server
```

**Error Handling**: All errors are caught, logged, and rethrown for upstream handling.

#### B. Step Executor (`executor.ts`)

**Responsibility**: Convert JSON steps to MCP tool calls

**Key Methods**:
- `execute(step)` - Execute single step and return result
- `resolveSelector(target)` - Map logical name to CSS selector

**Execution Pipeline**:
```
Step Input (JSON)
      ↓
Resolve Target Selector
      ↓
Execute Action via MCP
      ↓
Capture Result/Error
      ↓
ExecutionResult Output
```

**Action Mapping**:
```
navigate      → client.navigate()
click         → client.click()
fill          → client.fill()
press         → client.pressKey()
waitFor       → client.waitFor()
screenshot    → client.screenshot()
assertText    → getSnapshot() + text search
assertVisible → getSnapshot() + element search
```

**Error Handling**: Each step failure is logged but doesn't stop subsequent steps.

#### C. Test Runner (`runner.ts`)

**Responsibility**: Orchestrate execution of complete test flows

**Key Methods**:
- `run(flow)` - Execute all steps sequentially
- `runFromJSON(content)` - Validate and run JSON

**Output**: `ExecutionSummary` with pass/fail counts, timing, and detailed results

### 3. Utility Layer (`src/utils/`)

#### A. Logger (`logger.ts`)

**Responsibility**: Structured, color-coded logging

**Levels**:
- INFO - Informational
- SUCCESS - Successful operations
- ERROR - Errors with context
- WARN - Non-critical issues
- DEBUG - Detailed debugging info

**Features**:
- Console output with colors (chalk)
- Structured logging with metadata
- Automatic log file persistence
- Timestamp tracking

**Example**:
```typescript
logger.info("Starting test", { totalSteps: 5 });
logger.success("Step completed", { duration: 150 });
logger.error("Step failed", { error: "Element not found" });
```

#### B. File Utilities (`file.ts`)

**Responsibility**: File I/O operations

**Functions**:
- `loadTestFile()` - Load and parse JSON test
- `loadSelectors()` - Load selector config
- `loadEnvConfig()` - Load environment config
- `ensureArtifactDir()` - Create artifact directory
- `saveArtifact()` - Save file to artifacts

### 4. CLI Layer (`src/cli/`)

**Responsibility**: Command-line interface

**Command**: `run-json`
- `--file`: Test JSON file path
- `--selectors`: Selectors config path
- `--output`: Artifact directory
- `--mcp`: MCP server command

**Flow**:
```
Parse CLI Args
      ↓
Load & Validate Test
      ↓
Load Configuration
      ↓
Connect to MCP Server
      ↓
Execute Test Flow
      ↓
Generate Summary
      ↓
Save Artifacts & Logs
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│ AI Generated JSON Test Steps                     │
│ (from GitHub Copilot, etc.)                      │
└────────────┬────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────┐
│ Schema Validation (Zod)                          │
│ - Validate structure                             │
│ - Validate action types                          │
│ - Check required fields                          │
└────────────┬────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────┐
│ Configuration Loading                            │
│ - Load selectors.json                            │
│ - Load env.json                                  │
└────────────┬────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────┐
│ MCP Connection                                   │
│ - Establish stdio transport                      │
│ - List available tools                           │
└────────────┬────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────┐
│ Step Execution Loop                              │
│ For each step:                                   │
│ - Resolve selector                               │
│ - Call MCP tool                                  │
│ - Log result                                     │
│ - Capture error/screenshot                       │
└────────────┬────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────┐
│ Artifact Generation                              │
│ - Save logs                                      │
│ - Archive screenshots                            │
│ - Generate summary                               │
└─────────────────────────────────────────────────┘
```

## Selector Resolution Strategy

The framework provides flexible element targeting:

### Resolution Order:
1. Check `selectors.json` for logical name
2. If not found, use raw target as selector
3. Return resolved selector to MCP

### Example:
```
Input target: "loginButton"
       ↓
Check selectors.json
       ↓
Found: "button.login-btn"
       ↓
Pass to MCP: "button.login-btn"
```

If not in selectors.json:
```
Input target: "button[type='submit']"
       ↓
Check selectors.json
       ↓
Not found
       ↓
Pass to MCP: "button[type='submit']"
```

## Error Handling Strategy

### Three-Level Error Handling:

**Level 1: Input Validation**
- Zod schema validation
- Clear error messages with field info
- Fails fast on invalid input

**Level 2: Execution Errors**
- Try-catch around each step
- Individual step failure doesn't stop flow
- Detailed error logging with context

**Level 3: System Errors**
- MCP connection failures
- File I/O errors
- Global try-catch in CLI

### Error Recovery:
- Log detailed context
- Continue with next step (unless critical)
- Save artifacts for post-mortem
- Non-zero exit code on any failures

## Configuration Hierarchy

### Selector Resolution:
```
selectors.json (logical names)
         ↓
Direct selectors (CSS/XPath)
         ↓
MCP Tool
```

### Environment Config (`env.json`):
- Base URL for navigation
- Timeout values
- Screenshot settings
- Browser options

## Performance Considerations

### Sequential Execution:
- Steps execute one-by-one
- No parallelization (maintains deterministic order)
- Each step waits for previous to complete

### Timing Insights:
- Each step tracks duration
- Summary includes total runtime
- Screenshots timestamped for correlation

### Optimization Tips:
- Use waitFor strategically
- Minimize unnecessary screenshots
- Group related steps logically
- Reuse selector definitions

## Testing & Validation

### Schema Validation:
```typescript
const validated = validateFlow(jsonContent);
// Throws ZodError if invalid
```

### Runtime Validation:
- MCP tool responses checked
- Assertion logic validates page state
- Error messages propagated upward

## Extension Points

### Adding New Actions:

1. Update `stepSchema.ts`:
```typescript
export const ActionTypes = z.enum([
  // ... existing
  "customAction",
]);
```

2. Update `executor.ts`:
```typescript
case "customAction":
  // Implement custom logic
  break;
```

3. Update `mcpClient.ts` if new MCP tools needed

### Custom Selectors:
Simply add to `selectors.json`:
```json
{
  "myCustomElement": "div.my-selector"
}
```

## Logging Strategy

### Log Levels:
- **INFO**: Flow progress, configuration loading
- **SUCCESS**: Completed steps, successful assertions
- **WARN**: Non-critical issues, skipped steps
- **ERROR**: Failures with full context
- **DEBUG**: Detailed MCP calls and arguments

### Log Destinations:
- Console (with colors)
- `execution.log` in artifacts directory
- Structured JSON for machine parsing

## Dependencies

### Production:
- `@modelcontextprotocol/sdk` - MCP protocol
- `zod` - Schema validation
- `yargs` - CLI parsing
- `chalk` - Colored output
- `fs-extra` - File operations
- `nanoid` - ID generation

### Development:
- `typescript` - Type checking
- `ts-node` - TypeScript execution
- `@types/node` - Node types
- `@types/fs-extra` - fs-extra types

## State Management

### MCP Client State:
- Connection instance
- Server reference
- Transport instance

### Executor State:
- Selectors map (immutable)
- Logger instance
- Artifact directory path

### Runner State:
- Execution results array
- Timing information
- Overall status

**Immutability**: Configuration and selectors are read-only post-initialization.

## Security Considerations

1. **No Hard-coded Credentials**: Use environment variables
2. **No Dynamic Code Execution**: Only predefined actions allowed
3. **Selector Injection**: Selectors passed as-is to MCP (trusted source)
4. **File Access**: Restricted to configured directories
5. **Subprocess Communication**: MCP server runs separately, isolated stdio

---

This architecture enables:
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new actions and tools
- **Testability**: Modular design allows unit testing
- **Reliability**: Comprehensive error handling
- **Performance**: Efficient resource usage
