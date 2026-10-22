export interface LinkConfig { installed: boolean; hookReady: boolean }
export interface AgentReceipt { at: number; event: string }
export type LinkState = "preview" | "checking" | "unavailable" | "relay-missing" | "not-configured" | "waiting" | "received" | "history";
export const RECEIPT_KEY = "kiropiko.agent-receipts.v1";
const EVENTS = new Set(["SessionStart", "SessionEnd", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PostToolUseFailure", "Notification", "Stop", "StopFailure", "Interrupt", "SubagentStart", "SubagentStop", "PermissionRequest"]);

export function receiptFromHook(payload: Record<string, unknown>, now = Date.now()): {id:string; receipt:AgentReceipt} | null {
  if (typeof payload.hook_event_name !== "string" || !EVENTS.has(payload.hook_event_name)) return null;
  const tag = payload.coucou_agent;
  if (tag !== undefined && (typeof tag !== "string" || !/^[a-z0-9-]{1,24}$/.test(tag))) return null;
  return {id: !tag || tag === "claude" ? "claude" : tag as string, receipt:{at:now,event:payload.hook_event_name}};
}

export function cleanReceipts(value: unknown, now = Date.now()): Record<string, AgentReceipt> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, receipt]) => /^[a-z0-9-]{1,24}$/.test(id)
    && receipt && typeof receipt === "object" && Number.isFinite(receipt.at) && receipt.at > 0 && receipt.at <= now
    && EVENTS.has(receipt.event)).sort((a,b) => b[1].at-a[1].at).slice(0,40)
    .map(([id,receipt]) => [id,{at:receipt.at,event:receipt.event}]));
}

/** A hook installation is not a heartbeat. Old evidence never means live. */
export function linkState(native: boolean, config: LinkConfig | null, receipt: AgentReceipt | undefined, now = Date.now()): LinkState {
  if (!native) return "preview";
  if (!config) return "unavailable";
  if (!config.hookReady) return "relay-missing";
  if (!config.installed) return "not-configured";
  if (!receipt) return "waiting";
  return receipt.at <= now && now - receipt.at <= 60000 ? "received" : "history";
}
