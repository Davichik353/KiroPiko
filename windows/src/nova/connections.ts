import { h, clear } from "../views/dom";
import { State } from "../core/state";
import { Bridge, IS_TAURI } from "../core/bridge";
import { panel } from "./panel";
import type { ViewActions, ViewHost } from "../views/views";
export function buildConnections(actions: ViewActions): ViewHost {
  const results = h("div", { class: "nova-session-list", role: "status" });
  const check = h("button", { class: "btn primary", text: "Проверить подключения" });
  const item = (name: string, text: string) => results.append(h("div", { class: "nova-metric" }, h("strong", { text: name }), h("small", { text })));
  check.onclick = async () => {
    clear(results);
    if (!IS_TAURI) { item("Браузерное превью", "Проверка модели, хуков и плеера доступна в установленном KiroPiko для Windows."); return; }
    check.disabled = true;
    item("Проверяю…", "Будет выполнен запрос списка моделей выбранному провайдеру. Сообщения и файлы не отправляются.");
    const provider = State.settings.chatProvider;
    const checks = await Promise.allSettled([Bridge.chatModels(provider), Bridge.hooksStatus(), Bridge.agentHooksList(), Bridge.mediaSnapshot(), Bridge.phoneLinkStatus()]);
    clear(results);
    const [model, hooks, agents, music, phone] = checks;
    item(`Модель · ${provider}`, model.status === "fulfilled" ? model.value.length ? `Провайдер ответил: ${model.value.length} моделей. Генерация ответа не проверялась.` : "Нет доступных моделей. Проверьте ключ, адрес и выбранную модель." : `Ошибка: ${String(model.reason)}`);
    item("Claude Code", hooks.status === "fulfilled" && hooks.value ? `${hooks.value.installed ? "Хуки установлены" : "Хуки не установлены"} · ${hooks.value.hookReady ? "исполняемый файл готов" : "исполняемый файл не найден"}` : "Не удалось прочитать состояние хуков.");
    item("Другие агенты", agents.status === "fulfilled" && agents.value ? agents.value.map(agent => `${agent.name}: ${agent.installed && agent.hookReady ? "хуки готовы" : "настройте хуки в разделе агентов"}`).join(" · ") || "Нет установленных хуков." : "Не удалось прочитать состояние хуков. Откройте настройки агентов.");
    item("Телефон", phone.status !== "fulfilled" || !phone.value ? "Не удалось проверить связь. Откройте настройки Android Phone." : phone.value.error ? `Ошибка: ${phone.value.error}. Проверьте сеть и настройки Android Phone.` : !phone.value.enabled ? "Связь выключена. Включите Android Phone и покажите QR-код." : !phone.value.running ? "Сервер связи не запущен. Выключите и включите Android Phone." : phone.value.clients > 0 ? `Подключено устройств: ${phone.value.clients}` : "Сервер готов, но телефона нет. Откройте приложение на телефоне и проверьте общую сеть Wi-Fi.");
    item("Живые сессии", State.tasks.filter(t => !t.isIntegration).map(t => `${t.name}: ${t.state}`).join(" · ") || "События рабочих сессий ещё не поступали. Установка хуков сама по себе не подтверждает связь с агентом.");
    item("Музыкальный плеер", music.status === "fulfilled" ? music.value ? `${music.value.source} · ${music.value.title || "Без названия"} · ${music.value.playing ? "играет" : "пауза"}` : "Нет активной медиасессии. Запустите музыку." : `Ошибка: ${String(music.reason)}`);
    check.disabled = false;
  };
  return { el: panel("Подключения", "ПРОВЕРКА ПО ЗАПРОСУ", h("div", {}, check,
    h("button", { class: "btn secondary", text: "Настройки подключений", onclick: () => actions.openSettingsWindow() }), results)), sync() {} };
}
