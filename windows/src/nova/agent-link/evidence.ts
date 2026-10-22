import { cleanReceipts, receiptFromHook, RECEIPT_KEY, type AgentReceipt } from "./model";
let memory: Record<string, AgentReceipt> = {};
const listeners = new Set<() => void>();
export function agentReceipts() {
  try { const saved = localStorage.getItem(RECEIPT_KEY); if (saved !== null) memory = cleanReceipts(JSON.parse(saved)); } catch { /* retain evidence in memory if storage is unavailable */ }
  return memory;
}
export function recordAgentEvent(payload: Record<string, unknown>) {
  const result = receiptFromHook(payload);
  if (!result) return;
  memory = cleanReceipts({...agentReceipts(),[result.id]:result.receipt});
  try { localStorage.setItem(RECEIPT_KEY,JSON.stringify(memory)); } catch { /* session-only evidence */ }
  for (const listener of listeners) listener();
}
export function onAgentReceipt(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
