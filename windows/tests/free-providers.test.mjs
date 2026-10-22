import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { FREE_STARTERS, freeStarterSettings } from "../src/core/free-providers.ts";
import { DEFAULT_SETTINGS } from "../src/core/state.ts";
import { providerDef, pickModel } from "../src/core/providers.ts";
import { freeProvidersSection } from "../src/settings/free-providers.ts";
import { Bridge } from "../src/core/bridge.ts";
import { setLanguage } from "../src/i18n/i18n.ts";
import { installFakeDom } from "./fakedom.mjs";
afterEach(()=>mock.restoreAll());
const click = async button => { for (const listener of button.listeners.get("click")) await listener({}); };

test("free presets select exact models and disable automatic routing",()=>{
  for (const preset of FREE_STARTERS) {
    const before={...DEFAULT_SETTINGS,chatAutoModel:true};
    const next=freeStarterSettings(before,preset.id,[preset.model]);
    assert.equal(next.chatProvider,preset.id); assert.equal(next.chatAutoModel,false);
    assert.equal(next.chatModels[preset.id],preset.model);
    assert.equal(before.chatProvider,DEFAULT_SETTINGS.chatProvider);
    assert.throws(()=>freeStarterSettings(before,preset.id,["paid-model"]));
  }
});
test("free OpenRouter selection never silently falls back to a paid model",()=>{
  const router=providerDef("openrouter");
  assert.equal(pickModel(router,["paid/model","free/model:free"],"openrouter/free"),"free/model:free");
  assert.equal(pickModel(router,["paid/model","openrouter/auto"],"gone/model:free"),null);
  assert.equal(pickModel(router,["paid/model"],"paid/model"),"paid/model");
});
test("no key or missing starter never changes the selected provider",async()=>{
  installFakeDom();setLanguage("ru");let applied=0;
  const view=freeProvidersSection(()=>DEFAULT_SETTINGS,async()=>applied++);
  const activate=view.find("button").find(button=>button.getAttribute("aria-label")==="Выбрать Groq для чата");
  mock.method(Bridge,"secretPresent",async()=>false);
  const models=mock.method(Bridge,"chatModels",async()=>[]);
  await click(activate);assert.equal(applied,0);assert.equal(models.mock.callCount(),0);
  mock.method(Bridge,"secretPresent",async()=>true);
  await click(activate);assert.equal(applied,0);assert.match(view.textContent,/Стартовая модель недоступна/);
  mock.method(Bridge,"chatModels",async()=>[{id:FREE_STARTERS[0].model}]);
  await click(activate);assert.equal(applied,1);assert.equal(activate.disabled,false);
});
