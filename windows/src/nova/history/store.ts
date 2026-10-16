import type { TaskSummary } from "./summary";
export interface HistoryEntry { id: string; at: string; taskId: string; name: string; state: string; summary?: TaskSummary }
const KEY = "nova.history.v1";
const LIMIT = 200;
const STATES = new Set(["working", "thinking", "searching", "approval", "question", "error", "finished", "ratelimit", "idle", "sleeping"]);
function validSummary(s: unknown): s is TaskSummary {
  if (!s || typeof s !== "object") return false;
  const v = s as TaskSummary;
  return typeof v.outcome === "string" && v.outcome.length <= 1000 && typeof v.checks === "string" && v.checks.length <= 500 && typeof v.next === "string" && v.next.length <= 500 && Array.isArray(v.files) && v.files.length <= 20 && v.files.every(f => typeof f === "string" && f.length <= 255);
}
export function parseHistory(raw: string | null): HistoryEntry[] {
  try {
    const list = JSON.parse(raw ?? "[]");
    if (!Array.isArray(list)) return [];
    return list.filter(e => e && typeof e.id === "string" && e.id.length <= 200 && typeof e.at === "string" && Number.isFinite(Date.parse(e.at)) && typeof e.taskId === "string" && e.taskId.length <= 200 && typeof e.name === "string" && e.name.length <= 120 && STATES.has(e.state)).slice(0, LIMIT).map(e => ({ id: e.id, at: e.at, taskId: e.taskId, name: e.name, state: e.state, ...(validSummary(e.summary) ? { summary: e.summary } : {}) }));
  } catch { return []; }
}
export const History = {
  entries: [] as HistoryEntry[],
  load() { try { this.entries = parseHistory(localStorage.getItem(KEY)); } catch { this.entries = []; } },
  add(taskId: string, name: string, state: string, summary?: TaskSummary) {
    if (!STATES.has(state)) return;
    this.entries.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), taskId: taskId.slice(0, 200), name: name.slice(0, 120), state, ...(summary ? { summary } : {}) });
    this.entries = this.entries.slice(0, LIMIT);
    try { localStorage.setItem(KEY, JSON.stringify(this.entries)); } catch { /* History remains available for this session. */ }
  },
  clear() { this.entries = []; try { localStorage.removeItem(KEY); } catch { /* Memory still clears. */ } },
};
