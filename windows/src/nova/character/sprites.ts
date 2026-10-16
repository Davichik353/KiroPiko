import type { BotEmoteName, BotStateName } from "../../core/layout";
import { footballPose, playMotion } from "./play";
import type { Outfit } from "../../mochi/wardrobe";

let sheet: HTMLImageElement | null = null;
let idleSheet: HTMLImageElement | null = null;
let serviceSheet: HTMLImageElement | null = null;
let ledgeSheet: HTMLImageElement | null = null;
let playSheet: HTMLImageElement | null = null;
let holidaySheet: HTMLImageElement | null = null;
let walkSheet: HTMLImageElement | null = null;
let footballSheet: HTMLImageElement | null = null;

export const STATE_BOUNDS = [[105,16,341,398],[96,17,337,398],[91,17,334,398],[103,7,351,399],[92,9,338,399],[100,10,346,399],[101,9,347,395],[81,11,348,395],[81,10,331,395]];
const HOLIDAY_BOUNDS = [[89,4,401,433],[109,4,374,433],[93,4,377,434],[95,4,348,433]];
export function characterBox(width: number, height: number, bounds = STATE_BOUNDS[0]) {
  const h = Math.min(width, height) * .80;
  const w = h * (bounds[2] - bounds[0]) / (bounds[3] - bounds[1]);
  return { x: (width - w) / 2, y: height * .94 - h, w, h };
}

export async function loadExtraCharacters(): Promise<void> {
  await Promise.all([
    ["/nova/kiro-football-emotions.png", (img: HTMLImageElement) => { footballSheet = img; }],
    ["/nova/kiro-profile-walk.png", (img: HTMLImageElement) => { walkSheet = img; }],
    ["/nova/integration-characters.png", (img: HTMLImageElement) => { serviceSheet = img; }],
    ["/nova/kiro-mint-ledge.png", (img: HTMLImageElement) => { ledgeSheet = img; }],
    ["/nova/kiro-mint-states.png", (img: HTMLImageElement) => { playSheet = img; }],
    ["/nova/kiro-holidays.png", (img: HTMLImageElement) => { holidaySheet = img; }],
  ].map(([src, accept]) => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => { (accept as (img: HTMLImageElement) => void)(img); resolve(); };
    img.onerror = () => resolve();
    img.src = src as string;
  })));
}

export const SERVICE_CHARACTERS: Record<string, number> = {
  integration_resend: 0, integration_n8n: 1, integration_vercel: 2, integration_github: 3,
};

export function drawHolidaySprite(ctx: CanvasRenderingContext2D, outfit: Outfit, width: number, height: number, bust: boolean): boolean {
  const index = ["witchHat", "pumpkin", "santaHat", "partyHat"].indexOf(outfit);
  if (index < 0 || !holidaySheet?.naturalWidth) return false;
  const cw = holidaySheet.naturalWidth / 4, ch = holidaySheet.naturalHeight / 2;
  if (!bust) {
    const b = HOLIDAY_BOUNDS[index], box = characterBox(width, height, b);
    ctx.drawImage(holidaySheet, index * Math.floor(cw) + b[0], Math.floor(ch) + b[1], b[2] - b[0], b[3] - b[1], box.x, box.y, box.w, box.h);
    return true;
  }
  const size = Math.min(width * .92, height);
  ctx.drawImage(holidaySheet, index * cw, bust ? 0 : ch, cw, ch, (width - size) / 2, height - size, size, size);
  return true;
}

export function hasHolidaySprite(outfit: Outfit): boolean {
  return !!holidaySheet?.naturalWidth && ["witchHat", "pumpkin", "santaHat", "partyHat"].includes(outfit);
}

export function drawPlaySprite(ctx: CanvasRenderingContext2D, activity: "walk" | "football", time: number, width: number, height: number, outfit: Outfit = "none"): boolean {
  if (activity === "football" && footballSheet?.naturalWidth) {
    const cw = footballSheet.naturalWidth / 4, ch = footballSheet.naturalHeight / 2;
    const size = Math.min(width * .92, height);
    ctx.drawImage(footballSheet, footballPose(time) * cw, outfit === "witchHat" ? ch : 0, cw, ch,
      (width - size) / 2 - width * .12, (height - size) / 2, size, size);
    return true;
  }
  if (activity === "walk" && walkSheet?.naturalWidth) {
    const cw = walkSheet.naturalWidth / 4, ch = walkSheet.naturalHeight / 2;
    const frame = Math.floor(time / .15) % 4;
    const size = Math.min(width * .92, height);
    ctx.drawImage(walkSheet, frame * cw, outfit === "witchHat" ? ch : 0, cw, ch,
      (width - size) / 2, (height - size) / 2, size, size);
    return true;
  }
  if (!playSheet?.naturalWidth) return false;
  const holiday = hasHolidaySprite(outfit);
  const source = holiday ? holidaySheet! : playSheet;
  const cw = source.naturalWidth / (holiday ? 4 : 3), ch = source.naturalHeight / (holiday ? 2 : 3);
  const sourceX = holiday ? ["witchHat", "pumpkin", "santaHat", "partyHat"].indexOf(outfit) * cw : 0;
  const sourceY = holiday ? ch : 0;
  const size = Math.min(width * .92, height);
  const x = (width - size) / 2, y = (height - size) / 2;
  const motion = playMotion(activity, time);
  // Use one registered illustration as a small cutout rig. Legs overlap under
  // the hoodie so their pivots stay hidden, while the face never changes size.
  const leg = (left: number, right: number, pivotX: number, angle: number) => {
    const top = .79;
    ctx.save();
    ctx.translate(x + pivotX * size, y + top * size);
    ctx.rotate(angle);
    ctx.drawImage(source, sourceX + left * cw, sourceY + top * ch, (right - left) * cw, (1 - top) * ch,
      (left - pivotX) * size, 0, (right - left) * size, (1 - top) * size);
    ctx.restore();
  };
  leg(.36, .56, .49, motion.leftLeg);
  leg(.56, .79, .60, motion.rightLeg);
  ctx.drawImage(source, sourceX, sourceY, cw, ch * .81, x, y, size, size * .81);
  return true;
}

export function drawServiceSprite(ctx: CanvasRenderingContext2D, id: string, width: number, height: number): boolean {
  if (!serviceSheet?.naturalWidth || SERVICE_CHARACTERS[id] == null) return false;
  const index = SERVICE_CHARACTERS[id];
  const cellW = serviceSheet.naturalWidth / 2, cellH = serviceSheet.naturalHeight / 2;
  const size = Math.min(width, height);
  ctx.drawImage(serviceSheet, (index % 2) * cellW, Math.floor(index / 2) * cellH, cellW, cellH,
    (width - size) / 2, (height - size) / 2, size, size);
  return true;
}
export function loadCharacter(): Promise<void> {
  if (sheet?.complete && sheet.naturalWidth) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { sheet = img; resolve(); };
    img.onerror = () => reject(new Error("KiroPiko character could not load"));
    img.src = "/nova/kiro-mint-states.png";
  });
}

export function spriteIndex(state: BotStateName, emote: BotEmoteName | null = null, waving = false): number {
  if (state === "sleeping" || emote === "yawn") return 5;
  if (emote === "happy" || state === "finished") return 2;
  if (emote === "love" || emote === "wink" || waving) return 1;
  if (emote === "proud") return 8;
  if (emote === "surprised" || state === "approval" || state === "question") return 7;
  if (state === "error" || state === "ratelimit" || state === "dizzy" || emote === "annoyed") return 4;
  if (state === "working" || state === "thinking" || state === "searching") return 3;
  return 0;
}

export function drawSprite(ctx: CanvasRenderingContext2D, index: number, width: number, height: number, bust = false, _blinking = false): boolean {
  if (!sheet?.naturalWidth) return false;
  if (!bust) {
    const b = STATE_BOUNDS[index] ?? STATE_BOUNDS[0], box = characterBox(width, height, b);
    ctx.drawImage(sheet, (index % 3) * Math.floor(sheet.naturalWidth / 3) + b[0], Math.floor(index / 3) * Math.floor(sheet.naturalHeight / 3) + b[1], b[2] - b[0], b[3] - b[1], box.x, box.y, box.w, box.h);
    return true;
  }
  if (bust && ledgeSheet?.naturalWidth) {
    const cellW = ledgeSheet.naturalWidth / 5;
    const cellH = ledgeSheet.naturalHeight;
    const frame = index === 0 ? 0 : index === 6 || index === 7 ? 1 : index === 3 || index === 4 ? 2 : index === 5 ? 4 : 3;
    const sourceTop = cellH * 0.10;
    const sourceHeight = cellH * 0.80;
    const dw = Math.min(width * 0.92, height * cellW / sourceHeight);
    const dh = dw * sourceHeight / cellW;
    ctx.drawImage(ledgeSheet, frame * cellW, sourceTop, cellW, sourceHeight, (width - dw) / 2, height - dh, dw, dh);
    return true;
  }
  const cw = sheet.naturalWidth / 3;
  const ch = sheet.naturalHeight / 3;
  const crop = bust ? 0.63 : 1;
  const dw = Math.min(width * 0.92, height / crop);
  const dh = dw * crop;
  const useIdle = index === 0 && idleSheet?.naturalWidth;
  const source = useIdle ? idleSheet! : sheet;
  const sourceW = useIdle ? source.naturalWidth / 2 : cw;
  const sourceH = useIdle ? source.naturalHeight : ch;
  const sourceX = useIdle ? 0 : (index % 3) * cw;
  const sourceY = useIdle ? 0 : Math.floor(index / 3) * ch;
  ctx.drawImage(source, sourceX, sourceY, sourceW, sourceH * crop,
    (width - dw) / 2, (height - dh) / 2, dw, dh);
  return true;
}
