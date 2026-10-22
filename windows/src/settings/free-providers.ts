import { Bridge, IS_TAURI } from "../core/bridge";
import type { Settings } from "../core/state";
import { providerDef } from "../core/providers";
import { FREE_STARTERS, freeStarterSettings } from "../core/free-providers";
import { h } from "../views/dom";
import { u, ul } from "../i18n/kiro";

export function freeProvidersSection(getSettings: () => Settings, apply: (next:Settings) => Promise<void>) {
  const feedback = h("p",{class:"hint",role:"status","aria-live":"polite"});
  const section = h("section",{class:"free-providers"},h("h2",{text:ul("Бесплатный старт для чата")}),
    h("p",{class:"hint",text:ul("Создайте свой ключ у провайдера, сохраните его ниже и выберите модель. Бесплатный доступ ограничен квотами; наличие ключа не делает все модели бесплатными. Тариф и доступность зависят от аккаунта и региона.")}));
  for (const starter of FREE_STARTERS) {
    const activate = h("button",{class:"primary",text:ul("Выбрать для чата"),type:"button","aria-label":u("Выбрать {name} для чата",{name:starter.name})});
    activate.addEventListener("click",async () => {
      if (!IS_TAURI) { feedback.textContent = u("Ключи и API доступны в установленном KiroPiko для Windows."); return; }
      activate.disabled = true;
      try {
        if (!await Bridge.secretPresent(providerDef(starter.id).key!)) { feedback.textContent = u("Сначала сохраните ключ {name} в разделе ниже.",{name:starter.name}); return; }
        feedback.textContent = u("Получаем список моделей…");
        const models = await Bridge.chatModels(starter.id);
        let next: Settings;
        try { next = freeStarterSettings(getSettings(),starter.id,models.map(model=>model.id)); }
        catch { feedback.textContent = u("Стартовая модель недоступна. Проверьте тариф, квоту и доступные модели у провайдера."); return; }
        await apply(next);
        feedback.textContent = u("Выбрано: {name} · {model}. Автоподбор выключен. Список моделей получен; генерация ответа и бесплатная квота не проверялись.",{name:starter.name,model:starter.model});
      } catch { feedback.textContent = u("Не удалось выбрать модель. Проверьте ключ и соединение; настройки не подтверждены."); }
      finally { activate.disabled = false; }
    });
    section.append(h("div",{class:"free-provider-row"},
      h("strong",{text:starter.name}),h("code",{text:starter.model}),h("p",{class:"hint",text:u(starter.hint)}),
      h("div",{class:"row"},
        h("button",{type:"button",text:ul("Получить ключ ↗"),"aria-label":u("Получить ключ {name}",{name:starter.name}),onclick:()=>{void Bridge.openUrl(starter.keys);}}),
        h("button",{type:"button",text:ul("Ввести ключ"),"aria-label":u("Ввести ключ {name}",{name:starter.name}),onclick:()=>{const input=document.getElementById(`provider-key-${starter.id}`);input?.scrollIntoView({block:"center"});input?.focus({preventScroll:true});}}),
        h("button",{type:"button",text:ul("Лимиты и условия ↗"),"aria-label":u("Условия {name}",{name:starter.name}),onclick:()=>{void Bridge.openUrl(starter.terms);}}),activate)));
  }
  section.append(feedback,h("p",{class:"hint",text:ul("Для Gemini и Groq выберите бесплатный тариф у провайдера. KiroPiko не включает оплату и не определяет ваш тариф. Эти модели отвечают в чате и не выполняют действия на компьютере.")}));
  return section;
}
