import type { BotEmoteName, BotStateName } from "../../core/layout";
import { footballPose } from "./play";
import type { Outfit } from "../../mochi/wardrobe";
import { KIRO_RIG, placePose } from "./rig";

let sheet: HTMLImageElement | null = null;
let serviceSheet: HTMLImageElement | null = null;
let ledgeSheet: HTMLImageElement | null = null;
let holidaySheet: HTMLImageElement | null = null;
let sleepingHolidaySheet: HTMLImageElement | null = null;
let walkSheet: HTMLImageElement | null = null;
let footballSheet: HTMLImageElement | null = null;

export function characterSource(index: number, outfit: Outfit, bust: boolean) {
  const costume = KIRO_RIG.holidayOutfits.indexOf(outfit);
  if (costume >= 0 && index === 5 && sleepingHolidaySheet?.naturalWidth) return { image: sleepingHolidaySheet, pose: (bust ? KIRO_RIG.sleepingHolidayBust : KIRO_RIG.sleepingHolidayFull)[costume], costume: true };
  if (costume >= 0 && holidaySheet?.naturalWidth) return { image: holidaySheet, pose: (bust ? KIRO_RIG.holidayBust : KIRO_RIG.holidayFull)[costume], costume: true };
  if (bust && ledgeSheet?.naturalWidth) {
    const frame = index === 0 ? 0 : index === 6 || index === 7 ? 1 : index === 3 || index === 4 ? 2 : index === 5 ? 4 : 3;
    return { image: ledgeSheet, pose: KIRO_RIG.ledge[frame], costume: false };
  }
  return sheet?.naturalWidth ? { image: sheet, pose: KIRO_RIG.states[index] ?? KIRO_RIG.states[0], costume: false } : null;
}

export async function loadExtraCharacters(): Promise<void> {
  await Promise.all([
    ["/nova/kiro-football-emotions.png", (img: HTMLImageElement) => { footballSheet = img; }],
    ["/nova/kiro-profile-walk.png", (img: HTMLImageElement) => { walkSheet = img; }],
    ["/nova/integration-characters.png", (img: HTMLImageElement) => { serviceSheet = img; }],
    ["/nova/kiro-mint-ledge.png", (img: HTMLImageElement) => { ledgeSheet = img; }],
    ["/nova/kiro-holidays.png", (img: HTMLImageElement) => { holidaySheet = img; }],
    ["/nova/kiro-holidays-sleep.png", (img: HTMLImageElement) => { sleepingHolidaySheet = img; }],
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

export function drawPlaySprite(ctx: CanvasRenderingContext2D, activity: "walk" | "football", time: number, width: number, height: number, outfit: Outfit = "none"): boolean {
  if (outfit !== "none" && outfit !== "witchHat") return false;
  const source = activity === "football" ? footballSheet : walkSheet;
  if (!source?.naturalWidth) return false;
  const frame = activity === "football" ? footballPose(time) : Math.floor(time / .15) % 4;
  const pose = (activity === "football" ? KIRO_RIG.football : KIRO_RIG.walk)[frame + (outfit === "witchHat" ? 4 : 0)];
  const p = placePose(pose, width, height, false);
  ctx.drawImage(source, ...pose.rect as [number,number,number,number], p.x - (activity === "football" ? width * .08 : 0), p.y, p.w, p.h);
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
