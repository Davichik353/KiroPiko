import { Bridge, IS_TAURI, type AgentHookStatus, type HookStatus } from "../core/bridge";
import { h, clear } from "../views/dom";
import { u, ul } from "../i18n/kiro";
import { KNOWN_AGENTS } from "../island/agents";
import { agentBlock } from "./agents";
import { agentReceipts, onAgentReceipt } from "../nova/agent-link/evidence";
import { linkState, RECEIPT_KEY } from "../nova/agent-link/model";

let disposePrevious = () => {};
export function disposeAgentSetup() { disposePrevious(); disposePrevious = () => {}; }
export function agentSetupSection(initialClaude: HookStatus | null, initialAgents: AgentHookStatus[] | null,
  claudeInstaller: (status: HookStatus) => HTMLElement) {
  disposeAgentSetup();
  let claude = initialClaude, agents = initialAgents, checking = false, checkedAt = 0, generation = 0, statusKey = "";
  const names = {claude:"Claude Code", ...Object.fromEntries(Object.entries(KNOWN_AGENTS).filter(([id]) => id !== "claude-desktop").map(([id,a]) => [id,a.name]))};
  const choose = h("select", {"aria-label":ul("Выберите агента")}, ...Object.entries(names).map(([id,name]) => h("option",{value:id,text:name})));
  try { const saved = localStorage.getItem("kiropiko.setup.agent"); if (saved && saved in names) choose.value = saved; } catch { /* default agent */ }
  const report = h("div",{class:"agent-link-report",role:"status","aria-live":"polite"});
  const installer = h("div",{class:"agent-install-step"});
  const check = h("button",{class:"primary",text:ul("Проверить связь"),type:"button"});
  const section = h("section",{class:"agent-setup"},
    h("h2",{text:ul("Подключение агента")}),
    h("label",{},ul("1. Выберите агента"),choose),
    report, h("div",{class:"row"},check), installer,
    h("div",{class:"agent-test-step"},h("strong",{text:ul("3. Получите первое событие")}),
      h("p",{class:"hint",text:ul("После установки откройте новую сессию выбранного агента и отправьте короткий запрос. Оставьте KiroPiko открытым: состояние обновится, когда событие дойдёт до капсулы.")})));
  const config = () => choose.value === "claude" ? claude : agents?.find(a => a.id === choose.value) ?? null;
  function status() {
    const receipt = agentReceipts()[choose.value];
    const state = checking ? "checking" : linkState(IS_TAURI,config(),receipt);
    const nextKey = JSON.stringify([choose.value,state,receipt?.at,receipt?.event,checkedAt]);
    if (nextKey === statusKey) return;
    statusKey = nextKey;
    clear(report);
    const copy: Record<string,[string,string]> = {
      preview:["Проверка доступна в приложении Windows", "Браузерное превью не читает конфигурацию агента и не получает его события. Откройте установленный KiroPiko, чтобы подключить агента."],
      checking:["Проверяем конфигурацию…", "Читаем наличие хуков и файла ретранслятора. Запрос модели не отправляется."],
      unavailable:["Не удалось проверить подключение", "Состояние не определено. Повторите проверку в установленном приложении; старые результаты не считаются подтверждением связи."],
      "relay-missing":["Ретранслятор не найден", "Установка хуков заблокирована, чтобы не повредить работу агента. Перезапустите установленный KiroPiko; если не помогло, восстановите установку приложения."],
      "not-configured":["Агент не подключён", "Установите хуки ниже. Перед записью вы увидите изменения и расположение резервной копии."],
      waiting:["Хуки готовы · ждём первое событие", "Конфигурация установлена, файл ретранслятора найден. Реальная связь ещё не подтверждена. Запустите новую сессию и отправьте запрос агенту."],
      received:["Связь подтверждена событием", "Событие выбранного агента дошло до KiroPiko. Это подтверждение доставки, а не постоянный индикатор работы процесса."],
      history:["Ранее событие получено · новых пока нет", "Связь работала в указанное время. Отсутствие новых событий не означает обрыв: агент может ждать или сессия уже завершена."],
    };
    report.dataset.state = state;
    report.append(h("strong",{text:u(copy[state][0])}),h("p",{text:u(copy[state][1])}));
    if (receipt && IS_TAURI) report.append(h("small",{text:u("Последнее событие: {time} · {event}",{time:new Date(receipt.at).toLocaleString(),event:receipt.event})}));
    if (checkedAt) report.append(h("small",{text:u("Конфигурация проверена: {time}",{time:new Date(checkedAt).toLocaleTimeString()})}));
  }
  function drawInstaller() {
    clear(installer);
    installer.append(h("strong",{text:ul("2. Установите хуки и проверьте конфигурацию")}));
    const current = config();
    if (!IS_TAURI || !current) { installer.append(h("p",{class:"hint",text:ul("Установка появится после успешного чтения конфигурации в приложении Windows.")})); return; }
    const controls = choose.value === "claude" ? claudeInstaller(current as HookStatus) : agentBlock(current as AgentHookStatus);
    installer.append(current.installed && current.hookReady
      ? h("details",{class:"agent-advanced"},h("summary",{text:ul("Хуки установлены · управление")}),controls)
      : controls);
    installer.append(h("p",{class:"hint",text:ul("После установки нажмите «Проверить связь», затем запустите новую сессию. Удаление хуков доступно здесь же.")}));
  }
  choose.addEventListener("change",() => {
    try { localStorage.setItem("kiropiko.setup.agent",choose.value); } catch { /* optional preference */ }
    status(); drawInstaller();
  });
  check.addEventListener("click",async () => {
    if (checking) return;
    const request = ++generation; checking = true; check.disabled = true; status();
    try {
      if (IS_TAURI) {
        const [c,a] = await Promise.allSettled([Bridge.hooksStatus(),Bridge.agentHooksList()]);
        if (request !== generation) return;
        claude = c.status === "fulfilled" ? c.value : null;
        agents = a.status === "fulfilled" ? a.value : null;
        checkedAt = Date.now();
      }
    } finally {
      if (request === generation) { checking = false; check.disabled = false; status(); drawInstaller(); }
    }
  });
  const storage = (event: StorageEvent) => { if (event.key === RECEIPT_KEY) status(); };
  window.addEventListener("storage",storage);
  const unsubscribe = onAgentReceipt(status);
  // Re-evaluate receipt age without polling the backend or claiming a heartbeat.
  const timer = IS_TAURI ? window.setInterval(status,5000) : null;
  disposePrevious = () => { generation++; unsubscribe(); window.removeEventListener("storage",storage); if (timer !== null) clearInterval(timer); };
  status(); drawInstaller();
  return section;
}
