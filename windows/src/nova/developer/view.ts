import { h, clear } from "../../views/dom";
import { State } from "../../core/state";
import type { ViewActions, ViewHost } from "../../views/views";
import { panel } from "../panel";
export function buildDeveloper(actions: ViewActions): ViewHost {
  const list = h("div", { class: "nova-session-list" });
  const states: Record<string, string> = { idle: "Ожидает", working: "Работает", thinking: "Думает", searching: "Ищет", approval: "Нужно разрешение", question: "Есть вопрос", error: "Ошибка", finished: "Завершено", sleeping: "Отдыхает" };
  return { el: panel("Developer Mode", "CODEX · CLAUDE CODE · ДРУГИЕ АГЕНТЫ", list), sync() {
    clear(list);
    const sessions = State.tasks.filter(task => !task.isIntegration);
    if (!sessions.length) list.append(h("p", { class: "nova-empty", text: "Пока нет сессий. Подключите агента в настройках — его действия и запросы появятся здесь." }),
      h("button", { class: "btn secondary", text: "Настроить агентов", onclick: () => actions.openSettingsWindow() }));
    for (const task of sessions) {
      const row = h("button", { class: "nova-session", onclick: () => { actions.setFocus(task.id); actions.setView(State.pendingApproval?.pillId === task.id ? State.pendingApproval.questions ? "question" : "approval" : "overview"); } },
        h("span", { class: "nova-session-title" }, h("strong", { text: task.name }), h("small", { text: states[task.state] ?? task.state })),
        h("span", { class: "nova-session-step", text: task.finalLine || task.steps.at(-1) || "Ожидаю события агента" }),
        h("small", { text: `${task.steps.length} событий в текущей сессии` }));
      list.append(row);
    }
  } };
}
