export type PlayActivity = "walk" | "football";

/** One shared clock for the illustrated pose and the ball's contact. */
export function footballPose(time: number): 0 | 1 | 2 | 3 {
  const phase = time - Math.floor(time / 3) * 3;
  return phase < .3 ? 0 : phase < .55 ? 1 : phase < .85 ? 2 : phase < 2.2 ? 3 : 0;
}

export function canPlay(input: { paused: boolean; listening: boolean; speaking: boolean; pinned: boolean; busy: boolean; view: string; expanded: boolean }): boolean {
  return !input.paused && !input.listening && !input.speaking && !input.pinned && !input.busy && !(input.expanded && ["prompt", "doctor", "developer", "nova-tools", "wardrobe"].includes(input.view));
}

/** A bounded 28-second visit: walking, a little football, then home. */
export function playFrame(seconds: number): { x: number; y: number; activity: PlayActivity; done: boolean } {
  const t = Math.max(0, seconds);
  const activity = t < 12 ? "walk" : "football";
  const progress = Math.min(t / 12, 1);
  // Constant travel speed matches the repeating steps; easing caused skating.
  const x = 0.2 + 0.55 * progress;
  return { x: Math.max(0, Math.min(1, x)), y: 0.83, activity, done: t >= 28 };
}

/** Shared leg/ball clock: wind-up, contact, flight and return. */
export function playMotion(activity: PlayActivity, time: number) {
  if (activity === "walk") {
    const stride = Math.sin(time * Math.PI * 2 / .9);
    return { leftLeg: stride * .38, rightLeg: -stride * .38, bounce: -Math.abs(stride) * .012, ballX: .81, ballY: .83 };
  }
  const phase = time - Math.floor(time / 3) * 3;
  const smooth = (x: number) => { const p = Math.max(0, Math.min(1, x)); return p * p * (3 - 2 * p); };
  const kick = phase < .3 ? .25 * smooth(phase / .3)
    : phase < .6 ? .25 - 1.2 * smooth((phase - .3) / .3)
    : phase < 1.1 ? -.95 * (1 - smooth((phase - .6) / .5)) : 0;
  const travel = phase < .55 ? 0 : phase < 1.35 ? smooth((phase - .55) / .8) : 1 - smooth((phase - 1.35) / 1.65);
  // Contact at .55 s; bounce off the right boundary and roll back to the foot.
  const flight = Math.max(0, Math.min(1, (phase - .55) / .8));
  const lift = phase < .55 ? 0 : phase < 1.35 ? Math.sin(flight * Math.PI) * .15
    : Math.abs(Math.sin((phase - 1.35) * Math.PI * 3)) * .035 * travel;
  return { leftLeg: 0, rightLeg: kick, bounce: 0, ballX: .79 + travel * .15, ballY: .86 - lift };
}

export function drawFootball(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const motion = playMotion("football", time);
  const x = width * motion.ballX;
  const y = height * motion.ballY;
  const r = width * 0.045;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath(); ctx.ellipse(x, height * .91, r, r * .22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(x, y); ctx.rotate((motion.ballX - .79) * 65);
  ctx.fillStyle = "#f7f5ff"; ctx.strokeStyle = "#282536"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#282536"; ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; const px = Math.cos(a) * r * .43, py = Math.sin(a) * r * .43; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
