import {test,afterEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {attachmentProblem} from '../src/core/attachments.ts';
import {chooseChatFile} from '../src/core/attach-file.ts';
import {Bridge} from '../src/core/bridge.ts';
import {State} from '../src/core/state.ts';
import {setLanguage} from '../src/i18n/i18n.ts';
import {u} from '../src/i18n/kiro.ts';
afterEach(()=>{mock.restoreAll();State.filePreparing=false;State.stateOverride=null;State.droppedFile=null;State.chatHistory=[];});
test('attachment support explains unsupported formats, PDF routing and size limits',()=>{
 assert.equal(attachmentProblem({name:'readme.md',size:500},'groq'),null);
 assert.equal(attachmentProblem({name:'file.pdf',size:500},'anthropic'),null);
 assert.match(attachmentProblem({name:'file.pdf'},'openai'),/Anthropic/);
 assert.match(attachmentProblem({name:'a.png'},'ollama'),/только текст/);
 assert.match(attachmentProblem({name:'file.docx'},'anthropic'),/формат/);
 assert.match(attachmentProblem({name:'big.txt',size:200001},'groq'),/слишком большой/);
});
test('cancel and reset failure preserve the current conversation; successful selection starts a file chat',async()=>{
 State.settings={...State.settings,chatProvider:'groq'};State.chatHistory=[{role:'user',id:1,content:'keep me'}];
 const before=State.chatHistory;
 mock.method(Bridge,'pickChatFile',async()=>null);
 const reset=mock.method(Bridge,'chatResetChecked',async()=>{});
 assert.equal((await chooseChatFile()).attached,false);assert.equal(State.chatHistory,before);assert.equal(reset.mock.callCount(),0);
 const file={name:'notes.txt',path:'inbox/notes.txt',size:30};
 mock.method(Bridge,'pickChatFile',async()=>file);mock.method(Bridge,'chatResetChecked',async()=>{throw Error('offline');});
 assert.equal((await chooseChatFile()).attached,false);assert.equal(State.chatHistory,before);assert.equal(State.filePreparing,false);
 mock.method(Bridge,'chatResetChecked',async()=>{});
 assert.equal((await chooseChatFile()).attached,true);assert.deepEqual(State.chatHistory,[]);assert.equal(State.droppedFile,file);assert.equal(State.promptContext.path,file.path);
});
test('unsupported selection never resets chat or reports successful attachment',async()=>{
 State.settings={...State.settings,chatProvider:'groq'};State.chatHistory=[{role:'user',id:1,content:'keep'}];
 mock.method(Bridge,'pickChatFile',async()=>({name:'scan.pdf',size:20,path:'inbox/scan.pdf'}));const reset=mock.method(Bridge,'chatResetChecked',async()=>{});
 const result=await chooseChatFile();assert.equal(result.attached,false);assert.match(result.message,/Anthropic/);assert.equal(reset.mock.callCount(),0);assert.equal(State.chatHistory.length,1);
});
test('attachment copy has English translations',()=>{
 setLanguage('en');
 for(const file of ['core/attachments.ts','core/attach-file.ts','views/upload.ts']){
  const text=readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8');
  for(const [literal] of text.matchAll(/"(?:[^"\\]|\\.)*"/g)){const copy=JSON.parse(literal);if(/[А-Яа-яЁё]/.test(copy))assert.equal(/[А-Яа-яЁё]/.test(u(copy)),false,copy);}
 }
});
