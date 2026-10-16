import { test } from "node:test";
import assert from "node:assert/strict";
import { characterBox, STATE_BOUNDS } from "../src/nova/character/sprites.ts";

test("character frames share a baseline and visible height without stretching the illustration", () => {
  for (const [width, height] of [[28, 28], [120, 120], [80, 140], [160, 90]]) {
    for (const bounds of STATE_BOUNDS) {
      const box = characterBox(width, height, bounds);
      assert.ok(Math.abs(box.y + box.h - height * .94) < 1e-8);
      assert.ok(Math.abs(box.h - Math.min(width, height) * .8) < 1e-8);
      assert.ok(Math.abs(box.w / box.h - (bounds[2] - bounds[0]) / (bounds[3] - bounds[1])) < 1e-8);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= width);
    }
  }
});
