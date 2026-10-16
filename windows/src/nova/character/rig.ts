import raw from "../../../public/nova/wardrobe-rig.json";
export interface RigPose { rect: number[]; regions?: number[][]; eye: number[]; span: number; baseline: number; angle: number; neck: number[] }
export interface RigShape { path?: string; ellipse?: number[]; rect?: number[]; fill: string; stroke: string; lineWidth: number; anchor: string; layer: string }
interface Rig { version: number; fullEyeSpan: number; bustEyeSpan: number; baseline: number; states: RigPose[]; ledge: RigPose[]; walk: RigPose[]; football: RigPose[]; holidayFull: RigPose[]; holidayBust: RigPose[]; sleepingHolidayFull: RigPose[]; sleepingHolidayBust: RigPose[]; holidayOutfits: string[]; accessories: Record<string, RigShape[]> }
export const KIRO_RIG = raw as Rig;
export function placePose(pose: RigPose, width: number, height: number, bust: boolean) {
  const eyeSpan = Math.min(width, height) * (bust ? KIRO_RIG.bustEyeSpan : KIRO_RIG.fullEyeSpan);
  const scale = eyeSpan / pose.span;
  const originX = width / 2 - pose.eye[0] * scale;
  const originY = height * KIRO_RIG.baseline - pose.baseline * scale;
  return { x: originX + pose.rect[0] * scale, y: originY + pose.rect[1] * scale, w: pose.rect[2] * scale, h: pose.rect[3] * scale, scale, originX, originY, eyeSpan };
}
export type RigPlacement = ReturnType<typeof placePose>;
