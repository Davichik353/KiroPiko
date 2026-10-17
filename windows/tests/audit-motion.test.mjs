import {test} from "node:test";
import assert from "node:assert/strict";
import {Spring,Tracked} from "../src/core/anim.ts";
import {walkingPose,WALK_CYCLE,playMotion} from "../src/nova/character/play.ts";
test("walking artwork and leg motion share a complete cycle",()=>{
  assert.deepEqual([0,1,2,3].map(i=>walkingPose(i*WALK_CYCLE/4+.001)),[0,1,2,3]);
  assert.equal(walkingPose(WALK_CYCLE),0);
  assert.ok(Math.abs(playMotion("walk",WALK_CYCLE).leftLeg)<1e-9);
});
test("springs survive suspended tabs, invalid clocks and backwards time",()=>{
  for(const dt of [Infinity,NaN,-10,3600]) {
    const s=new Spring(0);s.target=1;s.step(dt);
    assert.ok(Number.isFinite(s.value)&&Number.isFinite(s.velocity));
    for(let i=0;i<240;i++)s.step(1/60);
    assert.ok(Math.abs(s.value-1)<.01);
  }
});
test("an immediate transition ends exactly at its target",()=>{
  const t=new Tracked(0);t.curveTowards(1,0,100);t.step(0,100);
  assert.ok(Number.isFinite(t.value));assert.equal(t.value,1);assert.equal(t.animating,false);
});
test("reduced motion stops inherited dance and the football clock",async()=>{
  const before=window.matchMedia;window.matchMedia=()=>({matches:true});
  try {
    const {NovaCharacter}=await import("../src/nova/character/adapter.ts");
    const bot=new NovaCharacter();bot.dancingLevel=1;bot.activity="football";
    const calls=[];const ctx=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
    bot.applyDance(ctx,120,120);assert.deepEqual(calls,[]);
    bot.draw(ctx,120,120);const first=calls.splice(0);
    bot.draw(ctx,120,120);assert.deepEqual(calls,first);
    assert.equal(bot.busy,false);
  } finally {window.matchMedia=before;}
});
