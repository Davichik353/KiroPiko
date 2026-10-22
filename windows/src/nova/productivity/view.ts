import { u, ul } from "../../i18n/kiro";
import { language } from "../../i18n/i18n";
import { h, clear } from "../../views/dom";
import { State } from "../../core/state";
import { openSettingsSection } from "../settings-route";
import type { ViewActions, ViewHost } from "../../views/views";
import type { IslandViewName } from "../../core/layout";
import { panel } from "../panel";
import { tools, saveTools } from "./store";
import { countdown, agentCounts } from "./model";

export function buildQuick(actions: ViewActions): ViewHost {
  const query = h("input", { type: "search", placeholder: ul("Найти действие или настройку…"), "aria-label": ul("Поиск действий"), autocomplete: "off" });
  const results = h("div", { class: "quick-results", "aria-label": ul("Результаты поиска") });
  const feedback = h("p", { class: "hint", role: "status" });
  const agentStatus = h("p", { class: "quick-agents" });
  const commands: { label: string; hint: string; run: () => void }[] = [];
  for (const [label, view, hint] of [
    ["Спросить Киро", "prompt", "Чат и AI-помощник"], ["Сессии агентов", "developer", "Работа и ожидающие ответы"],
    ["История", "history", "События и выполненные задачи"], ["Диагностика компьютера", "doctor", "System Doctor"],
    ["Подключения", "connections", "Модели и сервисы"],
  ]) commands.push({ label, hint, run: () => actions.setView(view as IslandViewName) });
  for (const [id, label, hint] of [
    ["capsule", "Капсула и Киро", "Размер, тихий режим, микрофон, снимки экрана"], ["general", "Общие настройки", "Язык, звук, монитор, автозапуск"],
    ["agents", "Настройки агентов", "Хуки и карточки"], ["models", "Чат и модели", "API-ключи и локальный сервер"],
    ["limits", "Лимиты AI", "Остаток запросов, токенов и квоты ключа."],
    ["accounts", "Без API-ключа", "Codex, Cursor и Claude Code через личный аккаунт."],
    ["integrations", "Интеграции", "Подключение сервисов"], ["phone", "Телефон", "Android и QR-код"], ["shortcuts", "Горячие клавиши", "Сочетания клавиш"],
  ]) commands.push({ label, hint, run: () => { void openSettingsSection(id); } });
  commands.push(
    { label: "Таймер фокуса", hint: "Работа, пауза, отдых и Pomodoro", run: () => { clock.scrollIntoView({ block: "center" }); start.focus(); } },
    { label: "Новое напоминание", hint: "Время и уведомление", run: () => { title.scrollIntoView({ block: "center" }); title.focus(); } },
  );
  function search() {
    const words = query.value.trim().toLocaleLowerCase().split(/\s+/);
    const found = commands.filter(c => words.every(word => `${u(c.label)} ${u(c.hint)}`.toLocaleLowerCase().includes(word)));
    clear(results);
    for (const command of found) results.append(h("button", { class: "quick-result", type: "button", onclick: command.run },
      h("strong", { text: ul(command.label) }), h("small", { text: ul(command.hint) })));
    if (!found.length) results.append(h("p", { class: "hint", text: ul("Ничего не найдено. Попробуйте «звук», «модель» или «телефон».") }));
  }
  query.addEventListener("input", search);
  query.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") { event.preventDefault(); results.querySelector("button")?.focus(); }
    if (event.key === "Enter") { event.preventDefault(); results.querySelector("button")?.click(); }
  });
  search();
  const length = h("select", { "aria-label": ul("Длительность фокуса") }, h("option", { value: "", text: ul("Текущая сессия"), hidden: true }), ...[15, 25, 45, 60].map(n => h("option", { value: n, text: u("{n} минут", {n}) })));
  const clock = h("strong", { class: "quick-clock", text: "25:00", "aria-label": ul("Оставшееся время фокуса") });
  const start = h("button", { class: "btn primary", text: ul("Начать") });
  const stop = h("button", { class: "btn secondary", text: ul("Сбросить") });
  start.onclick = () => {
    const f = tools().focus;
    if (f.end !== null) { f.remaining = Math.max(0, f.end - Date.now()); f.end = null; }
    else { if (!f.remaining) f.duration = Number(length.value) || 25; f.end = Date.now() + (f.remaining || (f.duration ?? 25) * 60000); f.remaining = 0; f.done = false; }
    saveTools();
  };
  stop.onclick = () => { tools().focus = { end: null, remaining: 0, done: false, duration: tools().focus.duration ?? 25 }; saveTools(); };
  length.onchange = () => { if (!tools().focus.end && !tools().focus.remaining) { tools().focus.duration = Number(length.value) || 25; tools().focus.done = false; saveTools(); } };
  const title = h("input", { type: "text", maxlength: 180, placeholder: ul("О чём напомнить?"), "aria-label": ul("Текст напоминания"), required: true });
  const when = h("input", { type: "datetime-local", "aria-label": ul("Время напоминания"), required: true });
  const localDate = new Date(Date.now() + 10 * 60000);
  when.value = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  const list = h("div", { class: "quick-reminders" });
  const form = h("form", { class: "quick-reminder-form" }, title, when, h("button", { class: "btn primary", type: "submit", text: ul("Добавить") }));
  form.onsubmit = event => {
    event.preventDefault();
    const due = new Date(when.value).getTime(), text = title.value.trim();
    if (!text || !Number.isFinite(due) || due <= Date.now()) { feedback.textContent = u("Введите текст и выберите время в будущем."); return; }
    if (tools().reminders.length >= 20) { feedback.textContent = u("Можно сохранить 20 напоминаний. Удалите ненужные."); return; }
    tools().reminders.push({ id: crypto.randomUUID(), text, due, done: false });
    title.value = ""; feedback.textContent = u("Напоминание сохранено на этом компьютере."); saveTools();
  };
  let listKey = "", lastLanguage = "";
  function sync() {
    if (lastLanguage !== language()) {
      lastLanguage = language(); search();
      for (const option of length.options) if (option.value) option.textContent = u("{n} минут", {n:option.value});
      listKey = "";
    }
    const data = tools(), f = data.focus, counts = agentCounts(State.tasks);
    length.value = f.duration === null ? "" : String(f.duration);
    agentStatus.textContent = u("Агенты: работают {working} · ждут ответа {waiting}", counts);
    clock.textContent = f.end !== null ? countdown(f.end - Date.now()) : f.done ? u("Готово ✓") : countdown(f.remaining || Number(length.value) * 60000);
    start.textContent = f.end !== null ? u("Пауза") : f.remaining ? u("Продолжить") : u("Начать");
    length.disabled = f.end !== null || f.remaining > 0;
    const key = JSON.stringify(data.reminders);
    if (key === listKey) return;
    listKey = key; clear(list);
    for (const item of [...data.reminders].sort((a,b) => a.due-b.due)) {
      const remove = h("button", { type: "button", class: "link-btn", text: ul("Удалить"), "aria-label": u("Удалить напоминание: {text}", {text:item.text}) });
      remove.onclick = () => { data.reminders = data.reminders.filter(r => r.id !== item.id); saveTools(); };
      list.append(h("div", { class: item.done ? "quick-reminder done" : "quick-reminder" },
        h("span", {}, h("strong", { text: item.text }), h("small", { text: `${item.done ? u("Сработало · ") : ""}${new Date(item.due).toLocaleString()}` })), remove));
    }
    if (!data.reminders.length) list.append(h("p", { class: "hint", text: ul("Напоминаний пока нет.") }));
  }
  const body = h("div", { class: "quick-body" }, query, results, agentStatus,
    h("section", { class: "quick-section" }, h("h3", { text: ul("Фокус") }), h("div", { class: "quick-timer" }, clock, length, start, stop)),
    h("section", { class: "quick-section" }, h("h3", { text: ul("Напоминания") }), form, feedback, list),
    h("p", { class: "hint", text: ul("Таймер и напоминания сохраняются локально. Уведомления работают, пока KiroPiko открыт; пропущенные появятся при следующем запуске. В режиме «Не мешать» они останутся в списке без всплывающего сообщения.") }));
  return { el: panel(ul("Быстрые действия"), "CTRL + SHIFT + K", body), sync, focus: () => query.focus() };
}
