import { test } from "node:test";
import assert from "node:assert/strict";
import { canPlay, playFrame, playMotion, footballPose } from "../src/nova/character/play.ts";

const idle = { paused: false, listening: false, speaking: false, pinned: false, busy: false, view: "overview", expanded: false };
test("requests, work, voice and pause prevent autonomous play", () => {
  assert.equal(canPlay(idle), true);
  for (const flag of ["paused", "listening", "speaking", "pinned", "busy"]) assert.equal(canPlay({ ...idle, [flag]: true }), false);
  assert.equal(canPlay({ ...idle, view: "prompt", expanded: true }), false);
  assert.equal(canPlay({ ...idle, view: "prompt", expanded: false }), true);
});
test("legs alternate and football only moves after the kick reaches contact", () => {
  const stride = playMotion("walk", .225);
  assert.ok(stride.leftLeg > 0 && stride.rightLeg < 0);
  assert.ok(playMotion("walk", .675).leftLeg < 0);
  assert.equal(playMotion("football", .3).ballX, .79);
  assert.ok(playMotion("football", .6).rightLeg < -.8);
  assert.ok(playMotion("football", 1.2).ballX > .9);
  assert.equal(playFrame(16).x, playFrame(20).x);
});
test("football starts focused, winds up, contacts before celebrating; ball is continuous at loop", () => {
  assert.equal(footballPose(0), 0);
  assert.equal(footballPose(.4), 1);
  assert.equal(footballPose(.55), 2);
  assert.equal(footballPose(1.2), 3);
  assert.deepEqual(playMotion("football", 0), playMotion("football", 3));
  const ready = playMotion("football", .54), contact = playMotion("football", .55);
  assert.equal(ready.ballX, contact.ballX);
  assert.equal(ready.ballY, contact.ballY);
  assert.ok(playMotion("football", .8).ballY < contact.ballY);
});
test("a visit stays inside the surface and always has a return deadline", () => {
  for (let t = 0; t < 100; t += .2) {
    const frame = playFrame(t);
    assert.ok(frame.x >= 0 && frame.x <= 1);
    assert.ok(frame.y >= 0 && frame.y <= 1);
  }
  assert.equal(playFrame(0).activity, "walk");
  assert.equal(playFrame(15).activity, "football");
  assert.equal(playFrame(28).done, true);
});
