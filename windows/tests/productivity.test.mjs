import test from "node:test";
import assert from "node:assert/strict";
import { agentCounts, cleanTools, collectDue, countdown } from "../src/nova/productivity/model.ts";

test("saved reminders are bounded and invalid data is ignored", () => {
  assert.deepEqual(cleanTools(null), { reminders: [], focus: { end: null, remaining: 0, done: false, duration: 25 } });
  const data = cleanTools({ reminders: [{ id: "bad", text: "", due: 1 }, ...Array.from({ length: 30 }, (_, i) => ({ id: String(i), text: "x".repeat(200), due: 100 }))], focus: { remaining: -1, end: Infinity } });
  assert.equal(data.reminders.length, 20);
  assert.equal(data.reminders[0].text.length, 180);
  assert.deepEqual(data.focus, { end: null, remaining: 0, done: false, duration: 25 });
});
test("focus duration survives restart, pause and completion", () => {
  const data = cleanTools(JSON.parse(JSON.stringify({focus:{end:900000,remaining:0,done:false,duration:15}})));
  assert.equal(data.focus.duration, 15);
  const paused = cleanTools({focus:{...data.focus,end:null,remaining:700000}});
  assert.equal(paused.focus.duration, 15);
  collectDue(data, 900001);
  assert.equal(data.focus.duration, 15);
  assert.equal(data.focus.done, true);
});
test("legacy active sessions never guess a duration", () => {
  assert.equal(cleanTools({focus:{end:900000}}).focus.duration, null);
  assert.equal(cleanTools({focus:{remaining:100000}}).focus.duration, null);
  assert.equal(cleanTools({focus:{duration:999}}).focus.duration, 25);
});
test("overdue reminders and focus complete once after sleep or restart", () => {
  const data = cleanTools({ reminders: [{ id: "1", text: "Перерыв", due: 1000 }], focus: { end: 2000, remaining: 0 } });
  assert.equal(collectDue(data, 500).length, 0);
  assert.equal(collectDue(data, 5000).length, 2);
  assert.equal(collectDue(data, 6000).length, 0);
  assert.equal(data.reminders[0].done, true);
  assert.equal(data.focus.done, true);
});
test("paused focus does not complete as wall clock advances", () => {
  const data = cleanTools({ focus: { end: null, remaining: 120000 } });
  assert.deepEqual(collectDue(data, Date.now() + 99999999), []);
  assert.equal(data.focus.remaining, 120000);
});
test("agent badges exclude integrations and idle or completed sessions", () => {
  const tasks = ["working", "thinking", "searching", "approval", "question", "idle", "finished", "error"].map(state => ({ state, isIntegration: false }));
  tasks.push({ state: "working", isIntegration: true });
  assert.deepEqual(agentCounts(tasks), { working: 3, waiting: 2 });
});
test("countdown rounds up and never displays negative time", () => {
  assert.equal(countdown(1500000), "25:00");
  assert.equal(countdown(1), "0:01");
  assert.equal(countdown(-1), "0:00");
});
