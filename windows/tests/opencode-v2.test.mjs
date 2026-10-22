import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function loadPlugin() {
  const rust = readFileSync(new URL("../src-tauri/src/agents.rs", import.meta.url), "utf8");
  let source = rust.match(/const OPENCODE_PLUGIN: &str = r#"([\s\S]*?)"#;/)[1];
  source = source.replace("import { spawn } from 'node:child_process';", `
    export const messages = [];
    const spawn = () => ({ on() {}, unref() {}, stdin: {
      on() {}, end(text) { messages.push(JSON.parse(text)); }
    } });`);
  source = source.replace("{HOOK}", "'test-hook'");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Math.random()}`);
}

test("OpenCode v1 events and tools still reach the relay", async () => {
  const plugin = await loadPlugin();
  const hooks = await plugin.CoucouPlugin({ directory: "project" });
  await hooks.event({ event: { type: "session.created", properties: { sessionID: "s1" } } });
  await hooks["tool.execute.before"]({ sessionID: "s1", tool: "read" }, { args: { file: "a" } });
  assert.deepEqual(plugin.messages.map(m => m.hook_event_name), ["SessionStart", "PreToolUse"]);
  assert.equal(plugin.messages[1].cwd, "project");
  assert.deepEqual(plugin.messages[1].tool_input, { file: "a" });
});

test("OpenCode v2 subscribes to sessions and both tool phases", async () => {
  const plugin = await loadPlugin();
  const registered = new Map();
  const hooks = await plugin.default.setup({ directory: "project", tool: {
    hook(name, callback) { registered.set(name, callback); }
  }, event: { async *subscribe() {
    yield { type: "unknown" };
    yield { type: "session.error", sessionID: "s2" };
  } } });
  await registered.get("execute.before")({ sessionID: "s2", tool: "read", input: { file: "b" } }, {});
  await registered.get("execute.after")({ sessionID: "s2", tool: "read" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof hooks.event, "function");
  assert.equal(plugin.default.id, "coucou");
  assert.equal(plugin.messages.find(m => m.hook_event_name === "StopFailure").session_id, "s2");
  assert.deepEqual(plugin.messages.find(m => m.hook_event_name === "PreToolUse").tool_input, { file: "b" });
  assert.ok(plugin.messages.some(m => m.hook_event_name === "PostToolUse"));
});

test("OpenCode v2 accepts an empty context", async () => {
  const plugin = await loadPlugin();
  const hooks = await plugin.default.setup();
  await hooks.event({ event: undefined });
  assert.deepEqual(plugin.messages, []);
});
