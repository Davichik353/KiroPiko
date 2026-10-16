import { h, svg, clear } from "../../views/dom";
import { ICONS } from "../../views/icons";
import { Bridge, IS_TAURI } from "../../core/bridge";
import type { ViewActions, ViewHost } from "../../views/views";
import { panel } from "../panel";
import { State } from "../../core/state";
import { sourceName, mediaPosition, mediaTime, type MediaSnapshot } from "./state";

export function buildMusic(actions: ViewActions): ViewHost {
  let snapshot: Awaited<ReturnType<typeof Bridge.mediaSnapshot>> = null;
  let polling = false;
  let timer: number | null = null;
  let snapshotAt = 0;
  let dragging = false;
  let dragPlayer: MediaSnapshot | null = null;
  const buttons = new Map<string, HTMLButtonElement>();
  const source = h("strong", { text: "Активный плеер" });
  const track = h("p", { class: "nova-status", text: "Spotify · Apple Music · Яндекс Музыка · браузер" });
  const artwork = h("img", { alt: "", hidden: true }) as HTMLImageElement;
  const artBox = h("div", { class: "nova-music-art" }, svg(ICONS.musicNote, 24), artwork);
  let artworkKey = "";
  let artworkEpoch = 0;
  const status = h("p", { class: "nova-status", role: "status", text: IS_TAURI ? "Запустите музыку в Яндекс Музыке или другом плеере." : "Превью: управление плеером работает в приложении Windows." });
  const equalizer = h("div", { class: "nova-equalizer", "aria-hidden": "true" });
  for (let i = 0; i < 18; i++) {
    const bar = h("i");
    bar.style.setProperty("--bar-delay", `${-i * .17}s`);
    bar.style.setProperty("--bar-duration", `${.65 + i % 5 * .13}s`);
    equalizer.append(bar);
  }
  const controls = h("div", { class: "nova-music-controls" });
  const volume = h("div", { class: "nova-music-volume" });
  const elapsed = h("span", { text: "—" });
  const duration = h("span", { text: "—" });
  const progress = h("input", { type: "range", min: 0, max: 1, step: .1, value: 0, disabled: true, "aria-label": "Позиция трека" }) as HTMLInputElement;
  let changingMode = false;
  const request = async (action: "seek" | "shuffle" | "repeat" | "yandexShuffle" | "yandexRepeat", value: number, player = snapshot) => {
    if (!player) return;
    if (changingMode) return;
    changingMode = true;
    paint();
    try { await Bridge.mediaControl(action, player.source, value, player.title); status.textContent = action.startsWith("yandex") ? "Режим переключён кнопкой Яндекс Музыки. Текущее значение отображается в самом плеере." : "Команда отправлена плееру Windows."; }
    catch (err) { status.textContent = String(err).replace(/^Error:\s*/, ""); }
    finally { changingMode = false; paint(); void refresh(); }
  };
  progress.addEventListener("input", () => { if (!dragging) dragPlayer = snapshot; dragging = true; elapsed.textContent = mediaTime(Number(progress.value)); });
  progress.addEventListener("change", () => { dragging = false; void request("seek", Number(progress.value), dragPlayer); dragPlayer = null; });
  progress.addEventListener("blur", () => { dragging = false; });
  const shuffle = h("button", { class: "nova-music-button", title: "Случайный порядок", "aria-label": "Случайный порядок", disabled: true }, svg(ICONS.shuffle, 16)) as HTMLButtonElement;
  const repeat = h("button", { class: "nova-music-button", title: "Повтор выключен", "aria-label": "Повтор", disabled: true }, svg(ICONS.repeat, 16)) as HTMLButtonElement;
  shuffle.onclick = () => { if (snapshot?.yandexShuffle) void request("yandexShuffle", 0); else if (snapshot?.canShuffle && snapshot.shuffle != null) void request("shuffle", snapshot.shuffle ? 0 : 1); };
  repeat.onclick = () => { if (snapshot?.yandexRepeat) void request("yandexRepeat", 0); else if (snapshot?.canRepeat && snapshot.repeat != null) void request("repeat", (snapshot.repeat + 1) % 3); };
  const options = [
    ["previous", "Предыдущий трек", ICONS.backward],
    ["playPause", "Пауза / продолжить", ICONS.play],
    ["next", "Следующий трек", ICONS.forward],
    ["volumeDown", "Тише", ICONS.volume1],
    ["mute", "Звук вкл. / выкл.", ICONS.volume0],
    ["volumeUp", "Громче", ICONS.volume3],
  ] as const;
  for (const [action, label, icon] of options) {
    const button = h("button", { class: action === "playPause" ? "nova-music-button main" : "nova-music-button", title: label, "aria-label": label }, svg(icon, action === "playPause" ? 20 : 16)) as HTMLButtonElement;
    buttons.set(action, button);
    button.addEventListener("click", async () => {
      if (!IS_TAURI) { status.textContent = "Браузерное превью не управляет плеером компьютера. Откройте приложение KiroPiko для Windows."; return; }
      button.disabled = true;
      try {
        if (action === "previous" || action === "playPause" || action === "next") {
          if (!snapshot) { status.textContent = "Нет активной медиасессии. Запустите музыку в плеере или браузере."; return; }
          await Bridge.mediaControl(action, snapshot.source, undefined, snapshot.title);
        } else await Bridge.musicControl(action);
        void refresh();
        status.textContent = "Команда отправлена плееру Windows.";
      }
      catch (err) { status.textContent = String(err).replace(/^Error:\s*/, ""); }
      finally { button.disabled = false; }
    });
    (action === "previous" || action === "playPause" || action === "next" ? controls : volume).append(button);
  }
  controls.prepend(shuffle); controls.append(repeat);
  const paint = () => {
    if (IS_TAURI) {
      buttons.get("previous")!.disabled = !snapshot?.canPrevious;
      buttons.get("next")!.disabled = !snapshot?.canNext;
      buttons.get("playPause")!.disabled = !snapshot?.canToggle;
    }
    const play = buttons.get("playPause")!;
    clear(play); play.append(svg(snapshot?.playing ? ICONS.pause : ICONS.play, 20));
    play.title = snapshot?.playing ? "Пауза" : "Продолжить";
    play.setAttribute("aria-label", play.title);
    shuffle.disabled = changingMode || !(snapshot?.yandexShuffle || (snapshot?.canShuffle && snapshot.shuffle != null));
    repeat.disabled = changingMode || !(snapshot?.yandexRepeat || (snapshot?.canRepeat && snapshot.repeat != null));
    shuffle.title = shuffle.disabled ? "Плеер не передаёт управление случайным порядком Windows. Измените его в самом плеере." : "Случайный порядок";
    shuffle.setAttribute("aria-label", shuffle.title);
    shuffle.setAttribute("aria-pressed", String(Boolean(snapshot?.shuffle)));
    repeat.title = repeat.disabled ? "Плеер не передаёт управление повтором Windows. Измените его в самом плеере." : ["Повтор выключен", "Повтор трека", "Повтор списка"][snapshot?.repeat ?? 0] ?? "Повтор";
    repeat.setAttribute("aria-label", repeat.title);
    repeat.setAttribute("aria-pressed", String((snapshot?.repeat ?? 0) > 0));
    if (snapshot?.yandexShuffle) { shuffle.title = "Переключить случайный порядок в Яндекс Музыке"; shuffle.setAttribute("aria-label", shuffle.title); shuffle.removeAttribute("aria-pressed"); }
    if (snapshot?.yandexRepeat) { repeat.title = "Переключить режим повтора в Яндекс Музыке"; repeat.setAttribute("aria-label", repeat.title); repeat.removeAttribute("aria-pressed"); }
    progress.disabled = !snapshot?.canSeek;
    progress.max = String(snapshot?.duration || 1);
    duration.textContent = snapshot?.duration ? mediaTime(snapshot.duration) : "—";
  };
  const body = h("div", { class: "nova-music" },
    h("div", { class: "nova-music-source" }, source),
    h("div", { class: "nova-music-hero" }, artBox, h("div", {}, track, equalizer)), h("div", { class: "nova-music-progress" }, elapsed, progress, duration), controls, volume,
    h("div", { class: "nova-music-links" },
      ...[["Яндекс Музыка", "https://music.yandex.ru/"], ["Spotify", "https://open.spotify.com/"], ["Apple Music", "https://music.apple.com/"]].map(([name, url]) => h("button", { class: "link-btn", text: `${name} ↗`, onclick: () => actions.openUrl(url) }))), status,
    h("small", { text: "Анимация отражает воспроизведение, не спектр звука. Громкость системная. Браузер должен передавать медиасессию Windows." }));
  equalizer.classList.add("paused");
  paint();
  const active = () => State.view === "music" && State.mode === "expanded";
  async function refresh() {
    if (!IS_TAURI || polling || !active()) return;
    polling = true;
    try {
      const value = await Bridge.mediaSnapshot();
      snapshot = value;
      snapshotAt = performance.now();
      const key = value ? `${value.source}\0${value.title}\0${value.album}` : "";
      if (key !== artworkKey) {
        artworkKey = key;
        const epoch = ++artworkEpoch;
        artwork.hidden = true; artwork.removeAttribute("src");
        if (value) void Bridge.mediaArtwork(value.source, value.title).then(data => {
          if (epoch === artworkEpoch && data && /^data:image\/(png|jpeg|webp);base64,/.test(data)) { artwork.src = data; artwork.hidden = false; }
        }).catch(() => { /* Missing cover never prevents playback controls. */ });
      }
      source.textContent = value ? sourceName(value.source) : "Нет активного плеера";
      track.textContent = value ? [value.title || "Без названия", value.artist, value.album].filter(Boolean).join(" · ") : "Запустите музыку в приложении или браузере.";
      status.textContent = value?.yandexShuffle || value?.yandexRepeat ? "Яндекс Музыка подключена напрямую для переключения режимов. Их текущее состояние смотрите в плеере." : value ? ((!value.canShuffle || value.shuffle == null || !value.canRepeat || value.repeat == null)
        ? "Плеер подключён. Некоторые режимы недоступны через Windows: случайный порядок и повтор меняйте в самом плеере."
        : "Подключено к медиасессии Windows.") : "Windows не сообщает о плеере. Проверьте панель мультимедиа Windows (Win+A), включите управление мультимедиа в браузере и перезапустите браузер. KiroPiko видит только опубликованные медиасессии.";
      equalizer.classList.toggle("paused", !value?.playing);
      paint();
    } catch (err) { snapshot = null; paint(); equalizer.classList.add("paused"); status.textContent = String(err).replace(/^Error:\s*/, ""); }
    finally { polling = false; if (active()) State.notify(); }
  }
  const sync = () => {
    if (IS_TAURI && active() && timer == null) { void refresh(); timer = window.setInterval(() => void refresh(), 2000); }
    else if (!active() && timer != null) { window.clearInterval(timer); timer = null; dragging = false; }
  };
  State.subscribe(sync);
  window.addEventListener("beforeunload", () => { if (timer != null) window.clearInterval(timer); });
  return { el: panel("Музыка", "KiroPiko PLAYER", body), sync, tick(now) {
    if (!IS_TAURI) return false;
    if (!dragging && snapshot) {
      const position = mediaPosition(snapshot, (now - snapshotAt) / 1000);
      progress.value = String(position); elapsed.textContent = mediaTime(position);
    }
    return active() && Boolean(snapshot?.playing);
  } };
}
