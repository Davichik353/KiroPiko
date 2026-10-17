import type { AgentTask, IntegrationInfo } from "../core/state";
import type { BotStateName } from "../core/layout";
export interface HeroMember { id: string; name: string; state: BotStateName }
export interface HeroSnapshot { members: HeroMember[]; quiet: boolean }
const priority: Partial<Record<BotStateName, number>> = { approval: 0, question: 0, error: 1, ratelimit: 1, working: 2, thinking: 2, searching: 2, finished: 3 };
/** Names and states only; no commands, keys or project paths. */
export function heroSnapshot(tasks: AgentTask[], integrations: Record<string, IntegrationInfo>, quiet: boolean): HeroSnapshot {
  return { quiet, members: tasks.filter(t => !t.isIntegration || priority[t.state] !== undefined || integrations[t.id]?.configured)
    .map(t => ({ id: t.id.slice(0,128), name: t.name.slice(0,60), state: t.state }))
    .sort((a,b) => (priority[a.state] ?? 4) - (priority[b.state] ?? 4)).slice(0,7) };
}
export function heroStateText(state: BotStateName): string {
  if (state === "approval" || state === "question") return "Нужно твоё решение";
  if (state === "error" || state === "ratelimit") return "Нужна помощь";
  if (state === "finished") return "Задача завершена";
  if (["working","thinking","searching"].includes(state)) return "Работа идёт";
  return "Киро рядом";
}
