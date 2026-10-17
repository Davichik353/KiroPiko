import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heroSnapshot,heroStateText} from '../src/settings/hero-model.ts';
const task=(id,state,isIntegration=false)=>({id,name:id,state,isIntegration,steps:['private command'],sessionCwd:'C:/private/project',source:'agent',color:'#fff',stepIndex:0});
test('settings scene gives waiting decisions priority without leaking task contents',()=>{
  const tasks=[task('busy','working'),task('done','finished'),task('waiting','approval'),task('failed','error')];
  const result=heroSnapshot(tasks,{},false);
  assert.deepEqual(result.members.map(m=>m.id),['waiting','failed','busy','done']);
  assert.deepEqual(Object.keys(result.members[0]).sort(),['id','name','state']);
  assert.equal(JSON.stringify(result).includes('private'),false);
  assert.equal(tasks[0].id,'busy');
});
test('unconfigured idle pills are not presented as connected agents',()=>{
  const tasks=[task('not-connected','idle',true),task('connected','idle',true)];
  assert.deepEqual(heroSnapshot(tasks,{connected:{configured:true}},true),{quiet:true,members:[{id:'connected',name:'connected',state:'idle'}]});
});
test('a busy scene stays bounded and labels terminal states correctly',()=>{
  const tasks=Array.from({length:20},(_,i)=>task(String(i),'working'));
  tasks.push({...task('last','question'),name:'A'.repeat(400)});
  const result=heroSnapshot(tasks,{},false);
  assert.equal(result.members.length,7);assert.equal(result.members[0].id,'last');assert.equal(result.members[0].name.length,60);
  assert.equal(heroStateText('question'),'Нужно твоё решение');
  assert.equal(heroStateText('ratelimit'),'Нужна помощь');
});
