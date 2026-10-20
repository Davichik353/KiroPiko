import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { KIRO_RIG, placePose } from "../src/nova/character/rig.ts";
test("Windows and Android use exactly the same wardrobe artwork and pose landmarks", () => {
  const source = fs.readFileSync(new URL("../../design/kiro/wardrobe-rig.json", import.meta.url), "utf8");
  assert.equal(fs.readFileSync(new URL("../public/nova/wardrobe-rig.json", import.meta.url), "utf8"), source);
  assert.equal(fs.readFileSync(new URL("../../android/app/src/main/assets/kiro/wardrobe-rig.json", import.meta.url), "utf8"), source);
});
test("every outfit keeps head scale and baseline across square, wide and tall viewports", () => {
  for (const [width,height] of [[28,28],[120,120],[80,140],[160,90]]) {
    for (const bust of [false,true]) {
      const poses = bust ? [...KIRO_RIG.ledge,...KIRO_RIG.holidayBust,...KIRO_RIG.sleepingHolidayBust] : [...KIRO_RIG.states,...KIRO_RIG.holidayFull,...KIRO_RIG.sleepingHolidayFull];
      const spans=[];
      for (const pose of poses) {
        const p=placePose(pose,width,height,bust);
        assert.ok(Math.abs(p.originX+pose.eye[0]*p.scale-width/2)<1e-6);
        assert.ok(Math.abs(p.originY+pose.baseline*p.scale-height*.94)<1e-6);
        assert.ok(p.x>=-1 && p.y>=-1 && p.x+p.w<=width+1 && p.y+p.h<=height+1);
        spans.push(pose.span*p.scale);
      }
      assert.ok(Math.max(...spans)-Math.min(...spans)<1e-6);
    }
  }
});
test("holiday crops contain the complete witch brim and never use an equal four-column cut", () => {
  const p=KIRO_RIG.holidayBust[0];
  assert.ok(p.rect[0]+p.rect[2]>=475);
  assert.ok(p.rect[0]+p.rect[2]>1774/4);
  assert.equal(KIRO_RIG.holidayOutfits.length,4);
  for (const id of ["beanie","crown","sunglasses","roundGlasses","bow","scarf","bunnyEars"]) assert.ok(KIRO_RIG.accessories[id]?.length);
});

test("every costume has four registered walk and football poses on one ground line", () => {
  assert.deepEqual(KIRO_RIG.costumeWalkOutfits,["pumpkin","santaHat","partyHat"]);
  for(const poses of [KIRO_RIG.walk,KIRO_RIG.football,KIRO_RIG.costumeWalk,KIRO_RIG.costumeFootball]) {
    assert.equal(poses.length % 4,0);
    for(const pose of poses) for(const [width,height] of [[84,130],[180,180]]) {
      const p=placePose(pose,width,height,false);
      assert.ok(Math.abs(p.originY+pose.baseline*p.scale-height*.94)<1e-6);
      assert.ok(p.w>0 && p.h>0 && Number.isFinite(p.x+p.y));
    }
  }
});
test("sleep uses a dedicated closed-eye costume, other states keep the complete costume", async () => {
  const prior=globalThis.Image;
  globalThis.Image=class {
    set src(value) { this.name=value; const size=value.includes("ledge")?[2172,724]:value.includes("states")?[1274,1235]:[1774,887]; [this.naturalWidth,this.naturalHeight]=size; this.onload?.(); }
  };
  try {
    const sprites=await import("../src/nova/character/sprites.ts");
    const {drawAvatar}=await import("../src/nova/character/avatar.ts");
    await sprites.loadCharacter(); await sprites.loadExtraCharacters();
    for (const outfit of KIRO_RIG.holidayOutfits) {
      let previous=null;
      for (const index of [0,2,3,4,5,7]) {
        const calls=[];
        drawAvatar({drawImage:(...args)=>calls.push(args)},index,outfit,120,120,true);
        assert.equal(calls.length,1);
        assert.match(calls[0][0].name,index===5 ? /kiro-holidays-sleep/ : /kiro-holidays\.png/);
        const crop=calls[0].slice(1,5);
        if(index!==5) {
          if(previous) assert.deepEqual(crop,previous);
          previous=crop;
        }
      }
    }
  } finally { globalThis.Image=prior; }
});
