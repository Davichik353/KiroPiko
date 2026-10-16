import type { Settings } from "../core/state";

const KEY = "nova.preview.preferences.v1";
const FIELDS = ["novaDoNotDisturb", "novaQuietFullscreen", "novaCapsuleWidth", "novaCharacterScale", "novaOnboardingDone", "novaAutoplay", "soundEnabled", "soundVolume", "autoCloseInterval", "openOnHover", "absenceInterval", "activeIntegrations", "mainPill", "mochiOutfit", "language", "novaAllowMicrophone", "novaAllowScreenCapture", "screen"] as const;

/** Browser-only appearance preferences; credentials and native setup are never stored. */
export function readPreviewSettings(): Partial<Settings> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const out: Record<string, unknown> = {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    for (const field of FIELDS) {
      const value = raw[field];
      if (field === "activeIntegrations") {
        if (Array.isArray(value) && value.every(item => typeof item === "string")) out[field] = value.slice(0, 4);
      } else if (["novaDoNotDisturb", "novaQuietFullscreen", "novaOnboardingDone", "novaAutoplay", "soundEnabled", "openOnHover", "novaAllowMicrophone", "novaAllowScreenCapture"].includes(field)) {
        if (typeof value === "boolean") out[field] = value;
      } else if (["novaCapsuleWidth", "novaCharacterScale", "soundVolume", "autoCloseInterval", "absenceInterval"].includes(field)) {
        if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 86400) out[field] = value;
      } else if (typeof value === "string" && value.length < 100) out[field] = value;
    }
    return out as Partial<Settings>;
  } catch { return {}; }
}

export function savePreviewSettings(settings: Settings) {
  const stored = Object.fromEntries(FIELDS.map(field => [field, settings[field]]));
  try { localStorage.setItem(KEY, JSON.stringify(stored)); }
  catch { showNotice("Браузер не разрешил сохранить настройки превью."); }
}

let noticeTimer: number | undefined;
export function showNotice(message: string) {
  let el = document.getElementById("nova-notice");
  if (!el) {
    el = document.createElement("div");
    el.id = "nova-notice";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { if (el) el.hidden = true; }, 9000);
}
