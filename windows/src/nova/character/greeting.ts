import { Greeting } from "../../mochi/greeting";
import { drawAvatar } from "./avatar";
import { State } from "../../core/state";
import { parseOutfit, resolveOutfit } from "../../mochi/wardrobe";

export class NovaGreeting extends Greeting {
  override draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 640, 150);
    const t = this.elapsed;
    ctx.save();
    const reduced=typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ctx.translate(26, 18 + (reduced ? 0 : Math.sin(Math.min(t, 1) * Math.PI) * -10));
    drawAvatar(ctx, 1, State.wardrobePreview ?? resolveOutfit(parseOutfit(State.settings.mochiOutfit), new Date()), 110, 110);
    ctx.restore();
    ctx.fillStyle = "#f5f3ff";
    ctx.font = "600 20px Segoe UI, sans-serif";
    ctx.fillText("Привет, я Киро", 154, 65);
    ctx.fillStyle = "#aaa6bc";
    ctx.font = "14px Segoe UI, sans-serif";
    ctx.fillText("Рядом, пока вы создаёте новое.", 154, 92);
  }
}
