export interface Reminder { id: string; text: string; due: number; done: boolean }
export interface FocusTimer { end: number | null; remaining: number; done: boolean; duration: number | null }
export interface ToolData { reminders: Reminder[]; focus: FocusTimer }
export function cleanTools(value: unknown): ToolData {
  const v = value as Partial<ToolData> | null;
  const reminders = Array.isArray(v?.reminders) ? v.reminders.filter(r => r && typeof r.id === "string" && typeof r.text === "string" && r.text.trim() && Number.isFinite(r.due) && r.due > 0).slice(0, 20).map(r => ({ id: r.id, text: r.text.slice(0, 180), due: r.due, done: r.done === true })) : [];
  const f = v?.focus;
  const remaining = Number.isFinite(f?.remaining) ? Math.max(0, Math.min(180 * 60000, f!.remaining)) : 0;
  const end = typeof f?.end === "number" && Number.isFinite(f.end) && f.end > 0 ? f.end : null;
  const duration = [15, 25, 45, 60].includes(f?.duration as number) ? f!.duration! : end !== null || remaining > 0 ? null : 25;
  return { reminders, focus: { end, remaining, done: f?.done === true, duration } };
}
export function countdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function agentCounts(tasks: readonly { isIntegration: boolean; state: string }[]) {
  const agents = tasks.filter(t => !t.isIntegration);
  return { working: agents.filter(t => ["working", "thinking", "searching"].includes(t.state)).length,
    waiting: agents.filter(t => ["approval", "question"].includes(t.state)).length };
}
/** Mark delivered items before presenting them, so sleep/restart never delivers twice. */
export function collectDue(data: ToolData, now: number, focusMessage = "Фокус завершён. Можно немного отдохнуть."): string[] {
  const messages: string[] = [];
  for (const item of data.reminders) if (!item.done && item.due <= now) {
    item.done = true; messages.push(item.text);
  }
  if (data.focus.end !== null && data.focus.end <= now) {
    data.focus = { ...data.focus, end: null, remaining: 0, done: true };
    messages.push(focusMessage);
  }
  return messages;
}
