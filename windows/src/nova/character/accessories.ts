import { characterBox } from "./sprites";
import type { Outfit } from "../../mochi/wardrobe";

/** Original, code-drawn accessories for KiroPiko's sprite proportions. */
export function drawAccessory(ctx: CanvasRenderingContext2D, outfit: Outfit, width: number, height: number, bust: boolean) {
  if (outfit === "none") return;
  const w = Math.min(width * 0.92, height / (bust ? 0.63 : 1));
  const x = (width - w) / 2;
  const y = (height - w * (bust ? 0.63 : 1)) / 2;
  const box = bust ? { x, y, w, h: w } : characterBox(width, height);
  ctx.save(); ctx.translate(box.x, box.y); ctx.scale(box.w, box.h);
  ctx.lineWidth = 0.018; ctx.strokeStyle = "#7eddbb"; ctx.fillStyle = "#7eddbb";
  if (outfit === "sunglasses" || outfit === "roundGlasses") {
    ctx.beginPath(); ctx.ellipse(0.355, 0.375, 0.115, 0.055, 0, 0, Math.PI * 2); ctx.ellipse(0.665, 0.375, 0.115, 0.055, 0, 0, Math.PI * 2);
    if (outfit === "sunglasses") { ctx.fillStyle = "#171426"; ctx.fill(); }
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(0.47, 0.375); ctx.lineTo(0.55, 0.375); ctx.stroke();
  } else if (outfit === "scarf") {
    ctx.fillStyle = "#7eddbb"; ctx.fillRect(0.30, 0.49, 0.42, 0.05); ctx.fillRect(0.60, 0.52, 0.09, 0.13);
  } else if (outfit === "bow") {
    ctx.fillStyle = "#eb9bae"; ctx.beginPath(); ctx.ellipse(.19, .16, .09, .035, -.3, 0, Math.PI * 2); ctx.ellipse(.34, .16, .09, .035, .3, 0, Math.PI * 2); ctx.fill();
  } else if (outfit === "beanie") {
    ctx.beginPath(); ctx.ellipse(0.5, 0.12, 0.36, 0.15, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(0.14, 0.12, 0.72, 0.06);
  } else if (outfit === "witchHat") {
    ctx.fillStyle = "#49345f";
    ctx.beginPath(); ctx.moveTo(.24, .17); ctx.lineTo(.49, -.01); ctx.lineTo(.67, .17); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(.46, .17, .32, .045, -.1, 0, Math.PI * 2); ctx.fill();
  } else if (outfit === "pumpkin") {
    ctx.fillStyle = "#ea9a38"; ctx.beginPath(); ctx.ellipse(.5, .1, .23, .07, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#79dfbb"; ctx.fillRect(.48, .01, .03, .05);
  } else if (outfit === "bunnyEars") {
    ctx.fillStyle = "#e5ece7";
    ctx.beginPath(); ctx.ellipse(.25, -.015, .07, .105, -.2, 0, Math.PI * 2); ctx.ellipse(.75, -.015, .07, .105, .2, 0, Math.PI * 2); ctx.fill();
  } else if (outfit === "crown" || outfit === "partyHat" || outfit === "santaHat") {
    ctx.fillStyle = outfit === "crown" ? "#e9bd69" : outfit === "santaHat" ? "#c95473" : "#7eddbb";
    ctx.beginPath(); ctx.moveTo(0.3, 0.12); ctx.lineTo(0.5, -0.02); ctx.lineTo(0.7, 0.12); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
