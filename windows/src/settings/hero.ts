import { h } from "../views/dom";
import type { Settings } from "../core/state";
import { parseOutfit, resolveOutfit } from "../mochi/wardrobe";
import { drawAvatar } from "../nova/character/avatar";
import { loadCharacter, loadExtraCharacters } from "../nova/character/sprites";

/** Local companion only: never starts a task, sound or network request. */
export function settingsHero(read: () => Settings) {
  const caption = h("p", { class: "kiro-hero-caption", text: "Устраивайся. Я рядом." });
  const status = h("span", { class: "kiro-hero-status" });
  const canvas = h("canvas", { width: 360, height: 360, "aria-hidden": "true" }) as HTMLCanvasElement;
  const greet = h("button", { class: "kiro-hero-character", type: "button", "aria-label": "Поздороваться с Киро" }, canvas) as HTMLButtonElement;
  const card = h("section", { class: "kiro-hero", "aria-label": "Киро рядом" },
    h("div", { class: "kiro-hero-copy" }, h("span", { class: "kiro-hero-eyebrow", text: "ТВОЙ МАЛЕНЬКИЙ НАПАРНИК" }),
      h("h2", { text: "Киро рядом" }), caption, status),
    greet, h("span", { class: "kiro-hero-hint", text: "Нажми на Киро — поздоровайся" }));
  const ctx = canvas.getContext("2d");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let disposed = false, visible = false, ready = false, frame = 0, timer = 0, last = 0, reaction = -Infinity, taps = 0;
  const phrases = ["Привет! Рад тебя видеть.", "Настроим всё под тебя?", "Я на месте. Можно творить."];
  function draw(now: number) {
    if (!ctx || !ready) return;
    const s = read(), quiet = s.novaDoNotDisturb;
    const moving = !motion.matches && !quiet;
    const elapsed = (now - reaction) / 1000;
    const reacting = elapsed >= 0 && elapsed < 1.2;
    const jump = moving && reacting ? Math.sin(Math.min(1, elapsed / .65) * Math.PI) * 15 : 0;
    const breath = moving ? Math.sin(now / 1000 * 1.65) * .8 : 0;
    ctx.clearRect(0, 0, 360, 360);
    ctx.save(); ctx.scale(2, 2); ctx.translate(0, -jump + breath);
    drawAvatar(ctx, reacting ? 1 : moving && Math.floor(now / 1000) % 9 === 8 ? 6 : 0,
      resolveOutfit(parseOutfit(s.mochiOutfit), new Date()), 180, 180);
    ctx.restore();
    const message = reacting ? phrases[(taps - 1) % phrases.length] : quiet ? "Тихо посижу рядом. Не отвлекаю." : "Устраивайся. Я рядом.";
    if (caption.textContent !== message) caption.textContent = message;
    const label = quiet ? "Тихий режим" : "Можно поздороваться";
    if (status.textContent !== label) status.textContent = label;
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    // Static preferences still refresh clothing/status, at one frame a second.
    const interval = motion.matches || read().novaDoNotDisturb ? 1000 : 1000 / 30;
    if (now - last >= interval) { draw(now); last = now; }
    if (motion.matches || read().novaDoNotDisturb) timer = window.setTimeout(() => tick(performance.now()), 1000);
    else frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); clearTimeout(timer); frame = 0; last = 0;
    if (!disposed && visible && !document.hidden) { draw(performance.now()); frame = requestAnimationFrame(tick); }
  }
  greet.addEventListener("click", () => { taps++; reaction = performance.now(); draw(reaction); });
  const observer = new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); sync(); });
  observer.observe(card);
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", sync);
  function pause() { cancelAnimationFrame(frame); clearTimeout(timer); frame = 0; }
  function dispose() {
    disposed = true; cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect();
    document.removeEventListener("visibilitychange", sync); motion.removeEventListener("change", sync);
    window.removeEventListener("pagehide", pause); window.removeEventListener("pageshow", sync);
  }
  window.addEventListener("pagehide", pause); window.addEventListener("pageshow", sync);
  void Promise.all([loadCharacter(), loadExtraCharacters()]).then(() => { ready = true; sync(); }).catch(() => {
    if (!disposed) { caption.textContent = "Киро не загрузился. Попробуй открыть настройки ещё раз."; greet.disabled = true; dispose(); }
  });
  return { element: card, dispose };
}
