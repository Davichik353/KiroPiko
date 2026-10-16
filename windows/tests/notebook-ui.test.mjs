import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { installFakeDom } from "./fakedom.mjs";
import { internals, calls, sent } from "./tauri.mjs";
registerHooks({
  resolve(s, c, next) { return s.endsWith(".css") ? { url: new URL(s, c.parentURL).href, shortCircuit: true } : next(s, c); },
  load(u, c, next) { return u.endsWith(".css") ? { format: "module", source: "export {};", shortCircuit: true } : next(u, c); },
});
const dom = installFakeDom();
const root = dom.root();
document.getElementById = () => root;
document.addEventListener = () => {};
window.setInterval = () => 0;
let book = { dictionary: { words: [], replacements: [], snippets: [] }, notes: [] };
internals.invoke = async (cmd, args) => {
  calls.push([cmd, args]);
  if (cmd === "notebook_read") return structuredClone(book);
  if (cmd === "boot") return { settings: { chatProvider: "groq" } };
  if (cmd === "notebook_save") {
    const n = { ...args, id: "n1", summary: "", revision: 1, updatedAt: 1, status: "ready", error: "" };
    book.notes = [n]; return structuredClone(n);
  }
  if (cmd === "notebook_summary") { book.notes[0].summary = "Итог"; book.notes[0].revision++; return structuredClone(book.notes[0]); }
  return null;
};
const flush = () => new Promise(r => setTimeout(r, 0));
const button = text => root.find("BUTTON").find(b => b.textContent === text);
test("notebook never starts a microphone or sends saved text without explicit confirmation", async () => {
  await import("../src/notebook/main.ts"); await flush();
  assert.equal(sent("notebook_start").length, 0);
  assert.equal(sent("notebook_summary").length, 0);
  button("Начать расшифровку микрофона").fire("click"); await flush();
  assert.equal(sent("notebook_start").length, 0);
  assert.match(root.querySelector(".notice").textContent, /участники уведомлены/);
  const title = root.find("INPUT").find(e => e.getAttribute("aria-label") === "Название заметки");
  const text = root.find("TEXTAREA")[0];
  title.value = "План"; title.oninput(); text.value = "Отправить прототип завтра"; text.oninput();
  button("Подготовить итог AI").fire("click"); await flush();
  assert.equal(sent("notebook_summary").length, 0);
  button("Сохранить").fire("click"); await flush();
  assert.equal(sent("notebook_save")[0].text, "Отправить прототип завтра");
  button("Подготовить итог AI").fire("click"); await flush();
  assert.match(root.querySelector(".cloud-confirm").textContent, /groq/);
  assert.equal(sent("notebook_summary").length, 0);
  button("Отправить текст и получить итог").fire("click"); await flush();
  assert.deepEqual(sent("notebook_summary"), [{ id: "n1", revision: 1 }]);
  assert.match(root.querySelector(".summary").textContent, /Итог/);
});
