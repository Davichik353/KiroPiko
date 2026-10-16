import { test } from "node:test";
import assert from "node:assert/strict";
import { KIRO_RIG, placePose } from "../src/nova/character/rig.ts";

test("walking and football preserve the body scale of the idle outfit", () => {
  for (const [width,height] of [[28,28],[120,120],[80,140],[160,90]]) {
    const target=placePose(KIRO_RIG.states[0],width,height,false).eyeSpan;
    for (const pose of [...KIRO_RIG.walk,...KIRO_RIG.football]) {
      const p=placePose(pose,width,height,false);
      assert.ok(Math.abs(pose.span*p.scale-target)<1e-6);
      assert.ok(Math.abs(p.originY+pose.baseline*p.scale-height*.94)<1e-6);
      assert.ok(p.x>=-1 && p.y>=-1 && p.x+p.w<=width+1 && p.y+p.h<=height+1);
    }
  }
});
