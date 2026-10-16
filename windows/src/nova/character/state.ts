export type NovaMode = "rest" | "listening" | "thinking" | "speaking";

export function interactionMode(listening: boolean, thinking: boolean, speaking: boolean): NovaMode {
  if (listening) return "listening";
  if (thinking) return "thinking";
  if (speaking) return "speaking";
  return "rest";
}
