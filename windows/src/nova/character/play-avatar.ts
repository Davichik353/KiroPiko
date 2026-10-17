import type { Outfit } from "../../mochi/wardrobe";
import { drawAvatar } from "./avatar";
import { drawPlaySprite } from "./sprites";
import { playMotion, type PlayActivity } from "./play";

/** Keep the selected costume complete while animating its registered legs. */
export function drawPlayingAvatar(ctx: CanvasRenderingContext2D, activity: PlayActivity, time: number, width: number, height: number, outfit: Outfit): boolean {
  if (drawPlaySprite(ctx, activity, time, width, height, outfit)) return true;
  return drawAvatar(ctx, 0, outfit, width, height, false, playMotion(activity, time));
}
