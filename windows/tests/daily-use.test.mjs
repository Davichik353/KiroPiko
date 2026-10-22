import {test,afterEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {lowQuota} from '../src/core/api-limits.ts';
import {capsuleTask} from '../src/core/capsule-task.ts';
import {readTasks,saveTask,clearTasks} from '../src/core/task-history.ts';
import {aiSetupSection} from '../src/settings/ai-setup.ts';
import {Bridge} from '../src/core/bridge.ts';
import {DEFAULT_SETTINGS} from '../src/core/state.ts';
import {installFakeDom} from './fakedom.mjs';
import {setLanguage} from '../src/i18n/i18n.ts';
afterEach(()=>mock.restoreAll());
test('quota warnings reject stale, unknown, other-provider and other-model data',()=>{
 const s={provider:'groq',model:'m',at:1000,source:'headers',buckets:[{limit:100,remaining:15}]};
 assert.equal(lowQuota(s,'groq','m',2000),true);
 for(const [snapshot,p,m,now] of [[s,'openai','m',2000],[s,'groq','other',2000],[s,'groq','m',122000],[{...s,buckets:[]},'groq','m',2000],[{...s,buckets:[{limit:100,remaining:NaN}]},'groq','m',2000]])assert.equal(lowQuota(snapshot,p,m,now),false);
});
test('capsule prioritizes decisions then errors and excludes integration cards',()=>{
 const tasks=[{id:'done',state:'finished'},{id:'work',state:'working'},{id:'err',state:'error'},{id:'ask',state:'question'},{id:'integration',state:'approval',isIntegration:true}];
 assert.equal(capsuleTask(tasks).id,'ask');assert.equal(capsuleTask(tasks.slice(0,3)).id,'err');assert.equal(capsuleTask([{id:'x',state:'idle'}]),undefined);
});
test('history survives reads, bounds records and tolerates corruption or full storage',()=>{
 let raw='[]';globalThis.localStorage={getItem:()=>raw,setItem:(_,v)=>{raw=v;},removeItem:()=>{raw='[]';}};
 for(let n=0;n<60;n++)assert.equal(saveTask({id:String(n),query:'q',answer:'a',provider:'groq',model:'m',at:n,duration:50,failed:false,context:false}),true);
 assert.equal(readTasks().length,50);assert.equal(readTasks()[0].id,'59');clearTasks();assert.deepEqual(readTasks(),[]);
 raw='invalid';assert.deepEqual(readTasks(),[]);localStorage.setItem=()=>{throw Error('full');};assert.equal(saveTask({query:'q',answer:'a'}),false);
});
test('AI setup only applies a model after a successful nonempty probe and invalidates on changes',async()=>{
 installFakeDom();setLanguage('ru');let applied=0;
 const section=aiSetupSection(()=>DEFAULT_SETTINGS,async()=>applied++);
 const selects=section.find('select');const provider=selects[0],models=selects[1];provider.value='groq';
 const button=text=>section.find('button').find(b=>b.textContent===text);
 const load=button('Сохранить ключ и получить модели'),probe=button('3. Проверить ответ'),use=button('Использовать в чате');
 mock.method(Bridge,'secretPresent',async()=>true);mock.method(Bridge,'chatModels',async()=>[{id:'m',label:'M'}]);
 await load.onclick();models.value='m';
 mock.method(Bridge,'chatProbe',async()=>{throw Error('offline');});await probe.onclick();assert.equal(use.disabled,true);await use.onclick();assert.equal(applied,0);
 mock.method(Bridge,'chatProbe',async()=>({text:'OK'}));await probe.onclick();assert.equal(use.disabled,false);await use.onclick();assert.equal(applied,1);
 models.value='other';models.onchange();assert.equal(use.disabled,true);await use.onclick();assert.equal(applied,1);
});
