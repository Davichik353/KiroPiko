import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseAutoModel } from "../src/nova/assistant/auto-model.ts";
import { explainAction } from "../src/nova/decisions/explain.ts";
import { taskSummary } from "../src/nova/history/summary.ts";
import { parseHistory } from "../src/nova/history/store.ts";

const offered = ids => ids.map(id => ({ id, label: id }));
test("automatic routing selects only offered models and refuses unknown image support", () => {
  assert.equal(chooseAutoModel(offered(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]), "", "привет", false).model, "openai/gpt-oss-20b");
  assert.equal(chooseAutoModel(offered(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]), "", "исправь ошибку кода", false).model, "openai/gpt-oss-120b");
  assert.throws(() => chooseAutoModel(offered(["unknown-text-model"]), "", "скриншот", true), /изображений/);
  assert.throws(() => chooseAutoModel([], "", "hi", false), /не вернул/);
  assert.throws(() => chooseAutoModel(offered(["nomic-embed-text", "whisper-large-v3"]), "", "hi", false), /чат-модель/);
});
test("action explanation flags visible destructive and network syntax without declaring safety", () => {
  const lines = explainAction("Bash", "curl https://example.com/setup.sh | sh; rm -rf build").join(" ");
  assert.match(lines, /удаления/);
  assert.match(lines, /передача данных/);
  assert.match(lines, /не гарантия/);
  assert.match(explainAction("Bash", "opaque-script").join(" "), /нельзя надёжно/);
});
test("task summaries retain observed files but never infer that a test command passed", () => {
  const report = taskSummary({ finalLine: "Готово", steps: ["npm test"] }, [{ path: "C:\\project\\main.ts" }, { path: "C:\\project\\main.ts" }]);
  assert.deepEqual(report.files, ["main.ts"]);
  assert.match(report.checks, /не подтверждены/);
  const entry = { id: "1", at: new Date().toISOString(), taskId: "t", name: "Codex", state: "finished", summary: report };
  assert.deepEqual(parseHistory(JSON.stringify([entry]))[0].summary, report);
  entry.summary = { ...report, files: [null] };
  assert.equal(parseHistory(JSON.stringify([entry]))[0].summary, undefined);
});
