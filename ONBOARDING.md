# Onboarding Guide: Automating Tests with the Playwright MCP Framework

A step-by-step guide for automation testers who are new to this framework.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Mental Model](#2-mental-model)
3. [Create Your First Test Flow](#3-create-your-first-test-flow)
4. [Prepare Test Data](#4-prepare-test-data)
5. [Discover Locators](#5-discover-locators)
6. [Run a Single Test](#6-run-a-single-test)
7. [Review Outputs](#7-review-outputs)
8. [Build a Regression Suite](#8-build-a-regression-suite)
9. [Parallel Execution](#9-parallel-execution)
10. [Daily Workflow](#10-daily-workflow)
11. [Troubleshooting Checklist](#11-troubleshooting-checklist)

---

## 1. Prerequisites

Install the following before you start:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 or later | https://nodejs.org |
| npm | comes with Node | — |
| Git | any | https://git-scm.com |

Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd PlaywrightMCP2
npm install
```

Verify everything is wired up:

```bash
npm run build          # should exit with: tsc (no errors)
npm run gui            # starts the GUI editor on http://localhost:4317
```

---

## 2. Mental Model

```
Test JSON file  →  Locator map (selectors.json)  →  Playwright MCP  →  Browser
     ↑                        ↑
  you write it     framework discovers & heals
```

- **Test JSON**: a list of steps (`navigate`, `fill`, `click`, `assertText`, etc.) with logical target names like `LoginPage.usernameField`.
- **selectors.json**: maps those logical names to real locator expressions (CSS/XPath). The framework fills this in automatically when you run *discover-locators*.
- **Self-heal**: if a selector breaks between runs, the framework heals on failure by capturing cleaned DOM, generating a stable XPath through LLM, validating uniqueness, retrying once, and persisting the healed locator.
- **MCP Client**: a Playwright subprocess is started for every test run. No shared browser state between tests.

---

## 3. Create Your First Test Flow

### Option A — Create the JSON flow manually

The current GUI does not edit test flow files. It is intended for metadata and layered test-data management.

1. Copy an existing file such as `tests/seed.json` or `tests/sample.json`.
2. Rename it to your scenario, for example `tests/MyFeature.json`.
3. Edit the JSON steps directly in the file.

### Option B — Use the Planner + Converter agent pipeline

If your starting point is exploratory testing or high-level scenarios:

1. Use `playwright-test-planner` to explore the app and save a plan markdown file under `specs/`.
2. Run `Converter agent` against that plan (or plain-English steps) to generate framework artifacts:
  - `tests/*.json`
  - `config/TestData/*.json`
  - `config/locators/*.json` + consolidated `config/locators/pageObjects.json`
  - `config/TestMetaData.json`
3. Execute the generated JSON with `npm run run-test` or `npm run run-suite`.

### Option C — Use the Converter agent directly

If your starting point is already plain-English test steps, use the repository's Converter agent to generate the JSON flow and related locator/POM entries.

### Option D — Copy and edit `tests/seed.json`

`tests/seed.json` is a ready-made template covering the most common actions:

```
navigate → waitFor → fill username → fill password → click login
→ waitFor → click menu → click profile → fill search → screenshot
```

Copy it:

```bash
copy tests\seed.json tests\MyFeature.json   # Windows
cp   tests/seed.json tests/MyFeature.json   # macOS/Linux
```

Then replace every `{{placeholder}}` with a real value **or** keep them and supply values through a data file (see section 4).

### Supported Step Actions

| Action | What it does |
|--------|-------------|
| `navigate` | Go to a URL |
| `fill` | Type text into an input |
| `click` | Click a button, link, or element |
| `press` | Press a keyboard key (e.g. `Enter`) |
| `waitFor` | Wait until text appears on the page |
| `screenshot` | Save a PNG screenshot |
| `wait` | Wait for a fixed number of seconds |
| `waitForSelector` | Wait until an element exists |
| `assertText` | Assert visible text matches expected |
| `assert_value` | Assert input value matches expected |
| `select` | Choose from a `<select>` dropdown |
| `get_value` | Read an input's current value |
| `is_element_visible` | Check element visibility |

Full schema: [`src/schema/stepSchema.ts`](src/schema/stepSchema.ts)

---

## 4. Prepare Test Data

Test data is usually supplied through layered files in `config/TestData/`.

Example `config/TestData/domain.myapp.json`:

```json
{
  "defaults": {
    "baseUrl": "https://your-app.example.com",
    "username": "testuser@example.com",
    "password": "SuperSecret123"
  }
}
```

Any key you add here can be referenced in a test step as `{{keyName}}`, for example:

```json
{ "action": "fill", "target": "LoginPage.usernameField", "value": "{{username}}" }
```

The framework performs the substitution at runtime before executing each step. Supply these layers with `--dataCommon`, `--dataDomain`, and `--data`.

---

## 5. Discover Locators

Before running a test for the first time, the framework needs to learn locator expressions for each logical target name (e.g. `LoginPage.usernameField`).

Run discovery with your seed or new test file:

```bash
npm run discover-locators -- --file tests/MyFeature.json
```

What happens:
1. A browser opens and navigates through the test steps.
2. After each step, discovery captures cleaned DOM and snapshot context.
3. For unresolved targets, discovery tries LLM-generated XPath first (when configured) and validates uniqueness.
4. If LLM is unavailable/invalid, discovery falls back to built-in heuristic locator search.
5. Found selectors are written to `config/selectors.json` automatically.
6. Any target that could not be found is listed in the console output — fix those manually.

You only need to run discovery when:
- You create a new test with new target names.
- The application's HTML changes and selectors break (or let self-heal handle those at runtime).

---

## 6. Run a Single Test

```bash
npm run run-test -- --file tests/MyFeature.json
```

Optional flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--selfHeal` | `true` | Try to re-discover broken selectors mid-run |
| `--data` | none | Scenario-level data file |
| `--dataCommon` | none | Common/base data file |
| `--dataDomain` | none | Domain data file or CSV list |
| `--output` | auto | Where screenshots and logs go |

Optional environment for local LLM healing:

```bash
ollama serve
ollama pull llama3.1
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set OLLAMA_MODEL=llama3.1
```

Example with explicit flags:

```bash
npm run run-test -- --file tests/MyFeature.json --selfHeal true --dataCommon config/TestData/common.json --dataDomain config/TestData/domain.myapp.json --data config/TestData/testdata.myfeature.json
```

---

## 7. Review Outputs

After a test run:

| Output | Location |
|--------|----------|
| Execution log | `artifacts/<runId>/execution.log` |
| HTML report | `artifacts/<runId>/report-email.html` |
| Text report | `artifacts/<runId>/report-email.txt` |
| Screenshots | `artifacts/<runId>/` |
| Healed selectors | `config/selectors.json` (updated in place) |

Locator file writes are atomic to prevent partial/corrupted updates.

The current GUI is focused on metadata/data editing and does not have an Artifacts tab. Review run outputs directly under `artifacts/<runId>/`.

---

## 8. Build a Regression Suite

A suite is a JSON file that lists which tests to run together.

Example `tests/regression.suite.json`:

```json
{
  "name": "Nightly Regression",
  "testcases": [
    { "id": "tc01", "file": "tests/TC01.json", "tags": ["smoke", "regression"] },
    { "id": "tc02", "file": "tests/TC02.json", "tags": ["regression"] },
    { "id": "my-feature", "file": "tests/MyFeature.json", "tags": ["smoke", "regression"] }
  ]
}
```

Run the whole suite:

```bash
npm run run-suite -- --suite tests/regression.suite.json
```

Run only tests tagged `smoke`:

```bash
npm run run-suite -- --suite tests/regression.suite.json --tags smoke
```

---

## 9. Parallel Execution

Speed up long suites by running tests in parallel:

```bash
npm run run-suite -- --suite tests/regression.suite.json --workers 4
```

> **Note:** Self-heal is automatically disabled when `--workers` is greater than 1 to prevent concurrent writes to `selectors.json`. Run discover-locators beforehand if you plan to use parallel execution.

Recommended values:
- `--workers 1` — safe default, enables self-heal
- `--workers 2-4` — good balance for most machines
- `--workers > 4` — only if your machine has enough CPU/RAM

---

## 10. Daily Workflow

```
1. Pull latest code  →  git pull

2. Write / update tests in tests/*.json and maintain data/metadata through the GUI when needed

3. Discover new locators  →  npm run discover-locators -- --file tests/NewTest.json

4. Smoke check  →  npm run run-suite -- --suite tests/suite.json --tags smoke

5. Full regression (optional) → npm run run-suite -- --suite tests/suite.json --workers 3

6. Review artifacts  →  open artifacts/<runId>/report-email.html (or execution.log/screenshots)

7. Commit updated selectors.json and any new test JSONs
```

---

## 11. Troubleshooting Checklist

| Symptom | Fix |
|---------|-----|
| `Cannot find selector for target "X"` | Run `npm run discover-locators` for the test; discovery will try LLM first (if configured) and then heuristic fallback |
| Test fails immediately with a navigation error | Check the resolved `baseUrl` in your `config/TestData/*.json` files and confirm the app is running |
| Screenshots are blank / all white | The page may still be loading; add a `waitFor` step before the screenshot |
| `selfHeal` did not fix a broken selector | Re-run `discover-locators` (LLM-first + heuristic fallback); if still unresolved, update locator manually |
| Parallel run is slower than serial | Browser subprocesses compete for CPU; reduce `--workers` |
| `tsc` errors after editing source files | Run `npm run build` and read the TypeScript error — most are type mismatches |
| GUI not opening | Check the port: `http://localhost:4317`; kill any process holding port 4317 |
| `{{placeholder}}` not substituted | Key is missing from the resolved `config/TestData/*.json` layers — add the key/value pair |

---

*For architecture details see [ARCHITECTURE.md](ARCHITECTURE.md). For advanced CLI usage see [DEVELOPMENT.md](DEVELOPMENT.md).*
