import { u } from "../i18n/kiro";
import { Bridge, IS_TAURI } from "../core/bridge";
import { h } from "../views/dom";

export function supportSection(version:string):HTMLElement {
  const report=h("textarea",{class:"support-report","aria-label":u("Отчёт о проблеме"),rows:9,hidden:true}) as HTMLTextAreaElement;
  const status=h("p",{class:"hint",role:"status","aria-live":"polite",text:u("Версия {version}. Проверка обновлений обращается к GitHub только по кнопке.", {version:version || u("превью")})});
  const description=h("textarea",{rows:3,"aria-label":u("Что произошло и как повторить?"),placeholder:u("Что произошло и как повторить?"),maxLength:4000}) as HTMLTextAreaElement;
  const make=h("button",{class:"primary",text:u("Сообщить о проблеме")});
  const copy=h("button",{text:u("Скопировать отчёт"),hidden:true});
  make.onclick=async()=>{
    make.disabled=true;
    try {
      const diagnostic=await Bridge.supportReport() ?? u("Отчёт доступен в установленном приложении Windows.");
      report.value=`${description.value.trim()}\n\n${diagnostic}`;
      report.hidden=false;copy.hidden=false;
      status.textContent=u("Проверьте описание и диагностику ниже. Удалите личные данные перед копированием. Ничего не отправляется автоматически.");
    } catch {status.textContent=u("Не удалось подготовить диагностику. Повторите попытку.");} finally {make.disabled=false;}
  };
  copy.onclick=async()=>{try {await navigator.clipboard.writeText(report.value);status.textContent=u("Отчёт скопирован. Отправьте его тому, кто помогает исправить проблему.");}catch {report.select();status.textContent=u("Выделен отчёт — нажмите Ctrl+C.");}};
  const check=h("button",{text:u("Проверить обновления")});
  const download=h("button",{text:u("Скачать установщик"),hidden:true});
  check.onclick=async()=>{
    check.disabled=true;download.hidden=true;status.textContent=u("Проверяем выпуски KiroPiko…");
    try {
      if(!IS_TAURI)throw new Error(u("Проверка доступна в установленном приложении Windows."));
      const release=await Bridge.checkUpdates();
      if(!release)status.textContent=u("Установщик ещё не опубликован в выпусках GitHub. Повторите позже.");
      else if(!release.newer)status.textContent=u("У вас актуальная версия {version}.", {version});
      else {
        status.textContent=u("Доступна {version} (preview). Скачайте установщик, закройте KiroPiko и запустите скачанный файл. Настройки сохранятся.", {version:release.version});
        download.hidden=false;download.onclick=()=>{void Bridge.openUrl(release.url);};
      }
    } catch(error){status.textContent=(error instanceof Error ? error.message : String(error)).slice(0,240);} finally {check.disabled=false;}
  };
  return h("section",{},h("h2",{text:u("Помощь и обновления")}),description,h("div",{class:"row"},make,copy,check,download),status,report);
}
