export type VoiceIntent = { kind: "app"; app: "notepad" | "calculator" | "explorer" } | { kind: "doctor" } | { kind: "music"; action: "play" | "pause" | "next" | "previous" } | { kind: "question" };

export function voiceIntent(text: string): VoiceIntent {
  const clean = text.trim().toLowerCase().replace(/^(киро|kiro|kiropiko)[,\s:]+/, "").replace(/[.!?]+$/, "");
  if (/^(открой|запусти|open|start) (блокнот|notepad)$/.test(clean)) return { kind: "app", app: "notepad" };
  if (/^(открой|запусти|open|start) (калькулятор|calculator)$/.test(clean)) return { kind: "app", app: "calculator" };
  if (/^(открой|запусти|open|start) (проводник|explorer|file explorer)$/.test(clean)) return { kind: "app", app: "explorer" };
  if (/^(проверь компьютер|состояние компьютера|check computer|system status)$/.test(clean)) return { kind: "doctor" };
  if (/^(включи музыку|продолжи музыку|play music|resume music)$/.test(clean)) return { kind: "music", action: "play" };
  if (/^(останови музыку|поставь музыку на паузу|pause music)$/.test(clean)) return { kind: "music", action: "pause" };
  if (/^(следующий трек|next track)$/.test(clean)) return { kind: "music", action: "next" };
  if (/^(предыдущий трек|previous track)$/.test(clean)) return { kind: "music", action: "previous" };
  return { kind: "question" };
}
