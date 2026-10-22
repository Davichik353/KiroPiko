import { Bridge, IS_TAURI, emitToWindow } from "../../core/bridge";
import { State } from "../../core/state";
import { kiroLine } from "../personality";

let key = "", epoch = 0, busy = false;
export async function refreshMusicShow() {
  if (!IS_TAURI || busy) return;
  busy = true;
  try {
    const media = await Bridge.mediaSnapshot();
    if (State.novaQuietActive) return;
    const playing = !!media?.playing;
    if (playing !== State.novaMusicPlaying) {
      State.novaMusicPlaying = playing;
      void emitToWindow("mochi", "nova-music-playing", playing);
    }
    const nextKey = playing && media ? `${media.source}\0${media.title}` : "";
    if (key !== nextKey) {
      key = nextKey; const generation = ++epoch;
      document.documentElement.style.removeProperty("--kiro-music-accent");
      if (playing && media) {
        if (media.source === "ru.yandex.desktop.music") {
          State.novaPhrase = "Моя волна? Я уже танцую.";
          State.novaReaction = "happy"; State.novaReactionUntil = performance.now() + 4000;
        } else State.novaPhrase = kiroLine("music");
        const data = await Bridge.mediaArtwork(media.source, media.title);
        if (generation !== epoch || State.novaQuietActive || !data || !/^data:image\/(png|jpeg|webp);base64,/.test(data)) return;
        const image = new Image();
        image.onload = () => {
          if (generation !== epoch || State.novaQuietActive) return;
          const canvas = document.createElement("canvas"); canvas.width = canvas.height = 8;
          const ctx = canvas.getContext("2d"); if (!ctx) return;
          ctx.drawImage(image, 0, 0, 8, 8);
          const bytes = ctx.getImageData(0, 0, 8, 8).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < bytes.length; i += 4) { r += bytes[i]; g += bytes[i + 1]; b += bytes[i + 2]; }
          document.documentElement.style.setProperty("--kiro-music-accent", `rgb(${Math.round(r / 64)} ${Math.round(g / 64)} ${Math.round(b / 64)} / .65)`);
        };
        image.src = data;
      }
    }
    State.notify();
  } catch {
    State.novaMusicPlaying = false;
    if (key) { key = ""; ++epoch; document.documentElement.style.removeProperty("--kiro-music-accent"); }
    void emitToWindow("mochi", "nova-music-playing", false);
    State.notify();
  } finally { busy = false; }
}
