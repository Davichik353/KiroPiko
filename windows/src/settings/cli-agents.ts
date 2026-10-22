import {Bridge,IS_TAURI} from "../core/bridge";
import {ACCOUNT_AGENTS,CLI_STATES,validCliReport,type CliAction,type CliReport} from "../core/cli-agents";
import {h,clear} from "../views/dom";
import {u} from "../i18n/kiro";

export function cliAgentsSection(){
  const section=h("section",{class:"account-agents"},h("h2",{text:u("Агенты через ваш аккаунт")}),
    h("p",{class:"hint",text:u("Вход выполняется в официальном Codex, Cursor или Claude Code. KiroPiko запускает установленный CLI и показывает результат проверки. Подписка и лимиты сервиса сохраняются; ключ API вводить не нужно.")}),
    h("p",{class:"hint",text:u("«Тест ответа» отправляет только короткую проверочную фразу и расходует лимит аккаунта. Обычные задачи выполняются в терминале агента; встроенный чат KiroPiko продолжает использовать выбранного API-провайдера.")}));
  let busy=false;
  const updates:(()=>void)[]=[];
  for(const agent of ACCOUNT_AGENTS){
    let latest:CliReport|null=null;
    const report=h("div",{class:"agent-link-report",role:"status","aria-live":"polite"},h("p",{class:"hint",text:u("Ещё не проверено. Нажмите «Проверить вход».")}));
    const buttons:HTMLButtonElement[]=[];
    const row=h("div",{class:"row"});
    const update=()=>buttons.forEach(b=>{const action=b.dataset.action;b.disabled=busy || !IS_TAURI || (action!=="status" && !latest?.found) || ((action==="test" || action==="open") && !(latest?.authenticated && latest.mode==="account"));});
    updates.push(update);
    async function run(action:CliAction){
      if(busy || !IS_TAURI)return;
      busy=true;latest=null;updates.forEach(f=>f());clear(report);report.append(h("p",{text:u("Проверяем официальный CLI…")}));
      try{
        const fresh=await Bridge.cliAgent(agent.id,action);
        if(!validCliReport(fresh,agent.id))throw new Error("invalid-report");
        latest=fresh;
        const [title,description]=CLI_STATES[fresh.state];
        clear(report);report.append(h("strong",{text:u(title)}),h("p",{class:"hint",text:u(description)}),h("small",{text:u("Проверено: {time}",{time:new Date(fresh.at).toLocaleString()})}));
        if(fresh.state==="reply-ok")report.append(h("small",{text:u("Ответ: KIRO_OK · {seconds} с",{seconds:(fresh.duration/1000).toFixed(1)})}));
      }catch{clear(report);report.append(h("p",{text:u("Не удалось проверить подключение. Повторите попытку в установленном приложении Windows.")}));}
      finally{busy=false;updates.forEach(f=>f());}
    }
    for(const [action,label] of [["status","Проверить вход"],["login","Войти"],["test","Тест ответа"],["open","Открыть агента"]] as const){
      const button=h("button",{type:"button",text:u(label),"aria-label":`${agent.name}: ${u(label)}`,onclick:()=>void run(action)});
      button.dataset.action=action;buttons.push(button);row.append(button);
    }
    row.append(h("button",{type:"button",text:u("Инструкция ↗"),"aria-label":u("Инструкция {name}",{name:agent.name}),onclick:()=>void Bridge.openUrl(agent.docs)}));
    const card=h("div",{class:"account-agent"},h("h3",{text:agent.name}),report,row,
      h("small",{text:`${agent.login} · ${agent.status}`}));
    if(!IS_TAURI)card.append(h("p",{class:"hint",text:u("В браузерном превью запуск CLI недоступен. Откройте KiroPiko для Windows.")}));
    section.append(card);update();
  }
  return section;
}
