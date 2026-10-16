import { Greeting } from "../../mochi/greeting";
import { drawSprite } from "./sprites";

export class NovaGreeting extends Greeting {
  override draw(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 640, 150);
    const t = this.elapsed;
    ctx.save();
    ctx.translate(26, 18 + Math.sin(Math.min(t, 1) * Math.PI) * -10);
    drawSprite(ctx, 1, 110, 110);
    ctx.restore();
    ctx.fillStyle = "#f5f3ff";
    ctx.font = "600 20px Segoe UI, sans-serif";
    ctx.fillText("Привет, я Киро", 154, 65);
    ctx.fillStyle = "#aaa6bc";
    ctx.font = "14px Segoe UI, sans-serif";
    ctx.fillText("Рядом, пока вы создаёте новое.", 154, 92);
  }
}
