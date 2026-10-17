import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IslandAmbient} from '../src/island/ambient.ts';

test('hidden island decoration requests no frames and touches no canvas',()=>{
  const scene=Object.assign(Object.create(IslandAmbient.prototype),{el:{},ctx:new Proxy({}, {get(){throw new Error('hidden canvas used');}}),painted:true});
  assert.equal(scene.draw(1000,.016,640,300,false,false,'working'),false);
  assert.equal(scene.el.hidden,true);
});
test('reduced motion paints once; switching back to motion resumes the shared clock',()=>{
  const previous=globalThis.document;globalThis.document={hidden:false};
  let updates=0,draws=0;
  const ctx=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
  const scene=Object.assign(Object.create(IslandAmbient.prototype),{el:{style:{}},ctx,motion:{matches:true},size:'',dots:[],last:0,painted:false,
    cast:Array.from({length:5},()=>({x:.5,direction:1,bot:{update(){updates++;},draw(){draws++;}}}))});
  try{
    assert.equal(scene.draw(1000,.016,640,300,true,false,'idle'),false);
    assert.equal(draws,5);assert.equal(updates,0);
    scene.draw(2000,.016,640,300,true,false,'idle');assert.equal(draws,5);
    scene.motion.matches=false;
    assert.equal(scene.draw(3000,.016,640,300,true,false,'idle'),true);
    assert.equal(updates,5);
    assert.equal(scene.draw(4000,.016,640,300,true,true,'idle'),false);
    assert.equal(updates,5);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
