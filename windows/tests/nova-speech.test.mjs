import { test } from "node:test";
import assert from "node:assert/strict";
import { Speech } from "../src/nova/voice/speech.ts";
import { State } from "../src/core/state.ts";
import { interactionMode } from "../src/nova/character/state.ts";

test("four modes preserve listening and thinking priority", () => {
  assert.equal(interactionMode(false, false, false), "rest");
  assert.equal(interactionMode(true, true, true), "listening");
  assert.equal(interactionMode(false, true, true), "thinking");
  assert.equal(interactionMode(false, false, true), "speaking");
});

test("speech refuses cloud voices and ignores completion of a cancelled answer", () => {
  const previousSynth = window.speechSynthesis;
  const previousUtterance = globalThis.SpeechSynthesisUtterance;
  let spoken;
  let voices = [{ lang: "ru-RU", localService: false }];
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  window.speechSynthesis = { cancel() {}, getVoices: () => voices, speak: utterance => { spoken = utterance; } };
  try {
    assert.throws(() => Speech.speak("Привет"), /локального голоса/);
    assert.equal(spoken, undefined);
    voices = [{ lang: "ru-RU", localService: true }];
    Speech.speak("Первый ответ");
    const first = spoken;
    first.onstart();
    assert.equal(State.novaSpeaking, true);
    Speech.stop();
    assert.equal(State.novaSpeaking, false);
    Speech.speak("Второй ответ");
    spoken.onstart();
    first.onend();
    assert.equal(State.novaSpeaking, true);
    spoken.onend();
    assert.equal(State.novaSpeaking, false);
  } finally {
    Speech.stop();
    window.speechSynthesis = previousSynth;
    if (previousUtterance === undefined) delete globalThis.SpeechSynthesisUtterance;
    else globalThis.SpeechSynthesisUtterance = previousUtterance;
  }
});
