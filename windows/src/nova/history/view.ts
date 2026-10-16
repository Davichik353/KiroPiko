import { h, clear } from "../../views/dom";
import { State } from "../../core/state";
import { History } from "./store";
import { panel } from "../panel";
import type { ViewActions, ViewHost } from "../../views/views";
const labels: Record<string, string> = { working: "Работает", thinking: "Думает", searching: "Поиск", approval: "Нужно разрешение", question: "Вопрос", error: "Ошибка", finished: "Завершено", ratelimit: "Лимит", idle: "Ожидание", sleeping: "Отдых" };
export function observeHistory() {
  History.load();
  const seen = new Map(State.tasks.filter(t => !t.isIntegration).map(t => [t.id, t.state]));
  State.subscribe(() => {
    const present = new Set<string>();
    for (const task of State.tasks) {
      if (task.isIntegration) continue;
      present.add(task.id);
      if (seen.get(task.id) !== task.state) History.add(task.id, task.name, task.state);
      seen.set(task.id, task.state);
    }
    for (const id of seen.keys()) if (!present.has(id)) seen.delete(id);
  });
}
export function buildHistory(actions: ViewActions): ViewHost {
  const list = h("div", { class: "nova-session-list" });
  const confirm = h("button", { class: "btn secondary", text: "Очистить историю" });
  let armed = false;
  let rendered: HistoryEntryList | null = null;
  type HistoryEntryList = typeof History.entries;
  const render = () => {
    clear(list);
    if (!History.entries.length) list.append(h("p", { class: "nova-empty", text: "Пока событий нет. История появится после событий рабочих сессий агента." }));
    for (const entry of History.entries) {
      const live = State.tasks.some(t => t.id === entry.taskId);
      const row = h("button", { class: "nova-session", disabled: !live },
        h("strong", { text: `${entry.name} · ${labels[entry.state] ?? entry.state}` }),
        h("small", { text: `${new Date(entry.at).toLocaleString()}${live ? " · открыть сессию" : " · сессия закрыта"}` }));
      row.onclick = () => { if (State.tasks.some(t => t.id === entry.taskId)) { actions.setFocus(entry.taskId); actions.setView("developer"); } };
      list.append(row);
    }
    rendered = History.entries;
  };
  confirm.onclick = () => {
    if (!armed) { armed = true; confirm.textContent = "Подтвердить очистку"; return; }
    History.clear(); armed = false; confirm.textContent = "Очистить историю"; render();
  };
  render();
  return { el: panel("История", "ПОСЛЕДНИЕ 200 СОБЫТИЙ", h("div", {},
    h("p", { class: "nova-status", text: "Локально хранятся время, имя и состояние задачи. Текст команд и разговоров не сохраняется." }), confirm, list)), sync() { if (rendered !== History.entries) render(); } };
}
