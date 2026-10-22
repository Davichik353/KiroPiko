import {Bridge,IS_TAURI} from "./bridge";
import {State} from "./state";
import {attachmentProblem} from "./attachments";

export async function chooseChatFile():Promise<{attached:boolean;message:string}> {
  if(!IS_TAURI)return {attached:false,message:"Выбор файла работает в приложении Windows. Там можно выбрать файл кнопкой или перетащить его на капсулу."};
  if(State.filePreparing || State.stateOverride==="thinking")return {attached:false,message:"Дождитесь завершения текущей операции."};
  State.filePreparing=true;State.notify();
  try {
    const previous=State.droppedFile;
    const file=await Bridge.pickChatFile();
    if(!file)return {attached:false,message:"Выбор отменён. Ничего не отправлено."};
    const problem=attachmentProblem(file,State.settings.chatProvider);
    if(problem)return {attached:false,message:problem};
    if(State.droppedFile!==previous)return {attached:false,message:"Вложение изменилось. Выберите файл ещё раз."};
    await Bridge.chatResetChecked();
    State.chatHistory=[];State.droppedFile=file;State.promptContext={kind:"file",name:file.name,path:file.path};
    return {attached:true,message:"Файл прикреплён к новому чату. Напишите, что с ним сделать, и нажмите «Отправить»."};
  }catch{return {attached:false,message:"Не удалось прикрепить файл. Проверьте доступ к нему и размер; затем повторите выбор."};}
  finally{State.filePreparing=false;State.notify();}
}
