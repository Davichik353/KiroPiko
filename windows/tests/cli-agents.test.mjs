import {test,afterEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCliReport,CLI_STATES} from '../src/core/cli-agents.ts';
import {cliAgentsSection} from '../src/settings/cli-agents.ts';
import {Bridge} from '../src/core/bridge.ts';
import {setLanguage} from '../src/i18n/i18n.ts';
import {u} from '../src/i18n/kiro.ts';
import {installFakeDom} from './fakedom.mjs';
afterEach(()=>mock.restoreAll());
const snapshot=(state='signed-in')=>({agent:'codex',found:true,authenticated:true,mode:'account',state,at:Date.now(),duration:8000});
async function click(button){for(const listener of button.listeners.get('click') || [])await listener({});await new Promise(r=>setTimeout(r,0));}
test('CLI reports reject unknown states and mismatched identities',()=>{
 assert.equal(validCliReport(snapshot(),'codex'),true);
 assert.equal(validCliReport(snapshot(),'claude'),false);
 assert.equal(validCliReport({...snapshot(),state:'connected-forever'},'codex'),false);
 assert.equal(validCliReport({...snapshot(),authenticated:'yes'},'codex'),false);
 assert.equal(validCliReport({...snapshot(),duration:NaN},'codex'),false);
});
test('CLI UI requires an account check before testing and clears stale success after failure',async()=>{
 installFakeDom();setLanguage('ru');const section=cliAgentsSection();
 const button=name=>section.find('button').find(b=>b.getAttribute('aria-label')===`Codex: ${name}`);
 const check=button('Проверить вход'),probe=button('Тест ответа');
 assert.equal(probe.disabled,true);
 const call=mock.method(Bridge,'cliAgent',async()=>snapshot());
 await click(check);assert.equal(probe.disabled,false);assert.match(section.textContent,/Авторизация подтверждена сейчас/);assert.doesNotMatch(section.textContent,/Ответ модели получен/);
 mock.method(Bridge,'cliAgent',async()=>snapshot('reply-ok'));await click(probe);assert.match(section.textContent,/Ответ модели получен/);
 mock.method(Bridge,'cliAgent',async()=>{throw Error('offline');});await click(check);assert.equal(probe.disabled,true);assert.doesNotMatch(section.textContent,/Ответ модели получен/);
 mock.method(Bridge,'cliAgent',async()=>({...snapshot('other-auth'),authenticated:null,mode:'other'}));await click(check);assert.equal(probe.disabled,true);
});
test('all account connection copy is translated',()=>{
 setLanguage('en');
 for(const copy of Object.values(CLI_STATES).flat())assert.equal(/[А-Яа-яЁё]/.test(u(copy)),false,copy);
 const source=readFileSync(new URL('../src/settings/cli-agents.ts',import.meta.url),'utf8');
 for(const [literal] of source.matchAll(/"(?:[^"\\]|\\.)*"/g)){const copy=JSON.parse(literal);if(/[А-Яа-яЁё]/.test(copy))assert.equal(/[А-Яа-яЁё]/.test(u(copy)),false,copy);}
});
