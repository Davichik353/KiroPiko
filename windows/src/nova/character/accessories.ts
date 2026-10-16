import type { Outfit } from "../../mochi/wardrobe";
import { KIRO_RIG, type RigPose, type RigPlacement } from "./rig";

/** Shared vector pieces, measured from the actual face; Android uses the same JSON. */
export function drawRigAccessories(ctx: CanvasRenderingContext2D, outfit: Outfit, pose: RigPose, p: RigPlacement, layer: "front" | "behind") {
  for (const shape of KIRO_RIG.accessories[outfit] ?? []) {
    if (shape.layer !== layer) continue;
    const anchor = shape.anchor === "neck" ? pose.neck : pose.eye;
    ctx.save();
    ctx.translate(p.originX + anchor[0] * p.scale, p.originY + anchor[1] * p.scale);
    if (shape.anchor !== "neck") ctx.rotate(pose.angle);
    ctx.scale(p.eyeSpan / 100, p.eyeSpan / 100);
    ctx.lineWidth = shape.lineWidth; ctx.lineJoin = "round"; ctx.lineCap = "round";
    const path = shape.path ? new Path2D(shape.path) : new Path2D();
    if (shape.ellipse) path.ellipse(shape.ellipse[0], shape.ellipse[1], shape.ellipse[2], shape.ellipse[3], 0, 0, Math.PI * 2);
    if (shape.rect) path.roundRect(shape.rect[0], shape.rect[1], shape.rect[2], shape.rect[3], shape.rect[4]);
    if (shape.fill !== "none") { ctx.fillStyle = shape.fill; ctx.fill(path); }
    if (shape.stroke !== "none" && shape.lineWidth > 0) { ctx.strokeStyle = shape.stroke; ctx.stroke(path); }
    ctx.restore();
  }
}
