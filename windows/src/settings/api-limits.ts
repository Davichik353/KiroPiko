import { Bridge, IS_TAURI } from "../core/bridge";
import { PROVIDERS } from "../core/providers";
import { remainingPercent, staleLimit, type ApiLimitSnapshot } from "../core/api-limits";
import { h, clear } from "../views/dom";
import { u, ul } from "../i18n/kiro";

const DASHBOARDS: Record<string,string> = {anthropic:"https://platform.claude.com/settings/limits",google:"https://aistudio.google.com/usage",openai:"https://platform.openai.com/settings/organization/limits",groq:"https://console.groq.com/settings/limits",openrouter:"https://openrouter.ai/activity"};
const KINDS: Record<string,string> = {"requests-day":"Запросы за сутки","tokens-minute":"Токены в минуту","free-requests-day":"Бесплатные запросы за сутки","credits-usd":"Лимит ключа, USD",requests:"Запросы · окно API",tokens:"Токены · окно API"};
export function apiLimitsSection() {
  const section = h("section",{class:"api-limits"},h("h2",{text:ul("Остаток лимита AI")}),
    h("p",{class:"hint",text:ul("Полоски показывают остаток по данным провайдера. Это лимиты API, а не подписки ChatGPT или Claude Code. Обновление не отправляет сообщения модели.")}));
  for (const provider of PROVIDERS.filter(p=>p.key)) {
    const body = h("div",{class:"quota-body",role:"status"});
    const refresh = h("button",{type:"button",text:ul("Обновить"),"aria-label":u("Обновить лимиты {name}",{name:provider.name})});
    const row = h("div",{class:"quota-provider"},h("div",{class:"row"},h("strong",{text:provider.name}),h("span",{class:"spacer"}),refresh,
      h("button",{type:"button",text:ul("Кабинет ↗"),"aria-label":u("Лимиты {name} в кабинете",{name:provider.name}),onclick:()=>{void Bridge.openUrl(DASHBOARDS[provider.id]);}})),body);
    function unknown(message: string) {
      clear(body);
      body.append(h("div",{class:"quota-track unknown",role:"progressbar","aria-label":u("Остаток лимита {name}",{name:provider.name}),"aria-valuetext":u("Лимит неизвестен")}),h("p",{class:"hint",text:message}));
    }
    function draw(snapshot: ApiLimitSnapshot) {
      if (snapshot.provider !== provider.id || !Array.isArray(snapshot.buckets)) throw new Error("Invalid quota snapshot");
      clear(body);
      for (const bucket of snapshot.buckets) {
        const percent = remainingPercent(bucket);
        if (percent === null) continue;
        const label = u(KINDS[bucket.kind] ?? bucket.kind);
        body.append(h("div",{class:"quota-heading"},h("span",{text:label}),h("span",{text:u("Осталось {remaining} из {limit}",{remaining:bucket.remaining,limit:bucket.limit})})),
          h("div",{class:percent<15?"quota-track low":"quota-track",role:"progressbar","aria-label":label,"aria-valuemin":0,"aria-valuemax":100,"aria-valuenow":Math.round(percent)},h("span",{style:`width:${percent}%`})));
        if (bucket.reset) body.append(h("small",{text:u("Сброс по данным API: {reset}",{reset:bucket.reset})}));
      }
      if (!body.childNodes.length) { unknown(u("API не раскрыл остаток. Для Groq, OpenAI и Anthropic данные появятся после ответа чата, если сервер передаст заголовки лимитов. Для Gemini проверьте кабинет.")); return; }
      body.append(h("small",{text:u("Данные на {time} · {scope}",{time:new Date(snapshot.at).toLocaleString(),scope:snapshot.source==="key"?u("квота ключа"):snapshot.model})}));
      if (staleLimit(snapshot.at)) body.append(h("p",{class:"hint",text:u("Это предыдущий снимок лимитов. Текущий остаток мог измениться; проверьте кабинет провайдера.")}));
    }
    refresh.addEventListener("click",async () => {
      if (!IS_TAURI) { unknown(u("Лимиты API доступны в установленном KiroPiko для Windows.")); return; }
      refresh.disabled = true;
      unknown(u("Проверяем лимиты…"));
      try { draw(await Bridge.apiLimits(provider.id)); }
      catch { unknown(u("Не удалось получить лимиты. Проверьте сохранённый ключ, соединение и кабинет провайдера.")); }
      finally { refresh.disabled = false; }
    });
    unknown(u("Лимит неизвестен. Нажмите «Обновить» или откройте кабинет провайдера."));
    section.append(row);
  }
  section.append(h("p",{class:"hint",text:ul("Ollama и LM Studio работают локально: облачной квоты нет, доступная скорость зависит от вашего компьютера. Для своего сервера лимиты определяет его владелец.")}));
  return section;
}
