// Original NOVA tones, synthesized here; no Coucou media is read or copied.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const names = ["peek", "open", "close", "hover", "blip", "slap", "annoyed", "dizzy", "greet", "work", "finish", "error", "approval", "question", "approve", "gulp", "tick", "send", "love", "pop", "proud", "wink", "yawn", "attach", "think", "search", "rate", "sleep", "greeting"];
const dir = fileURLToPath(new URL("../public/sounds/", import.meta.url));
mkdirSync(dir, { recursive: true });
for (const [index, name] of names.entries()) {
  const sampleRate = 22050;
  const duration = name === "greeting" ? 0.6 : 0.14;
  const count = Math.floor(sampleRate * duration);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(count * 2, 40);
  const frequency = 260 * 2 ** ((index % 12) / 12);
  for (let n = 0; n < count; n++) {
    const t = n / sampleRate;
    const envelope = Math.min(1, t / 0.012) * (1 - t / duration) ** 2;
    const value = Math.sin(2 * Math.PI * frequency * t) + 0.22 * Math.sin(2 * Math.PI * frequency * 1.5 * t);
    wav.writeInt16LE(Math.round(value * envelope * 11000), 44 + n * 2);
  }
  writeFileSync(`${dir}/${name}.wav`, wav);
}
