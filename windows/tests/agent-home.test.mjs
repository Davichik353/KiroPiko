import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { installFakeDom } from "./fakedom.mjs";
import { State } from "../src/core/state.ts";
import { setLanguage } from "../src/i18n/i18n.ts";
import { buildDeveloper } from "../src/nova/developer/view.ts";
import { Bridge } from "../src/core/bridge.ts";

test("agent home guides first connection without mixing in integrations", () => {
  installFakeDom(); setLanguage("ru"); State.pendingApproval = null;
  State.tasks = [{id:"service",isIntegration:true,state:"working"}];
  const view = buildDeveloper({}); view.sync();
  assert.match(view.el.textContent, /Подключить первого агента/);
  assert.equal(view.el.find(".nova-session").length, 0);
  assert.equal(State.defaultView(), "developer");
});
test("configured agents without sessions are not asked to connect again", async () => {
  installFakeDom(); setLanguage("ru"); State.pendingApproval = null; State.tasks = [];
  mock.method(Bridge,"hooksStatus",async()=>({installed:true,hookReady:true}));
  mock.method(Bridge,"agentHooksList",async()=>[]);
  try {
    const view = buildDeveloper({}); await view.focus(); view.sync();
    assert.match(view.el.textContent,/Хуки готовы: Claude Code/);
    assert.equal(view.el.find("button").some(button=>button.textContent==="Подключить первого агента"),false);
    mock.method(Bridge,"hooksStatus",async()=>null);
    await view.focus(); view.sync();
    assert.match(view.el.textContent,/Не удалось проверить подключение/);
  } finally {mock.restoreAll();}
});

test("waiting decisions appear once before work and keep approval routing", () => {
  installFakeDom(); setLanguage("ru");
  const task = (id,state) => ({id,name:id,state,isIntegration:false,steps:[],sessionCwd:"C:/project"});
  State.tasks = [task("done","finished"),task("busy","working"),task("waiting","approval")];
  State.pendingApproval = {pillId:"waiting",requestId:"request",tool:"Bash",command:"echo test"};
  const routed = [];
  const view = buildDeveloper({setFocus:id=>routed.push(id),setView:view=>routed.push(view)}); view.sync();
  const rows = view.el.find(".nova-session");
  assert.equal(rows.length, 3);
  assert.match(rows[0].textContent,/waiting/);
  assert.match(rows[1].textContent,/busy/);
  for (const fn of rows[0].listeners.get("click")) fn({});
  assert.deepEqual(routed,["waiting","approval"]);
  assert.equal(State.defaultView(), "approval");
  State.pendingApproval = {...State.pendingApproval,questions:[{question:"Choose"}]};
  assert.equal(State.defaultView(), "question");
  State.pendingApproval = null;
});
