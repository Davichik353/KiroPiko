import { accessoryBox } from "./sprites";
import type { Outfit } from "../../mochi/wardrobe";

/** Original, code-drawn accessories for KiroPiko's sprite proportions. */
export function drawAccessory(ctx: CanvasRenderingContext2D, outfit: Outfit, width: number, height: number, bust: boolean, index = 0) {
  if (outfit === "none") return;
  const box = accessoryBox(width, height, bust, index);
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
    ctx.fillStyle = "#49345f"; ctx.strokeStyle = "#30243f"; ctx.lineWidth = .012;
    ctx.beginPath(); ctx.ellipse(.5, .18, .49, .055, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(.25, .17); ctx.quadraticCurveTo(.35, .06, .51, -.045);
    ctx.quadraticCurveTo(.58, -.09, .72, -.015); ctx.lineTo(.59, .015);
    ctx.quadraticCurveTo(.62, .08, .76, .17); ctx.quadraticCurveTo(.5, .22, .25, .17); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#8d633e"; ctx.fillRect(.33, .14, .34, .035);
    ctx.strokeStyle = "#e9bd69"; ctx.lineWidth = .015; ctx.strokeRect(.47, .135, .085, .045);
  } else if (outfit === "pumpkin") {
    ctx.fillStyle = "#ea9a38"; ctx.beginPath(); ctx.ellipse(.5, .1, .23, .07, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#79dfbb"; ctx.fillRect(.48, .01, .03, .05);
  } else if (outfit === "bunnyEars") {
    ctx.fillStyle = "#e5ece7";
    ctx.beginPath(); ctx.ellipse(.25, -.015, .07, .105, -.2, 0, Math.PI * 2); ctx.ellipse(.75, -.015, .07, .105, .2, 0, Math.PI * 2); ctx.fill();
  } else if (outfit === "crown") {
    ctx.fillStyle = "#e9bd69";
    ctx.beginPath(); ctx.moveTo(.22, .16); ctx.lineTo(.18, .015); ctx.lineTo(.36, .08);
    ctx.lineTo(.5, -.035); ctx.lineTo(.64, .08); ctx.lineTo(.82, .015); ctx.lineTo(.78, .16); ctx.closePath(); ctx.fill();
  } else if (outfit === "santaHat") {
    ctx.fillStyle = "#c64b58";
    ctx.beginPath(); ctx.moveTo(.16, .16); ctx.quadraticCurveTo(.38, -.1, .6, -.01);
    ctx.quadraticCurveTo(.83, .02, .86, .14); ctx.lineTo(.72, .11); ctx.lineTo(.74, .16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#f0eee5"; ctx.beginPath(); ctx.ellipse(.46, .16, .32, .04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(.86, .14, .075, .045, 0, 0, Math.PI * 2); ctx.fill();
  } else if (outfit === "partyHat") {
    ctx.fillStyle = "#79dfbb"; ctx.beginPath(); ctx.moveTo(.28, .16); ctx.lineTo(.5, -.07); ctx.lineTo(.72, .16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#e9bd69";
    for (const [x, y] of [[.5, -.055], [.43, .05], [.56, .10]]) { ctx.beginPath(); ctx.ellipse(x, y, .035, .022, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
