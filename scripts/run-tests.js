require("ts-node/register/transpile-only");

const assert = require("node:assert/strict");

const { StepExecutor } = require("../src/executor/executor");
const { Logger } = require("../src/utils/logger");
const { applyDataTemplateToStep } = require("../src/data/template");
const { parseServerCommand } = require("../src/executor/mcpClient");

class FakeClient {
  constructor() {
    this.waitCalls = [];
    this.existsResponses = [];
  }

  async waitFor(text, time) {
    this.waitCalls.push({ text, time });
    return { content: [{ type: "text", text: "ok" }] };
  }

  async elementExists() {
    const next = this.existsResponses.shift();
    return { content: [{ type: "text", text: String(next ?? false) }] };
  }

  async click() {
    return { content: [{ type: "text", text: "clicked" }] };
  }
}

async function testWaitActionUsesExplicitTime() {
  const client = new FakeClient();
  const logger = new Logger("artifacts/test-logs");
  const executor = new StepExecutor(client, logger, {}, "artifacts/test-logs", {
    selfHeal: false,
  });

  const result = await executor.execute({
    id: "step-1",
    action: "wait",
    target: "2",
    time: 2,
  });

  assert.equal(result.success, true);
  assert.deepEqual(client.waitCalls[0], { text: undefined, time: 2 });
}

async function testWaitForSelectorPollsUntilFound() {
  const client = new FakeClient();
  client.existsResponses = [false, true];
  const logger = new Logger("artifacts/test-logs");
  const executor = new StepExecutor(client, logger, { loginButton: "#login" }, "artifacts/test-logs", {
    selfHeal: false,
  });

  const result = await executor.execute({
    id: "step-2",
    action: "waitForSelector",
    target: "loginButton",
    time: 3,
  });

  assert.equal(result.success, true);
  assert.equal(client.waitCalls.length, 1);
}

function testStrictTemplateFailure() {
  assert.throws(
    () =>
      applyDataTemplateToStep(
        {
          id: "step-3",
          action: "navigate",
          target: "{{missingUrl}}",
        },
        {},
        { strictMissing: true }
      ),
    /Missing data placeholders/
  );
}

function testParseServerCommandHandlesQuotedPaths() {
  const parsed = parseServerCommand('node "C:/Program Files/app/server.js" --port 4317');
  assert.equal(parsed.command, "node");
  assert.deepEqual(parsed.args, ["C:/Program Files/app/server.js", "--port", "4317"]);
}

async function main() {
  await testWaitActionUsesExplicitTime();
  await testWaitForSelectorPollsUntilFound();
  testStrictTemplateFailure();
  testParseServerCommandHandlesQuotedPaths();
  console.log("Framework regression tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});