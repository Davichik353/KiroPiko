import { Bridge, IS_TAURI, emitToWindow } from "../../core/bridge";
import { State } from "../../core/state";
import type { DesktopLink } from "../../island/desktop";
import { NovaCharacter } from "./adapter";
import { canPlay, playFrame } from "./play";
import { SeasonCache, parseOutfit } from "../../mochi/wardrobe";

class RoamingController {
  active = false;
  private desktop: DesktopLink | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private engine = new NovaCharacter();
  private seasons = new SeasonCache();
  private started = 0;
  private lastFrame = 0;
  private timer: number | null = null;
  private poll: number | null = null;
  private nativePending = false;
  private epoch = 0;
  private onHome: () => void = () => {};

  init(desktop: DesktopLink, onHome: () => void) {
    this.desktop = desktop;
    this.onHome = onHome;
    State.subscribe(() => { if (this.active && (!this.allowed() || !State.settings.novaAutoplay && this.automatic)) this.stop(); });
    this.poll = window.setInterval(() => {
      const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced && State.settings.novaAutoplay && !this.active && !State.mochiOnDesktop && performance.now() - State.lastActivity > 120000 && this.allowed()) void this.start();
    }, 5000);
    document.addEventListener("visibilitychange", () => { if (!IS_TAURI && document.hidden) this.stop(); });
    window.addEventListener("beforeunload", () => { this.stop(); if (this.poll != null) window.clearInterval(this.poll); });
  }

  private automatic = false;
  private allowed() {
    return canPlay({ paused: State.paused || State.novaQuietActive, listening: State.novaListening, speaking: State.novaSpeaking,
      pinned: Boolean(State.pendingApproval || State.isPinned),
      busy: State.stateOverride === "thinking" || State.tasks.some(t => !t.isIntegration && !["idle", "sleeping", "finished"].includes(t.state)),
      view: State.view, expanded: State.mode === "expanded" }) && (!document.hidden || IS_TAURI);
  }

  async start(manual = false) {
    if (this.active || State.mochiOnDesktop || !this.allowed()) return;
    if (IS_TAURI && !this.desktop?.supported) return;
    this.automatic = !manual;
    this.active = true;
    const epoch = ++this.epoch;
    if (IS_TAURI) {
      this.desktop!.controller.enabled = true;
      await this.desktop!.controller.launchFlyIfNeeded(true);
      if (epoch !== this.epoch) { await this.desktop!.controller.flyHome(); return; }
      if (this.desktop!.controller.phase !== "onDesktop") { this.active = false; return; }
    } else {
      this.canvas ??= document.createElement("canvas");
      const canvas = this.canvas;
      canvas.id = "nova-roaming";
      canvas.width = 150; canvas.height = 150;
      canvas.title = "Киро гуляет · нажмите, чтобы вернуть домой";
      canvas.setAttribute("aria-label", canvas.title);
      canvas.setAttribute("role", "button"); canvas.tabIndex = 0;
      canvas.onclick = () => this.stop();
      canvas.onkeydown = event => { if (event.key === "Enter" || event.key === "Escape") this.stop(); };
      canvas.style.cssText = "position:fixed;width:150px;height:150px;z-index:30;cursor:pointer;";
      document.body.append(canvas); canvas.hidden = false;
      State.mochiOnDesktop = true; State.notify();
    }
    this.started = performance.now();
    this.lastFrame = this.started;
    if (IS_TAURI) await emitToWindow("mochi", "nova-play", "walk");
    this.frame();
  }

  stop(returnHome = true) {
    if (!this.active) return;
    this.active = false;
    ++this.epoch;
    if (this.timer != null) {
      if (IS_TAURI) window.clearTimeout(this.timer);
      else window.cancelAnimationFrame(this.timer);
    }
    this.timer = null;
    State.lastActivity = performance.now();
    if (returnHome) this.onHome();
    if (IS_TAURI) {
      void emitToWindow("mochi", "nova-play", null);
      if (returnHome) void this.desktop?.controller.flyHome();
    } else {
      if (this.canvas) this.canvas.hidden = true;
      State.mochiOnDesktop = false; State.notify();
    }
  }

  private frame = () => {
    if (!this.active) return;
    if (!this.allowed()) { this.stop(); return; }
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const frame = playFrame((now - this.started) / 1000);
    if (frame.done) { this.stop(); return; }
    if (IS_TAURI) {
      if (!this.nativePending) {
        this.nativePending = true;
        const epoch = this.epoch;
        void emitToWindow("mochi", "nova-play", frame.activity);
        void Bridge.desktopRoam(frame.x, frame.y).then(ok => { if (epoch === this.epoch && ok === false) this.stop(false); }).finally(() => { this.nativePending = false; });
      }
    } else if (this.canvas) {
      const width = Math.max(0, window.innerWidth - 150), height = Math.max(0, window.innerHeight - 170);
      this.canvas.style.left = "0";
      this.canvas.style.top = "0";
      this.canvas.style.transform = `translate3d(${frame.x * width}px, ${frame.y * height}px, 0)`;
      const ctx = this.canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 150, 150);
        this.engine.activity = frame.activity;
    this.engine.setOutfit(this.seasons.get(parseOutfit(State.settings.mochiOutfit)), false);
    this.engine.update(dt);
        this.engine.draw(ctx, 150, 150);
      }
    }
    this.timer = IS_TAURI ? window.setTimeout(this.frame, 33) : window.requestAnimationFrame(this.frame);
  };
}

export const Roaming = new RoamingController();
