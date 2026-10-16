import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHistory } from "../src/nova/history/store.ts";
import { doctorReport } from "../src/nova/doctor/report.ts";
test("history survives corrupt storage and rejects invalid events", () => {
  assert.deepEqual(parseHistory("broken"), []);
  assert.deepEqual(parseHistory('{"entries":[]}'), []);
  const entry = { id: "1", at: "2026-10-14T00:00:00Z", taskId: "codex", name: "Codex", state: "finished" };
  assert.equal(parseHistory(JSON.stringify([entry, { ...entry, at: "bad" }, { ...entry, state: "unknown" }])).length, 1);
  assert.equal(parseHistory(JSON.stringify(Array(250).fill(entry))).length, 200);
});
test("doctor report preserves unavailable readings and diagnostic limitations", () => {
  const text = doctorReport({ capturedAt: "2026-10-14T00:00:00Z", os: "Windows", cpuPercent: null, memoryTotalBytes: 16 * 1024 ** 3, memoryFreeBytes: 1024 ** 3, disks: [{ name: "C:", totalBytes: 100, freeBytes: 5 }], networkConnected: null });
  assert.ok(text.includes("CPU: недоступно"));
  assert.ok(text.includes("Сеть: недоступно"));
  assert.ok(text.includes("менее 10%"));
  assert.ok(text.includes("Доступность интернета не проверялась"));
  assert.ok(text.includes("Системные настройки не изменялись"));
});
