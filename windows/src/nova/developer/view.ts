import { h, clear } from "../../views/dom";
import { State } from "../../core/state";
import type { ViewActions, ViewHost } from "../../views/views";
import { panel } from "../panel";
import { u, ul } from "../../i18n/kiro";
import { agentCounts } from "../productivity/model";
import { openSettingsSection } from "../settings-route";
import { Bridge, IS_TAURI } from "../../core/bridge";
export function buildDeveloper(actions: ViewActions): ViewHost {
  const list = h("div", { class: "nova-session-list" });
  const waitingSince = new Map<string, number>();
  const ages = new Map<HTMLElement, { since: number; target: string }>();
  let lastTick = 0;
  let configured: string[] | null = null, checking = false;
  async function checkConfiguration() {
    if (!IS_TAURI || checking) return;
    checking = true;
    State.notify();
    try {
      const [claude, other] = await Promise.allSettled([Bridge.hooksStatus(),Bridge.agentHooksList()]);
      const c = claude.status === "fulfilled" ? claude.value : null;
      const a = other.status === "fulfilled" ? other.value : null;
      const ready = [
        ...(c?.installed && c.hookReady ? ["Claude Code"] : []),
        ...(a ?? []).filter(agent => agent.installed && agent.hookReady).map(agent => agent.name),
      ];
      configured = (c === null || a === null) && !ready.length ? null : ready;
    } finally { checking = false; State.notify(); }
  }
  const states: Record<string, string> = { idle: "Ожидает", working: "Работает", thinking: "Думает", searching: "Ищет", approval: "Нужно разрешение", question: "Есть вопрос", error: "Ошибка", finished: "Завершено", sleeping: "Отдыхает" };
  return { el: panel(ul("Ваши AI-агенты"), ul("Работа и запросы в одном месте"), list), sync() {
    clear(list);
    ages.clear();
    const sessions = State.tasks.filter(task => !task.isIntegration);
    const waiting = sessions.filter(task => task.state === "approval" || task.state === "question");
    const counts = agentCounts(sessions);
    list.append(h("div", {class:"agent-summary", "aria-label":ul("Состояние агентов")},
      ...[[u("Работают"), counts.working], [u("Ждут ответа"), counts.waiting], [u("Завершены"), sessions.filter(task => task.state === "finished").length]].map(([label,count]) =>
        h("span", {}, h("strong", {text:count}), h("small", {text:label})))));
    if (sessions.length) list.append(h("button",{class:"link-btn",text:ul("Проверить подключение агента"),onclick:() => { void openSettingsSection("agents"); }}));
    const active = new Set(waiting.map(task => task.id));
    for (const id of waitingSince.keys()) if (!active.has(id)) waitingSince.delete(id);
    if (waiting.length) {
      list.append(h("strong", { text: u("Нужно ваше решение · {count}", {count:waiting.length}) }));
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
    if (!sessions.length) list.append(h("div", {class:"agent-first-run"},
      h("small",{text:ul(!IS_TAURI ? "Проверка доступна в приложении Windows" : checking ? "Проверяем конфигурацию…" : configured === null ? "Не удалось проверить подключение" : configured.length ? "Хуки готовы · ждём первое событие" : "Агент не подключён")}),
      h("strong", {text:ul("Не пропускайте запросы ваших агентов")}),
      h("p", {text:configured?.length ? u("Хуки готовы: {names}. Рабочих сессий пока нет. Запустите новую сессию агента; установка хуков ещё не подтверждает доставку событий.",{names:configured.join(", ")}) : ul("Киро показывает, кто работает, кто закончил и кому нужен ваш ответ. Подключите первого агента, затем запустите новую сессию в его терминале.")}),
      h("button", { class: "btn primary", text: configured?.length ? ul("Проверить связь") : ul("Подключить первого агента"), onclick: () => { void openSettingsSection("agents"); } }),
      h("small", {text:ul("Ключ модели для наблюдения за агентом не нужен.")})));
    if (sessions.length && !waiting.length) list.append(h("p", {class:"hint",text:ul("Ответов не требуется. Киро сообщит, когда понадобится ваше решение.")}));
    const priority = (state: string) => state === "error" ? 0 : ["working", "thinking", "searching"].includes(state) ? 1 : state === "finished" ? 2 : 3;
    for (const task of sessions.filter(task => !active.has(task.id)).sort((a,b) => priority(a.state)-priority(b.state))) {
      const row = h("button", { class: "nova-session", onclick: () => { actions.setFocus(task.id); actions.setView(State.pendingApproval?.pillId === task.id ? State.pendingApproval.questions ? "question" : "approval" : "overview"); } },
        h("span", { class: "nova-session-title" }, h("strong", { text: task.name }), h("small", { text: states[task.state] ?? task.state })),
        h("span", { class: "nova-session-step", text: task.finalLine || task.steps.at(-1) || "Ожидаю события агента" }),
        h("small", { text: `${task.steps.length} событий в текущей сессии` }));
      list.append(row);
    }
  }, focus: checkConfiguration, tick(now) {
    if (now - lastTick >= 1000) {
      lastTick = now;
      for (const [node, { since, target }] of ages) node.textContent = `Наблюдается ${Math.max(0, Math.floor((Date.now() - since) / 1000))} с · ${target}`;
    }
    return ages.size > 0;
  } };
}
