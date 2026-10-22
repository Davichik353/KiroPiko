import type { Settings } from "./state";
import { withModel, type ProviderId } from "./providers";

// Reviewed against provider documentation on 2026-10-21. Free access depends
// on account tier, region, model availability and the provider's current quota.
export const FREE_STARTERS = [
  {id:"groq",name:"Groq",model:"openai/gpt-oss-20b",keys:"https://console.groq.com/keys",terms:"https://console.groq.com/docs/rate-limits",hint:"Free plan: есть лимиты запросов и токенов. Нужен собственный ключ Groq."},
  {id:"google",name:"Gemini",model:"gemini-3.5-flash-lite",keys:"https://aistudio.google.com/apikey",terms:"https://ai.google.dev/gemini-api/docs/pricing",hint:"Free tier доступен для отдельных моделей и регионов. На бесплатном тарифе данные могут использоваться для улучшения продуктов Google."},
  {id:"openrouter",name:"OpenRouter",model:"openrouter/free",keys:"https://openrouter.ai/keys",terms:"https://openrouter.ai/docs/guides/routing/model-variants/free",hint:"Маршрут openrouter/free выбирает бесплатные модели. Действуют лимиты аккаунта; платные модели доступны отдельно."},
] as const;

export function freeStarterSettings(settings: Settings, provider: ProviderId, offered: readonly string[]): Settings {
  const starter = FREE_STARTERS.find(p => p.id === provider);
  if (!starter || !offered.includes(starter.model)) throw new Error("starter-unavailable");
  return {...withModel(settings,provider,starter.model),chatProvider:provider,chatAutoModel:false};
}
