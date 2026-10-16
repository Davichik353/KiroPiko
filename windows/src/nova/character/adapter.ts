import { BotEngine } from "../../mochi/engine";
import { drawServiceSprite, drawPlaySprite, spriteIndex } from "./sprites";
import { drawAvatar } from "./avatar";
import { State } from "../../core/state";
import { interactionMode } from "./state";
import { drawFootball, playMotion, type PlayActivity } from "./play";

/** Preserve the existing state, emote, spring and desktop lifecycle contracts. */
export class NovaCharacter extends BotEngine {
  peeking = false;
  serviceId: string | null = null;
  private playActivity: PlayActivity | null = null;
  private activitySince = 0;
  get activity(): PlayActivity | null { return this.playActivity; }
  set activity(value: PlayActivity | null) {
    if (value === this.playActivity) return;
    this.playActivity = value;
    this.activitySince = performance.now() / 1000;
  }
  private readonly phase = Math.random() * Math.PI * 2;
  /** Visible idle companions keep breathing and blinking; hidden panels still park their loop. */
  override get busy(): boolean {
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return super.busy || (this.state === "idle" && !reduced);
  }
  override draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const rawScale = State.settings.novaCharacterScale;
    const scale = Number.isFinite(rawScale) ? Math.max(.7, Math.min(1.1, rawScale)) : 1;
    ctx.save();
    if (!this.isMini) {
      ctx.translate(width / 2, height * .9);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height * .9);
    }
    const eye = this.eyeOverride;
    const reaction = !State.novaQuietActive && performance.now() < State.novaReactionUntil ? State.novaReaction : null;
    const emote = reaction ?? this.permanentEmote ?? (eye === "happy" ? "happy" : eye === "heart" ? "love" : eye === "wink" ? "wink" : eye === "line" ? "annoyed" : eye === "star" ? "proud" : eye === "dot" ? "surprised" : eye === "tired" ? "yawn" : null);
    const mode = interactionMode(State.novaListening, this.state === "thinking", State.novaSpeaking);
    const waiting = !this.activity && ["thinking", "working", "searching"].includes(this.state) && !emote;
    const index = this.activity === "football" ? 2 : mode === "listening" ? 6 : waiting ? 0 : mode === "speaking" ? 1 : spriteIndex(this.state, emote, this.waveUntil > performance.now() / 1000);
    const t = performance.now() / 1000;
    const playTime = t - this.activitySince;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const breath = reduced || this.activity ? 0 : Math.sin(t * 1.65 + this.phase);
    const dancing = State.novaMusicPlaying && !State.novaQuietActive && this.state === "idle" && !this.activity && !reduced;
    const sway = reduced || this.activity || State.novaQuietActive ? 0 : dancing ? Math.sin(t * 5) * .065 : Math.sin(t * 0.8 + this.phase) * 0.015;
    ctx.save();
    const step = this.activity && !reduced ? playMotion(this.activity, playTime).bounce * height : 0;
    ctx.translate(width / 2 + this.ox * width * 0.15 + this.yaw * width * 0.025, height / 2 + this.oy * width * 0.15 + breath * height * 0.008 + step);
    // The inherited engine deforms a round mascot. Keep the illustrated body
    // upright and proportional; only explicit play and dance add movement.
    ctx.rotate(this.activity ? this.tilt + this.roll * 0.15 : dancing ? sway * .4 : 0);
    ctx.scale(1, 1 + breath * 0.004);
    ctx.translate(-width / 2, -height / 2);
    const serviceDrawn = this.serviceId && drawServiceSprite(ctx, this.serviceId, width, height);
    // Dedicated profile/play sheets exist only for the base and witch outfits.
    // Other outfits keep their complete registered art instead of losing clothes.
    const dedicated = this.outfit === "none" || this.outfit === "witchHat";
    const playDrawn = this.activity && dedicated && drawPlaySprite(ctx, this.activity, playTime, width, height, this.outfit);
    if (!serviceDrawn && !playDrawn) drawAvatar(ctx, index, this.isMini ? "none" : this.outfit, width, height, this.peeking,
      this.activity && !reduced ? playMotion(this.activity, playTime) : undefined);
    ctx.restore();
    if (this.activity === "football") drawFootball(ctx, width, height, playTime);
    ctx.restore();
  }
}
