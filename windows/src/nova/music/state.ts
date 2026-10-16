export interface MediaSnapshot {
  source: string; title: string; artist: string; album: string; playing: boolean;
  position: number; duration: number; shuffle: boolean | null; repeat: number | null;
  canToggle: boolean; canPrevious: boolean; canNext: boolean; canSeek: boolean; canShuffle: boolean; canRepeat: boolean;
  yandexShuffle?: boolean; yandexRepeat?: boolean;
}
export function sourceName(source: string): string {
  const id = source.toLowerCase();
  if (id.includes("spotify")) return "Spotify";
  if (id === "ru.yandex.desktop.music" || id.includes("yandexmusic") || id.includes("yandex.music")) return "Яндекс Музыка";
  if (id.includes("apple") || id.includes("itunes")) return "Apple Music";
  if (id.includes("chrome")) return "Google Chrome · браузер";
  if (id.includes("msedge")) return "Microsoft Edge · браузер";
  if (id.includes("firefox")) return "Firefox · браузер";
  return source || "Активный плеер";
}
export function mediaPosition(snapshot: Pick<MediaSnapshot, "position" | "duration" | "playing">, elapsedSeconds: number): number {
  const duration = Number.isFinite(snapshot.duration) ? Math.max(0, snapshot.duration) : 0;
  const start = Number.isFinite(snapshot.position) ? snapshot.position : 0;
  return Math.min(duration, Math.max(0, start + (snapshot.playing ? Math.max(0, Math.min(3, elapsedSeconds)) : 0)));
}
export function mediaTime(value: number): string {
  const seconds = Number.isFinite(value) ? Math.floor(Math.max(0, value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
