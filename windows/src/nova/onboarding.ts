import { h, clear } from "../views/dom";
import { State } from "../core/state";
import { Bridge } from "../core/bridge";
import { panel } from "./panel";
import type { ViewActions, ViewHost } from "../views/views";
const steps = [
  ["Ваш помощник на экране", "Нажмите на островок, чтобы открыть музыку. В верхней панели доступны чат, System Doctor, агенты и инструменты. Escape сворачивает панель."],
  ["Подключите рабочие инструменты", "В настройках выберите модель и настройте хуки агента. В разделе «Подключения» можно проверить ответ провайдера, состояние хуков и музыкальный плеер."],
  ["Разрешения под вашим контролем", "Микрофон и снимки экрана выключены по умолчанию. Диагностика читает показатели. Файлы и снимки отправляются модели только при отправке сообщения."],
  ["Настройте KiroPiko под себя", "Выберите размер персонажа и монитор в настройках. Прогулки отключаются отдельным переключателем. История событий доступна в инструментах."],
];
export function buildOnboarding(actions: ViewActions): ViewHost {
  let step = 0;
  const body = h("div", { class: "nova-tools" });
  const message = h("p", { class: "nova-status", role: "status" });
  const finish = async () => {
    const next = { ...State.settings, novaOnboardingDone: true };
    try { await Bridge.saveSettings(next); State.settings = next; State.notify(); actions.setView("overview"); }
    catch (err) { message.textContent = `Не удалось сохранить: ${String(err)}`; }
  };
  const render = () => {
    clear(body);
    body.append(h("small", { text: `Шаг ${step + 1} из ${steps.length}` }), h("strong", { text: steps[step][0] }), h("p", { text: steps[step][1] }),
      h("div", { class: "nova-footer" },
        h("button", { class: "btn secondary", text: "Назад", disabled: step === 0, onclick: () => { step--; render(); } }),
        h("button", { class: "btn primary", text: step === steps.length - 1 ? "Начать" : "Далее", onclick: () => { if (step === steps.length - 1) void finish(); else { step++; render(); } } }),
        h("button", { class: "btn secondary", text: "Пропустить", onclick: () => void finish() })), message);
  };
  render();
  return { el: panel("Знакомство с KiroPiko", "ПЕРВЫЙ ЗАПУСК", body), sync() {}, focus() { step = 0; render(); } };
}
