import test from "node:test";
import assert from "node:assert/strict";
import { receiptFromHook, cleanReceipts, linkState } from "../src/nova/agent-link/model.ts";

test("hook installation never claims event delivery", () => {
  assert.equal(linkState(false,{installed:true,hookReady:true},{at:1000,event:"SessionStart"},1000),"preview");
  assert.equal(linkState(true,null,undefined),"unavailable");
  assert.equal(linkState(true,{installed:true,hookReady:false},undefined),"relay-missing");
  assert.equal(linkState(true,{installed:false,hookReady:true},undefined),"not-configured");
  assert.equal(linkState(true,{installed:true,hookReady:true},undefined),"waiting");
});
test("recent receipt is delivery evidence; silence and restart are not a heartbeat", () => {
  const config = {installed:true,hookReady:true};
  const receipt = {at:1000,event:"SessionEnd"};
  assert.equal(linkState(true,config,receipt,2000),"received");
  assert.equal(linkState(true,config,receipt,62000),"history");
  assert.equal(linkState(true,{...config,installed:false},receipt,2000),"not-configured");
  assert.equal(linkState(true,config,receipt,500),"history");
});
test("receipts identify the real agent and never persist commands or paths", () => {
  const payload = {hook_event_name:"PreToolUse",coucou_agent:"codex",cwd:"C:/private",tool_input:{command:"secret"},session_id:"private-session"};
  const result = receiptFromHook(payload,1000);
  assert.deepEqual(result,{id:"codex",receipt:{at:1000,event:"PreToolUse"}});
  assert.equal(receiptFromHook({...payload,coucou_agent:"../wrong"},1000),null);
  assert.equal(receiptFromHook({hook_event_name:"StatusLine"},1000),null);
  assert.equal(receiptFromHook({hook_event_name:"unexpected"},1000),null);
  assert.equal(receiptFromHook({hook_event_name:"SessionStart",term_editor:"cursor"},1000).id,"claude");
  assert.deepEqual(cleanReceipts({codex:result.receipt,bad:{at:2000,event:"SessionStart"},wrong:{at:100,event:"junk"}},1000),{codex:result.receipt});
  assert.deepEqual(cleanReceipts({codex:{...result.receipt,command:"secret",cwd:"private"}},1000),{codex:result.receipt});
});
