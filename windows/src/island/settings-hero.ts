import { emitTo } from "@tauri-apps/api/event";
import { IS_TAURI, onEvent } from "../core/bridge";
import { State } from "../core/state";
import { heroSnapshot } from "../settings/hero-model";
/** A read-only feed, active only while the settings scene is visible. */
export function registerSettingsHero() {
  if (!IS_TAURI) return;
  let watching = false, timer = 0, previous = "";
  const publish = () => {
    timer = 0;
    if (!watching) return;
    const snapshot = heroSnapshot(State.tasks, State.integrations, State.novaQuietActive || State.settings.novaDoNotDisturb);
    const key = JSON.stringify(snapshot);
    if (key === previous) return;
    previous = key;
    void emitTo("settings", "settings-hero", snapshot).catch(() => {});
  };
  State.subscribe(() => { if (watching && !timer) timer = window.setTimeout(publish, 150); });
  void onEvent<boolean>("settings-hero-watch", active => {
    watching = active === true; clearTimeout(timer); timer = 0;
    if (watching) { previous = ""; publish(); }
  });
}
