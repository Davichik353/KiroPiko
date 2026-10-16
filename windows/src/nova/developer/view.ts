import { h, clear } from "../../views/dom";
import { State } from "../../core/state";
import type { ViewActions, ViewHost } from "../../views/views";
import { panel } from "../panel";
export function buildDeveloper(actions: ViewActions): ViewHost {
  const list = h("div", { class: "nova-session-list" });
  const waitingSince = new Map<string, number>();
  const ages = new Map<HTMLElement, { since: number; target: string }>();
  let lastTick = 0;
  const states: Record<string, string> = { idle: "Ожидает", working: "Работает", thinking: "Думает", searching: "Ищет", approval: "Нужно разрешение", question: "Есть вопрос", error: "Ошибка", finished: "Завершено", sleeping: "Отдыхает" };
  return { el: panel("Developer Mode", "CODEX · CLAUDE CODE · ДРУГИЕ АГЕНТЫ", list), sync() {
    clear(list);
    ages.clear();
    const sessions = State.tasks.filter(task => !task.isIntegration);
    const waiting = sessions.filter(task => task.state === "approval" || task.state === "question");
    const active = new Set(waiting.map(task => task.id));
    for (const id of waitingSince.keys()) if (!active.has(id)) waitingSince.delete(id);
    if (waiting.length) {
      list.append(h("strong", { text: `Нужно твоё решение · ${waiting.length}` }));
      for (const task of waiting) {
        if (!waitingSince.has(task.id)) waitingSince.set(task.id, Date.now());
        const req = State.pendingApproval?.pillId === task.id ? State.pendingApproval : null;
        const since = req && State.pendingApprovalAt > 0 ? State.pendingApprovalAt : waitingSince.get(task.id)!;
        const target = req ? req.questions?.[0]?.question || req.command || req.tool : "Запрос нужно открыть в терминале";
        const age = h("small", { text: `Наблюдается ${Math.max(0, Math.floor((Date.now() - since) / 1000))} с · ${target}` });
        ages.set(age, { since, target });
        const project = task.sessionCwd?.split(/[\\/]/).filter(Boolean).at(-1) || "проект не указан";
        const row = h("button", { class: "nova-session", onclick: () => {
          actions.setFocus(task.id);
          if (req && State.pendingApproval?.requestId === req.requestId) actions.setView(req.questions ? "question" : "approval");
          else actions.openTerminal();
        } }, h("strong", { text: `${task.name} · ${project}` }),
        age);
        list.append(row);
      }
    }
    if (!sessions.length) list.append(h("p", { class: "nova-empty", text: "Пока нет сессий. Подключите агента в настройках — его действия и запросы появятся здесь." }),
      h("button", { class: "btn secondary", text: "Настроить агентов", onclick: () => actions.openSettingsWindow() }));
    for (const task of sessions) {
      const row = h("button", { class: "nova-session", onclick: () => { actions.setFocus(task.id); actions.setView(State.pendingApproval?.pillId === task.id ? State.pendingApproval.questions ? "question" : "approval" : "overview"); } },
        h("span", { class: "nova-session-title" }, h("strong", { text: task.name }), h("small", { text: states[task.state] ?? task.state })),
        h("span", { class: "nova-session-step", text: task.finalLine || task.steps.at(-1) || "Ожидаю события агента" }),
        h("small", { text: `${task.steps.length} событий в текущей сессии` }));
      list.append(row);
    }
  }, tick(now) {
    if (now - lastTick >= 1000) {
      lastTick = now;
      for (const [node, { since, target }] of ages) node.textContent = `Наблюдается ${Math.max(0, Math.floor((Date.now() - since) / 1000))} с · ${target}`;
    }
    return ages.size > 0;
  } };
}
