import { Bridge, IS_TAURI } from "../core/bridge";
import { PROVIDERS, activeModel, withModel, type ProviderId } from "../core/providers";
import type { Settings } from "../core/state";
import { h, clear } from "../views/dom";
import { u } from "../i18n/kiro";

export function aiSetupSection(get:()=>Settings, apply:(next:Settings)=>Promise<void>) {
  const provider = h("select", {"aria-label":u("1. Выберите сервис")}, ...PROVIDERS.filter(p=>p.key).map(p=>h("option",{value:p.id,text:p.name}))) as HTMLSelectElement;
  provider.value = PROVIDERS.find(p=>p.id===get().chatProvider && p.key)?.id ?? "groq";
  const key = h("input",{type:"password",autocomplete:"off","aria-label":u("2. API-ключ"),placeholder:u("Новый ключ или оставьте сохранённый")}) as HTMLInputElement;
  const models = h("select",{"aria-label":u("Модель"),disabled:true},h("option",{value:"",text:u("Сначала получите список моделей")})) as HTMLSelectElement;
  const status = h("p",{class:"hint",role:"status","aria-live":"polite"});
  const load = h("button",{text:u("Сохранить ключ и получить модели"),type:"button"});
  const probe = h("button",{text:u("3. Проверить ответ"),type:"button",disabled:true});
  const use = h("button",{text:u("Использовать в чате"),type:"button",disabled:true,class:"primary"});
  let verified = "";
  function invalidate(){verified="";use.disabled=true;}
  provider.onchange=()=>{key.value="";clear(models);models.disabled=true;probe.disabled=true;invalidate();status.textContent="";};
  key.oninput=()=>{probe.disabled=true;invalidate();};
  models.onchange=invalidate;
  function busy(on:boolean){provider.disabled=key.disabled=load.disabled=models.disabled=on;probe.disabled=on || !models.value;use.disabled=on || verified!==`${provider.value}/${models.value}`;}
  load.onclick=async()=>{
    if(!IS_TAURI){status.textContent=u("Ключи и API доступны в установленном KiroPiko для Windows.");return;}
    invalidate();busy(true);clear(models);
    try {
      const def=PROVIDERS.find(p=>p.id===provider.value)!;
      if(key.value.trim()){await Bridge.secretSet(def.key!,key.value.trim());key.value="";}
      if(!await Bridge.secretPresent(def.key!))throw new Error("missing-key");
      const offered=await Bridge.chatModels(def.id);
      for(const model of offered)models.append(h("option",{value:model.id,text:model.label || model.id}));
      const current=activeModel({...get(),chatProvider:def.id});
      if(offered.some(m=>m.id===current))models.value=current;
      if(!offered.length)throw new Error("no-models");
      status.textContent=u("Выберите модель. Проверка отправит короткий запрос и расходует её квоту; стоимость зависит от тарифа.");
    }catch{status.textContent=u("Не удалось получить модели. Проверьте ключ, доступ к сервису и соединение.");}
    finally{busy(false);}
  };
  probe.onclick=async()=>{
    invalidate();busy(true);status.textContent=u("Проверяем ответ модели…");
    try{const result=await Bridge.chatProbe(provider.value,models.value);if(!result.text.trim())throw new Error("empty");verified=`${provider.value}/${models.value}`;status.textContent=u("Ответ получен. Связь проверена сейчас; можно выбрать модель для чата.");}
    catch{status.textContent=u("Модель не ответила. Проверьте квоту, права ключа и сеть. Попробуйте другую доступную модель.");}
    finally{busy(false);}
  };
  use.onclick=async()=>{if(verified!==`${provider.value}/${models.value}`)return;busy(true);try{await apply({...withModel(get(),provider.value as ProviderId,models.value),chatProvider:provider.value as ProviderId,chatAutoModel:false});status.textContent=u("Модель сохранена для чата.");}catch{status.textContent=u("Не удалось сохранить настройки. Повторите попытку.");}finally{busy(false);}};
  return h("section",{},h("h2",{text:u("Подключить AI за три шага")}),h("label",{},u("1. Выберите сервис"),provider),h("label",{},u("2. API-ключ"),key),load,models,h("div",{class:"row"},probe,use),status);
}
