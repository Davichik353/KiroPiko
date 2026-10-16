import { Bridge, IS_TAURI } from "../core/bridge";
import { h } from "../views/dom";

export function supportSection(version:string):HTMLElement {
  const report=h("textarea",{class:"support-report","aria-label":"Отчёт о проблеме",readOnly:true,rows:9,hidden:true}) as HTMLTextAreaElement;
  const status=h("p",{class:"hint",role:"status","aria-live":"polite",text:`Версия ${version || "превью"}. Проверка обновлений обращается к GitHub только по кнопке.`});
  const make=h("button",{class:"primary",text:"Что сломалось?"});
  const copy=h("button",{text:"Скопировать отчёт",hidden:true});
  make.onclick=async()=>{
    make.disabled=true;
    try {
      report.value=await Bridge.supportReport() ?? "Отчёт доступен в установленном приложении Windows.";
      report.hidden=false;copy.hidden=false;
      status.textContent="Отчёт остаётся здесь. В нём нет ключей, переписки, команд и путей к проектам. Просмотрите его перед отправкой.";
    } finally {make.disabled=false;}
  };
  copy.onclick=async()=>{try {await navigator.clipboard.writeText(report.value);status.textContent="Отчёт скопирован. Отправьте его тому, кто помогает исправить проблему.";}catch {report.select();status.textContent="Выделен отчёт — нажмите Ctrl+C.";}};
  const check=h("button",{text:"Проверить обновления"});
  const download=h("button",{text:"Скачать установщик",hidden:true});
  check.onclick=async()=>{
    check.disabled=true;download.hidden=true;status.textContent="Проверяем выпуски KiroPiko…";
    try {
      if(!IS_TAURI)throw new Error("Проверка доступна в установленном приложении Windows.");
      const release=await Bridge.checkUpdates();
      if(!release)status.textContent="Установщик ещё не опубликован в выпусках GitHub. Повторите позже.";
      else if(!release.newer)status.textContent=`У вас актуальная версия ${version}.`;
      else {
        status.textContent=`Доступна ${release.version} (preview). Скачайте установщик, закройте KiroPiko и запустите скачанный файл. Настройки сохранятся.`;
        download.hidden=false;download.onclick=()=>{void Bridge.openUrl(release.url);};
      }
    } catch(error){status.textContent=(error instanceof Error ? error.message : String(error)).slice(0,240);} finally {check.disabled=false;}
  };
  return h("section",{},h("h2",{text:"Помощь и обновления"}),h("div",{class:"row"},make,copy,check,download),status,report);
}
