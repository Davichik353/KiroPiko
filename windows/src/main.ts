import { initTools } from "./nova/productivity/store";
// Entry point: boot the bridge, wire the island, start the greeting.

import "./style.css";
import "./nova/nova.css";
import "./ui/product.css";
import { loadCharacter, loadExtraCharacters } from "./nova/character/sprites";
import { readPreviewSettings } from "./nova/preview";
import { Speech } from "./nova/voice/speech";
import { Roaming } from "./nova/character/roaming";
import { observeHistory } from "./nova/history/view";
import { initCompanion } from "./nova/quiet";
import { Bridge, IS_TAURI, onEvent } from "./core/bridge";
import { Sound } from "./core/sound";
import { State, type Settings } from "./core/state";
import { Island } from "./island/island";
import { registerHookHandlers } from "./island/hooks";
import { registerPhoneLink } from "./island/phone-link";
import { registerSettingsHero } from "./island/settings-hero";
import { registerIntegrationHandlers, refreshConfigured } from "./island/integrations";
import { registerShortcutHandlers } from "./island/shortcuts";
import { applySpotify, registerSpotifyHandlers } from "./island/spotify";
import { SPOTIFY_ID } from "./core/spotify";
import { Recap } from "./recap/recap";
import { onLanguageChange, resolveLanguage, setLanguage, systemLanguages } from "./i18n/i18n";

/** Shows the language Settings asks for ("" = the system's, when Coucou has it). */
function applyLanguage() {
  setLanguage(resolveLanguage(State.settings.language, systemLanguages()));
}

async function main() {
  window.addEventListener("beforeunload", () => Speech.stop());
  const root = document.getElementById("root");
  if (!root) return;

  void Sound.preload();
  await loadCharacter().catch((err: unknown) => console.error(err));
  await loadExtraCharacters();

  // Upstream #346: correct WebView2 DPI before sizing the canvas bitmaps.
  const dprBefore = window.devicePixelRatio || 1;
  const zoomChanged = await Bridge.fitZoom(dprBefore);
  if (zoomChanged) {
    for (let i = 0; i < 20 && window.devicePixelRatio === dprBefore; i++) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  const island = new Island(root);

  const boot = await Bridge.boot();
  if (boot) {
    State.settings = { ...State.settings, ...boot.settings };
  } else if (!IS_TAURI) {
    State.settings = { ...State.settings, ...readPreviewSettings() };
  }
  // A language change redraws the island in place: the texts given as tl(…)
  // relabel themselves (views/dom.ts) and the views redraw the rest on this
  // sync. Nothing is rebuilt, so tasks, steps and the chat stay as they are.
  onLanguageChange(() => State.notify());
  applyLanguage();
  // Rust shows the tray and its errors in the same language as the webview.
  void Bridge.setSystemLanguages(systemLanguages());
  island.applySettings();
  State.loadIntegrationTasks();
  registerSettingsHero();
  observeHistory();
  window.addEventListener("storage", event => {
    if (!IS_TAURI && event.key === "nova.preview.preferences.v1") {
      State.settings = { ...State.settings, ...readPreviewSettings() };
      applyLanguage(); island.applySettings(); State.notify();
    }
  });
  if (boot && !boot.cursorPoll) island.followPageCursor();
  await island.desktop.init();
  Roaming.init(island.desktop, () => island.reveal());
  initCompanion(island);

  await onEvent<{ x: number; y: number }>("cursor", ({ x, y }) => island.onCursor(x, y));
  await onEvent<null>("outside-click", () => {
    if (State.mode === "expanded") island.collapse();
  });
  await onEvent<boolean>("pointer-inside", (inside) => island.setPointerInside(inside));

  /** Pause has to reach Rust too, or the pollers keep calling out. */
  const setPaused = (on: boolean) => {
    if (State.paused === on) return;
    State.paused = on;
    void Bridge.setPaused(on);
  };

  await onEvent<string>("tray", (what) => {
    switch (what) {
      case "settings":
        setPaused(false);
        island.alert("settings", true);
        break;
      case "open":
        setPaused(false);
        island.alert(State.defaultView(), true);
        break;
      case "recap":
        setPaused(false);
        void Recap.open(island);
        break;
      case "wardrobe":
        setPaused(false);
        island.alert("wardrobe", true);
        break;
      case "pause":
        setPaused(!State.paused);
        if (State.paused) island.fsm.forceHidden();
        else island.reveal();
        break;
    }
  });

  const checkZoom = async () => {
    await Bridge.fitZoom(window.devicePixelRatio || 1);
  };
  await onEvent<null>("screen-changed", async () => {
    await checkZoom();
    void Bridge.reposition();
  });
  // Re-arm after each DPI change: the previous resolution only matches once.
  const watchResolution = () => {
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener?.("change", () => {
      void checkZoom();
      watchResolution();
    }, { once: true });
  };
  watchResolution();
  window.addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { passive: false });
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && ["+", "-", "=", "0"].includes(event.key)) event.preventDefault();
  });

  // Settings → Reload sounds: read the sounds folder again, and let them hear it.
  await onEvent<null>("sounds-changed", () => {
    void Sound.reload().then(() => Sound.play("pop"));
  });

  // The settings window writes preferences; apply them here without a restart.
  await onEvent<Settings>("settings-changed", (s) => {
    const previousMain = State.mainPillId;
    State.settings = { ...State.settings, ...s };
    applyLanguage();
    island.applySettings();
    State.loadIntegrationTasks();
    // A new main tool comes to the front, as on macOS.
    if (State.mainPillId !== previousMain) State.setFocus(State.mainPillId);
    void refreshConfigured();
  });

  registerHookHandlers(island);
  registerPhoneLink(island);
  registerIntegrationHandlers(island);
  initTools();
  window.addEventListener("keydown", event => {
    if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== "k" || event.altKey) return;
    event.preventDefault(); event.stopImmediatePropagation();
    island.setView("quick");
  }, true);
  registerShortcutHandlers(island, () => setPaused(false));
  registerSpotifyHandlers(island);
  // Rust may have read Spotify before this page listened: ask once.
  if (State.settings.activeIntegrations.includes(SPOTIFY_ID)) {
    void Bridge.spotifyRefresh().then((s) => s && applySpotify(island, s));
  }

  // Monday recap: app start (greeting over), an agent starting work, waking up.
  const checkRecap = () => { if (!State.novaQuietActive) void Recap.check(island); };
  island.onGreetingDone = () => {
    if (!State.novaQuietActive && !State.settings.novaOnboardingDone && !State.pendingApproval) island.setView("onboarding");
    else checkRecap();
  };
  island.onWake = checkRecap;
  await onEvent<null>("recap-check", checkRecap);

  if (State.novaQuietActive) island.fsm.forcePetit();
  else island.launch();
  if (!State.novaQuietActive && !State.settings.novaOnboardingDone && !State.pendingApproval) island.setView("onboarding");

  // In a plain browser there is no wake strip behind the cursor: make the whole
  // page wake the island so the visuals can be checked with `npm run dev`.
  if (!IS_TAURI) {
    document.addEventListener("click", () => Sound.resume(), { once: true });
  }
}

void main();
