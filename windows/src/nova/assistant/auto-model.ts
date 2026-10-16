import type { ModelInfo } from "../../core/bridge";
export function chooseAutoModel(models: ModelInfo[], current: string, query: string, image: boolean): { model: string; reason: string } {
  if (!models.length) throw new Error("Провайдер не вернул модели. Выберите модель вручную или проверьте подключение.");
  // Only these known multimodal families are considered automatically. Unknown
  // model names are never treated as proof that image input is supported.
  const chatModels = models.filter(m => !/embed|whisper|tts|transcrib|imagen|veo|guard/.test(m.id.toLowerCase()));
  const candidates = image ? chatModels.filter(m => /gemini|gpt-4o|gpt-4\.1|gpt-5|claude|vision|llama-4/.test(m.id.toLowerCase())) : chatModels;
  if (!candidates.length) throw new Error(image ? "Не найдена известная модель с поддержкой изображений. Выберите подходящую модель вручную." : "Провайдер не предложил подходящую чат-модель. Выберите модель вручную.");
  const complex = /код|ошиб|исправ|рефактор|алгоритм|code|debug|error|refactor/i.test(query);
  const preferred = candidates.find(m => (complex ? /sonnet|pro(?!vider)|120b|70b|coder/ : /mini|flash|instant|20b|8b|haiku/).test(m.id.toLowerCase()));
  const selected = preferred ?? candidates.find(m => m.id === current) ?? candidates[0];
  return { model: selected.id, reason: image ? "известная модель для изображений" : complex ? "задача с кодом/ошибкой" : "короткий общий запрос" };
}
