import "./notebook.css";
import "../ui/product.css";
import { invoke } from "@tauri-apps/api/core";
import { IS_TAURI, Bridge } from "../core/bridge";
import { h, clear } from "../views/dom";
import { parseDictionary, noteMarkdown, type Note, type Notebook } from "./model";

const root = document.getElementById("notebook-root")!;
let book: Notebook = { dictionary: { words: [], replacements: [], snippets: [] }, notes: [] };
let current: Note | null = null;
let dirty = false, dictionaryDirty = false, busy = false, page = "notes", polling = false;
let providerLabel = "выбранной модели";
const notice = h("p", { class: "notice", role: "status", "aria-live": "polite" });
const list = h("nav", { class: "note-list", "aria-label": "Заметки" });
const content = h("main");
const title = h("input", { "aria-label": "Название заметки", placeholder: "Название заметки", maxlength: 100 });
const text = h("textarea", { "aria-label": "Текст заметки", placeholder: "Запишите мысль или вставьте готовую расшифровку…", class: "transcript" });
const summary = h("section", { class: "summary", "aria-label": "Итог AI" });
const detail = h("p", { class: "muted" });
const consent = h("input", { type: "checkbox" });
const cloudConfirm = h("div", { class: "cloud-confirm" });
const editorButtons: HTMLButtonElement[] = [];
const btn = (label: string, action: () => void | Promise<void>, cls = "") => h("button", { text: label, class: cls, onclick: () => void run(action) });
async function run(action: () => void | Promise<void>) {
  if (busy) return;
  busy = true; refreshControls(); notice.textContent = "";
  try { await action(); } catch (e) { notice.textContent = String(e).replace(/^Error:\s*/, ""); }
  finally { busy = false; refreshControls(); }
}
function refreshControls() {
  const recording = book.notes.some(n => n.status === "recording");
  for (const b of editorButtons) b.disabled = busy || recording;
  title.disabled = recording; text.disabled = recording;
  start.disabled = busy || recording;
  stop.disabled = busy || !recording;
}
function mayLeave() {
  if (!dirty && !dictionaryDirty) return true;
  if (!window.confirm("Есть несохранённые изменения. Перейти без сохранения?")) return false;
  dirty = dictionaryDirty = false;
  title.value = current?.title ?? ""; text.value = current?.text ?? "";
  return true;
}
function select(n: Note | null) {
  current = n; dirty = false; title.value = n?.title ?? ""; text.value = n?.text ?? "";
  renderSummary(); renderList();
}
function renderSummary() {
  clear(summary); clear(cloudConfirm);
  if (current?.summary) summary.append(h("h2", { text: "Итог AI" }), h("p", { class: "muted", text: "Проверьте факты, имена и сроки перед использованием." }), h("pre", { text: current.summary }));
  const status = current?.status === "recording" ? "● Микрофон включён · расшифровываю локально" : current?.status === "failed" || current?.status === "interrupted" ? current.error : current ? `Сохранено ${new Date(current.updatedAt).toLocaleString("ru-RU")}` : "Новая заметка · сохраняется только после нажатия «Сохранить»";
  detail.textContent = status + (current?.language ? ` · Язык распознавания Windows: ${current.language}${current.language.startsWith("ru") ? "" : ". Русская речь этим движком может не распознаваться."}` : "");
}
function renderList() {
  clear(list);
  for (const n of [...book.notes].sort((a, b) => b.updatedAt - a.updatedAt)) {
    list.append(btn(`${n.status === "recording" ? "● " : ""}${n.title}`, () => { if (mayLeave()) select(n); }, current?.id === n.id ? "selected" : ""));
  }
  if (!book.notes.length) list.append(h("p", { class: "muted", text: "Здесь будут ваши заметки и расшифровки." }));
}
async function reload() { book = await invoke<Notebook>("notebook_read"); renderList(); }
async function saveNote() {
  current = await invoke<Note>("notebook_save", { id: current?.id ?? "", revision: current?.revision ?? 0, title: title.value, text: text.value });
  dirty = false; await reload(); renderSummary(); notice.textContent = "Заметка сохранена на этом компьютере.";
}
title.oninput = text.oninput = () => { dirty = true; clear(cloudConfirm); };
const save = btn("Сохранить", saveNote, "primary");
const makeSummary = btn("Подготовить итог AI", () => {
  if (!current || dirty) throw new Error("Сначала сохраните текст заметки.");
  clear(cloudConfirm);
  cloudConfirm.append(h("p", { text: `Весь сохранённый текст (${current.text.length} знаков) будет передан ${providerLabel}. Возможна оплата по тарифу провайдера. Отправить?` }), btn("Отправить текст и получить итог", async () => {
    if (!current) return;
    current = await invoke<Note>("notebook_summary", { id: current.id, revision: current.revision });
    await reload(); renderSummary();
  }, "primary"), btn("Отмена", () => clear(cloudConfirm)));
});
const copy = btn("Скопировать Markdown", async () => {
  if (!current || dirty) throw new Error("Сначала сохраните заметку.");
  await navigator.clipboard.writeText(noteMarkdown(current)); notice.textContent = "Markdown скопирован.";
});
const remove = btn("Удалить", async () => {
  if (!current || !window.confirm(`Удалить заметку «${current.title}» с этого компьютера?`)) return;
  await invoke("notebook_delete", { id: current.id, revision: current.revision }); select(null); await reload();
}, "danger");
editorButtons.push(save, makeSummary, copy, remove);
const start = btn("Начать расшифровку микрофона", async () => {
  if (!mayLeave()) return;
  if (!consent.checked) throw new Error("Перед началом подтвердите, что участники уведомлены.");
  const n = await invoke<Note>("notebook_start"); await reload(); select(n); refreshControls();
});
const stop = btn("Остановить микрофон", async () => {
  await invoke("notebook_stop"); notice.textContent = "Останавливаю микрофон… Подождите завершения текущей фразы.";
}, "stop");
const recordingPanel = h("section", { class: "recording" }, h("h2", { text: "Расшифровка встречи" }),
  h("p", { class: "muted", text: "Windows распознаёт только выбранный в системе микрофон. Звук собеседников из наушников не захватывается; разделения по спикерам нет. Нужен установленный речевой пакет Windows. Аудиофайл не сохраняется. Лимит — 30 минут." }),
  h("label", { class: "consent" }, consent, "Участники уведомлены, я могу включить микрофон"), h("div", { class: "actions" }, start, stop));
function notesPage() {
  page = "notes"; clear(content); content.append(h("div", { class: "notes-layout" }, list,
    h("div", { class: "editor" }, recordingPanel, title, detail, text, h("div", { class: "actions" }, save, makeSummary, copy, remove), cloudConfirm, summary)));
  renderList(); refreshControls();
}
function dictionaryPage() {
  page = "dictionary"; clear(content);
  const words = h("textarea", { rows: 4, "aria-label": "Точное написание слов", placeholder: "KiroPiko\nUzCombinator" }); words.value = book.dictionary.words.join("\n");
  const replacements = h("textarea", { rows: 5, "aria-label": "Замены фраз", placeholder: "киро пико => KiroPiko" }); replacements.value = book.dictionary.replacements.map(r => `${r.from} => ${r.to}`).join("\n");
  const snippets = h("textarea", { rows: 4, "aria-label": "Голосовые шаблоны", placeholder: "моя подпись => С уважением,\\nДавлат" }); snippets.value = book.dictionary.snippets.map(s => `${s.trigger} => ${s.text.replace(/\n/g, "\\n")}`).join("\n");
  const testInput = h("input", { "aria-label": "Проверочная фраза", placeholder: "Произнесённая фраза для проверки" });
  const preview = h("pre", { class: "preview", role: "status" });
  const read = () => parseDictionary(words.value, replacements.value, snippets.value);
  words.oninput = replacements.oninput = snippets.oninput = () => { dictionaryDirty = true; };
  content.append(h("section", { class: "dictionary" }, h("h1", { text: "Словарь диктовки" }),
    h("p", { class: "muted", text: "Правила применяются локально после распознавания: в голосовом вводе KiroPiko и расшифровках микрофона. Они не обучают речевой движок. На каждой строке — одно слово или правило. Для названий с символами, например C++ и Next.js, используйте замены." }),
    h("label", {}, "Точное написание имён и терминов", words), h("label", {}, "Замены: фраза => правильное написание", replacements),
    h("label", {}, "Шаблоны: фраза => полный текст (\\n — новая строка)", snippets),
    h("div", { class: "actions" }, btn("Сохранить словарь", async () => { await invoke("notebook_dictionary", { dictionary: read() }); dictionaryDirty = false; await reload(); notice.textContent = "Словарь сохранён."; }, "primary")),
    h("h2", { text: "Проверить правило" }), testInput, btn("Показать результат", async () => { preview.textContent = await invoke<string>("notebook_preview", { dictionary: read(), text: testInput.value }); }), preview));
}
root.append(h("header", {}, h("div", {}, h("span", { class: "brand", text: "KiroPiko" }), h("p", { class: "muted", text: "Заметки остаются на компьютере. AI вызывается только по вашей кнопке." })),
  h("div", { class: "actions" }, btn("Заметки", () => { if (mayLeave()) notesPage(); }), btn("Словарь", () => { if (mayLeave()) dictionaryPage(); }), btn("+ Заметка", () => { if (mayLeave()) { select(null); notesPage(); title.focus(); } }))), notice, content);
notesPage();
if (!IS_TAURI) {
  notice.textContent = "Предпросмотр. Заметки, микрофон и сохранение доступны в установленном KiroPiko для Windows.";
} else {
  void run(async () => {
    await reload();
    const boot = await Bridge.boot();
    if (boot) providerLabel = `провайдеру ${boot.settings.chatProvider || "anthropic"} (модель из настроек)`;
  });
  // No polling while the window is hidden; only active recordings need refresh.
  window.setInterval(() => {
    if (document.hidden || busy || polling || !book.notes.some(n => n.status === "recording")) return;
    polling = true;
    void reload().then(() => {
      const latest = book.notes.find(n => n.id === current?.id);
      if (latest && !dirty) { current = latest; text.value = latest.text; renderSummary(); }
      refreshControls();
    }).catch(e => { notice.textContent = String(e); }).finally(() => { polling = false; });
  }, 1500);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !busy) void run(async () => { await reload(); if (page === "notes" && current && !dirty) select(book.notes.find(n => n.id === current?.id) ?? null); refreshControls(); }); });
}
