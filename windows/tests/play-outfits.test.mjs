import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OUTFIT_SELECTIONS, resolveOutfit} from '../src/mochi/wardrobe.ts';
import {loadCharacter, loadExtraCharacters} from '../src/nova/character/sprites.ts';
import {drawPlayingAvatar} from '../src/nova/character/play-avatar.ts';

test('every seasonal and explicit outfit draws distinct walk and kick frames without dropping its costume', async () => {
  const priorImage=globalThis.Image, priorPath=globalThis.Path2D;
  globalThis.Image=class {set src(value){this.name=value;this.naturalWidth=2000;this.onload?.();}};
  globalThis.Path2D=class {ellipse(){} roundRect(){}};
  try {
    await loadCharacter(); await loadExtraCharacters();
    for(const selection of OUTFIT_SELECTIONS) for(const activity of ['walk','football']) {
      const outfit=resolveOutfit(selection,new Date(2026,9,17));
      const frames=[];
      for(const time of activity==='walk'?[.225,.675]:[0,.6]) {
        const images=[], rotations=[];
        const ctx=new Proxy({}, {get:(_,key)=>key==='drawImage'? (...args)=>images.push([args[0].name,...args.slice(1)]) : key==='rotate'?angle=>rotations.push(angle):()=>{},set:()=>true});
        assert.equal(drawPlayingAvatar(ctx,activity,time,180,180,outfit),true,`${selection} ${activity}`);
        assert.ok(images.length>0);
        if(['partyHat','pumpkin','santaHat'].includes(outfit)) assert.match(images[0][0],/kiro-holidays\.png/);
        frames.push(JSON.stringify({images,rotations}));
      }
      assert.notEqual(frames[0],frames[1],`${selection} must animate ${activity}`);
    }
  } finally {globalThis.Image=priorImage;globalThis.Path2D=priorPath;}
});
