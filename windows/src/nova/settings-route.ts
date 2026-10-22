import { Bridge, IS_TAURI, emitToWindow } from "../core/bridge";

export async function openSettingsSection(id: string) {
  if (!IS_TAURI) { window.location.assign(`/settings.html#${id}`); return; }
  try { localStorage.setItem("kiropiko.settings.target", JSON.stringify({ id, at: Date.now() })); } catch { /* event also targets an open window */ }
  await Bridge.openSettingsWindow();
  await emitToWindow("settings", "navigate-settings", id);
}
