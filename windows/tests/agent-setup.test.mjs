import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { installFakeDom } from "./fakedom.mjs";
import { Bridge } from "../src/core/bridge.ts";
import { setLanguage } from "../src/i18n/i18n.ts";
import { agentSetupSection, disposeAgentSetup } from "../src/settings/agent-setup.ts";
import { recordAgentEvent } from "../src/nova/agent-link/evidence.ts";

const claude = {installed:true,hookReady:true,settingsPath:"test",hookPath:"relay",planRelayInstalled:false};
const codex = {id:"codex",name:"Codex",installed:true,hookReady:true,path:"test",note:"Restart",approvals:true};
function setup() {
  installFakeDom(); setLanguage("ru");
  const saved = new Map();
  globalThis.localStorage = {getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
  mock.method(globalThis,"setInterval",()=>0);
  const view = agentSetupSection(claude,[codex],()=>document.createElement("div"));
  const select = view.find("select")[0]; select.value = "claude"; select.fire("change");
  return {view,select,report:view.find(".agent-link-report")[0]};
}
afterEach(()=>{disposeAgentSetup();mock.restoreAll();});
test("selected-agent receipt updates the status without rebuilding installation", () => {
  const {select,report} = setup();
  assert.equal(report.dataset.state,"waiting");
  select.value="codex"; select.fire("change");
  recordAgentEvent({hook_event_name:"SessionStart",coucou_agent:"gemini"});
  assert.equal(report.dataset.state,"waiting");
  recordAgentEvent({hook_event_name:"SessionStart",coucou_agent:"codex"});
  assert.equal(report.dataset.state,"received");
  assert.match(report.textContent,/SessionStart/);
});
test("refresh failure clears previous success and offers retry", async () => {
  const {view,report} = setup();
  mock.method(Bridge,"hooksStatus",async()=>{throw new Error("read failed");});
  mock.method(Bridge,"agentHooksList",async()=>null);
  const check = view.find("button").find(button=>button.textContent==="Проверить связь");
  for (const listener of check.listeners.get("click")) await listener({});
  assert.equal(report.dataset.state,"unavailable");
  assert.equal(check.disabled,false);
  mock.method(Bridge,"hooksStatus",async()=>claude);
  for (const listener of check.listeners.get("click")) await listener({});
  assert.equal(report.dataset.state,"waiting");
});
