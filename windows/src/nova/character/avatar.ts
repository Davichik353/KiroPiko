import type { Outfit } from "../../mochi/wardrobe";
import { characterSource } from "./sprites";
import { placePose } from "./rig";
import { drawRigAccessories } from "./accessories";

/** One draw path for the island, full character and wardrobe thumbnails. */
export function drawAvatar(ctx: CanvasRenderingContext2D, index: number, outfit: Outfit, width: number, height: number, bust = false, legs?: { leftLeg: number; rightLeg: number }): boolean {
  const source = characterSource(index, outfit, bust);
  if (!source) return false;
  const p = placePose(source.pose, width, height, bust);
  if (!source.costume) drawRigAccessories(ctx, outfit, source.pose, p, "behind");
  const [x, y, w, h] = source.pose.rect;
  if (legs && !bust) {
    const top = source.pose.baseline - (source.pose.baseline - source.pose.eye[1]) * .30;
    const center = source.pose.eye[0], span = source.pose.span;
    const leg = (left: boolean, angle: number) => {
      const start = Math.max(x, left ? center - span * 1.15 : center);
      const end = Math.min(x + w, left ? center : center + span * 1.15);
      const pivot = center + (left ? -.35 : .35) * span;
      ctx.save(); ctx.translate(p.originX + pivot * p.scale, p.originY + top * p.scale); ctx.rotate(angle);
      ctx.drawImage(source.image, start, top, end - start, y + h - top,
        (start - pivot) * p.scale, 0, (end - start) * p.scale, (y + h - top) * p.scale);
      ctx.restore();
    };
    leg(true, legs.leftLeg); leg(false, legs.rightLeg);
    ctx.drawImage(source.image, x, y, w, top - y + 2, p.x, p.y, p.w, (top - y + 2) * p.scale);
  } else for (const [rx,ry,rw,rh] of source.pose.regions ?? [source.pose.rect]) {
    ctx.drawImage(source.image,rx,ry,rw,rh,p.originX+rx*p.scale,p.originY+ry*p.scale,rw*p.scale,rh*p.scale);
  }
  if (!source.costume) drawRigAccessories(ctx, outfit, source.pose, p, "front");
  return true;
}
