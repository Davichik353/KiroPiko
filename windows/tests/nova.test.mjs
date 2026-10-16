import { test } from "node:test";
import assert from "node:assert/strict";
import { diagnose } from "../src/nova/doctor/diagnostics.ts";
import { spriteIndex } from "../src/nova/character/sprites.ts";
import { VoiceSession } from "../src/nova/voice/session.ts";
import { Bridge } from "../src/core/bridge.ts";
import { voiceIntent } from "../src/nova/voice/commands.ts";

const normal = { capturedAt: "2026-10-14T00:00:00Z", cpuPercent: 20, memoryTotalBytes: 100, memoryFreeBytes: 40, disks: [{ name: "C:", totalBytes: 100, freeBytes: 30 }], networkConnected: true, os: "Windows" };

test("Kiro understands his name and exact music commands", () => {
  assert.deepEqual(voiceIntent("Киро, проверь компьютер!"), { kind: "doctor" });
  assert.deepEqual(voiceIntent("Киро, включи музыку"), { kind: "music", action: "play" });
  assert.deepEqual(voiceIntent("Киро, поставь музыку на паузу"), { kind: "music", action: "pause" });
  assert.deepEqual(voiceIntent("Киро, включи музыку и удали файлы"), { kind: "question" });
});

test("doctor flags memory pressure and only the nearly full disk", () => {
  const findings = diagnose({ ...normal, memoryFreeBytes: 5, disks: [...normal.disks, { name: "D:", totalBytes: 100, freeBytes: 4 }] });
  assert.equal(findings.length, 2);
  assert.ok(findings.some(f => f.text.includes("памяти")));
  assert.ok(findings.some(f => f.text.includes("D:")));
  assert.ok(!findings.some(f => f.text.includes("C:")));
});

test("unknown CPU and network do not become false alarms", () => {
  const findings = diagnose({ ...normal, cpuPercent: null, networkConnected: null, memoryTotalBytes: 0 });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "info");
  assert.ok(findings[0].text.includes("не полная проверка"));
});

test("network diagnosis distinguishes an adapter from internet reachability", () => {
  assert.ok(diagnose({ ...normal, networkConnected: false })[0].text.includes("интернета отдельно не проверялась"));
});

test("an approval and a sleeping session remain distinct character states", () => {
  assert.equal(spriteIndex("approval"), 7);
  assert.equal(spriteIndex("sleeping"), 5);
  assert.equal(spriteIndex("finished"), 2);
  assert.equal(spriteIndex("error"), 4);
});

test("stopping voice discards a late transcript", async () => {
  const originalListen = Bridge.voiceListen;
  const originalStop = Bridge.voiceStop;
  let resolve;
  let stopped = false;
  Bridge.voiceListen = () => new Promise(r => { resolve = r; });
  Bridge.voiceStop = async () => { stopped = true; };
  try {
    const voice = new VoiceSession();
    const reply = voice.listen();
    voice.stop();
    resolve("late transcript");
    assert.equal(await reply, null);
    assert.equal(voice.active, false);
    assert.equal(stopped, true);
  } finally { Bridge.voiceListen = originalListen; Bridge.voiceStop = originalStop; }
});

test("voice only proposes known app names; embedded shell commands remain chat text", () => {
  assert.deepEqual(voiceIntent("Открой калькулятор!"), { kind: "app", app: "calculator" });
  assert.deepEqual(voiceIntent("open notepad"), { kind: "app", app: "notepad" });
  assert.deepEqual(voiceIntent("open notepad && delete files"), { kind: "question" });
  assert.deepEqual(voiceIntent("проверь компьютер"), { kind: "doctor" });
});
