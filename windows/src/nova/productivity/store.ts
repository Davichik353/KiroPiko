import { State } from "../../core/state";
import { u } from "../../i18n/kiro";
import { showNotice } from "../preview";
import { cleanTools, collectDue, countdown, type ToolData } from "./model";
const KEY = "kiropiko.productivity.v1";
let data: ToolData = cleanTools(null);
let initialized = false;
export function tools() { return data; }
export function saveTools() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch { showNotice(u("Не удалось сохранить таймер и напоминания. Они останутся только до закрытия приложения.")); }
  State.notify();
}
export function initTools() {
  if (initialized) return;
  initialized = true;
  try { data = cleanTools(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { data = cleanTools(null); }
  const check = () => {
    const due = collectDue(data, Date.now(), u("Фокус завершён. Можно немного отдохнуть."));
    if (due.length) {
      saveTools();
      if (!State.novaQuietActive) showNotice(due.length === 1 ? due[0] : u("Сработало напоминаний: {count}. Подробности — в быстрых действиях.", {count:due.length}));
    }
    if (data.focus.end !== null) State.notify();
  };
  check();
  const timer = window.setInterval(check, 1000);
  window.addEventListener("beforeunload", () => clearInterval(timer), { once: true });
}
export function focusText() {
  return data.focus.end !== null ? countdown(data.focus.end - Date.now())
    : data.focus.remaining > 0 ? `${countdown(data.focus.remaining)} Ⅱ` : data.focus.done ? "✓" : "";
}
