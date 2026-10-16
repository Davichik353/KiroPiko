import { Bridge, IS_TAURI, emitToWindow } from "../core/bridge";
import { State } from "../core/state";
import { Sound } from "../core/sound";
import type { BotEmoteName } from "../core/layout";
import type { Island } from "../island/island";
import { Roaming } from "./character/roaming";
import { Speech } from "./voice/speech";
import { kiroLine } from "./personality";
import { refreshMusicShow } from "./music/show";
import { quietPolicy } from "./attention";

/** Keep agents running; only presentation, walking and sounds become quiet. */
export function initCompanion(island: Island) {
  let osState: number | null = null, polling = false, stopped = false;
  let lastIdleReaction = 0, lastMusicPoll = 0;
  const seen = new Map(State.tasks.map(task => [task.id, task.state]));
  const react = (emote: BotEmoteName, kind: "rest" | "success" | "error" | "return") => {
    if (State.novaQuietActive) return;
    State.novaReaction = emote;
    State.novaReactionUntil = performance.now() + 5000;
    State.novaPhrase = kiroLine(kind);
    if (IS_TAURI) void emitToWindow("mochi", "nova-mood", { emote, phrase: State.novaPhrase });
  };
  const apply = () => {
    const next = quietPolicy(State.settings.novaDoNotDisturb, State.settings.novaQuietFullscreen, osState);
    if (next === State.novaQuietActive) return;
    State.novaQuietActive = next;
    document.body.classList.toggle("kiro-quiet", next);
    island.fsm.openOnHover = State.settings.openOnHover && !next;
    Sound.setEnabled(State.settings.soundEnabled && !next);
    if (next) {
      Roaming.stop(); Speech.stop();
      island.collapse();
      State.novaPhrase = "Не мешаю · запросы сохранены";
    } else { State.novaPhrase = kiroLine("return"); island.revealSilently(); }
    if (IS_TAURI) void emitToWindow("mochi", "nova-quiet", next);
    State.notify();
  };
  const unsubscribe = State.subscribe(() => {
    apply();
    for (const task of State.tasks) {
      const previous = seen.get(task.id);
      seen.set(task.id, task.state);
      if (!task.isIntegration && previous !== task.state) {
        if (task.state === "finished") react("happy", "success");
        if (task.state === "error") react("annoyed", "error");
      }
    }
    const present = new Set(State.tasks.map(task => task.id));
    for (const id of seen.keys()) if (!present.has(id)) seen.delete(id);
  });
  const poll = async () => {
    if (polling || stopped) return;
    polling = true;
    try {
      if (IS_TAURI && State.settings.novaQuietFullscreen) osState = await Bridge.attentionState();
      if (stopped) return;
      apply();
      const now = performance.now();
      if (!State.novaQuietActive && now - lastMusicPoll > 5000) { lastMusicPoll = now; void refreshMusicShow(); }
      if (!State.novaQuietActive && !State.novaListening && !State.novaSpeaking && !State.tasks.some(t => !t.isIntegration && !["idle", "sleeping", "finished"].includes(t.state)) && now - State.lastActivity > 60000 && now - lastIdleReaction > 120000) {
        lastIdleReaction = now; react("yawn", "rest"); Sound.play("yawn"); State.notify();
      }
    } finally { polling = false; }
  };
  apply();
  void poll();
  const timer = window.setInterval(() => void poll(), 2000);
  window.addEventListener("beforeunload", () => { stopped = true; unsubscribe(); window.clearInterval(timer); });
}
