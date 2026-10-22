import { u, ul } from "../i18n/kiro";
import { language } from "../i18n/i18n";
import { h, clear } from "../views/dom";
import { State } from "../core/state";
import { Bridge } from "../core/bridge";
import { panel } from "./panel";
import type { ViewActions, ViewHost } from "../views/views";
import { openSettingsSection } from "./settings-route";
const steps = [
  ["Следите за агентами из капсулы", "Киро собирает состояния AI-агентов у верхнего края экрана: кто работает, кто завершил задачу и кто ждёт вашего ответа. Нажмите на капсулу, чтобы открыть список."],
  ["Подключите первого агента", "Откройте раздел «Агенты», выберите инструмент и просмотрите изменения перед подключением. Затем запустите новую сессию агента. Его события появятся в капсуле; запросы разрешений потребуют вашего решения."],
];
export function buildOnboarding(actions: ViewActions): ViewHost {
  let step = 0;
  const body = h("div", { class: "nova-tools" });
  const message = h("p", { class: "nova-status", role: "status" });
  const finish = async (connect = false) => {
    const next = { ...State.settings, novaOnboardingDone: true };
    try { await Bridge.saveSettings(next); State.settings = next; State.notify(); actions.setView(State.defaultView()); if (connect) await openSettingsSection("agents"); }
    catch (err) { message.textContent = u("Не удалось сохранить: {error}", {error:String(err)}); }
  };
  const render = () => {
    clear(body);
    body.append(h("small", { text: u("Шаг {step} из {total}", {step:step+1,total:steps.length}) }), h("strong", { text: ul(steps[step][0]) }), h("p", { text: ul(steps[step][1]) }),
      h("div", { class: "nova-footer" },
        h("button", { class: "btn secondary", text: ul("Назад"), disabled: step === 0, onclick: () => { step--; render(); } }),
        h("button", { class: "btn primary", text: step === steps.length - 1 ? u("Подключить первого агента") : u("Далее"), onclick: () => { if (step === steps.length - 1) void finish(true); else { step++; render(); } } }),
        h("button", { class: "btn secondary", text: ul("Пропустить"), onclick: () => void finish() })), message);
  };
  render();
  let lastLanguage = language();
  return { el: panel(ul("Знакомство с KiroPiko"), ul("ПЕРВЫЙ ЗАПУСК"), body), sync() { if (lastLanguage !== language()) { lastLanguage = language(); render(); } }, focus() { step = 0; render(); } };
}
