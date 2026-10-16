import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceName, mediaPosition, mediaTime } from "../src/nova/music/state.ts";
test("source labels distinguish players and browsers without guessing a website", () => {
  assert.equal(sourceName("Spotify.exe"), "Spotify");
  assert.equal(sourceName("AppleMusic.App"), "Apple Music");
  assert.equal(sourceName("YandexMusic.exe"), "Яндекс Музыка");
  assert.equal(sourceName("chrome.exe"), "Google Chrome · браузер");
  assert.equal(sourceName("unknown-player"), "unknown-player");
});
test("progress stops on pause and cannot extrapolate past the track or stale snapshots", () => {
  assert.equal(mediaPosition({ position: 20, duration: 100, playing: false }, 2), 20);
  assert.equal(mediaPosition({ position: 99, duration: 100, playing: true }, 2), 100);
  assert.equal(mediaPosition({ position: 20, duration: 100, playing: true }, 20), 23);
  assert.equal(mediaPosition({ position: NaN, duration: NaN, playing: true }, 2), 0);
  assert.equal(mediaTime(61.9), "1:01");
  assert.equal(mediaTime(Infinity), "0:00");
});
