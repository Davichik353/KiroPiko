export const ACCOUNT_AGENTS = [
  {id:"codex",name:"Codex",docs:"https://learn.chatgpt.com/docs/cli/",login:"codex login",status:"codex login status"},
  {id:"cursor",name:"Cursor",docs:"https://cursor.com/docs/cli/overview",login:"agent login",status:"agent status"},
  {id:"claude",name:"Claude Code",docs:"https://code.claude.com/docs/en/setup",login:"claude auth login",status:"claude auth status"},
] as const;
export type AccountAgent = typeof ACCOUNT_AGENTS[number]["id"];
export type CliAction = "status" | "login" | "open" | "test";
export interface CliReport {agent:AccountAgent;found:boolean;authenticated:boolean|null;mode:"account"|"other"|"unknown";state:string;at:number;duration:number}
export const CLI_STATES:Record<string,[string,string]> = {
  missing:["CLI не найден","Установите официальный CLI по инструкции и перезапустите KiroPiko, чтобы обновился PATH."],
  unknown:["Статус входа неизвестен","CLI найден, но его ответ не подтверждает вход через аккаунт. Откройте CLI и проверьте авторизацию."],
  "signed-in":["Вход через аккаунт выполнен","Авторизация подтверждена сейчас. Ответ модели и остаток лимита ещё не проверены."],
  "signed-out":["Требуется вход","Нажмите «Войти». Авторизация проходит в официальном CLI и браузере сервиса."],
  "other-auth":["Другой способ авторизации","CLI использует API или другой способ входа. Для этого раздела войдите через личный аккаунт в официальном CLI."],
  "account-required":["Нужен вход через аккаунт","Короткий тест доступен после подтверждения входа через аккаунт без API-ключа."],
  "login-opened":["Открыт официальный вход","Завершите вход в открывшемся окне, затем нажмите «Проверить вход». Открытие окна ещё не подтверждает авторизацию."],
  "session-opened":["Открыта сессия агента","Работа продолжается в официальном терминале. Для событий в капсуле подключите хуки в разделе «Агенты»."],
  "reply-ok":["Ответ модели получен","Короткий тест KIRO_OK завершён через CLI с авторизацией аккаунта. Это проверка на указанное время, а не постоянное соединение."],
  "test-failed":["Тест ответа не прошёл","Возможны лимит подписки, сеть или несовместимая версия CLI. Откройте официальный CLI для подробностей и повторите проверку."],
  timeout:["Время ожидания истекло","Процесс проверки остановлен. Проверьте сеть и повторите попытку."],
  "check-failed":["Не удалось проверить CLI","Обновите официальный CLI и проверьте его запуск в терминале. Старый результат не подтверждает текущую связь."],
  "test-in-terminal":["Проверьте ответ в Cursor CLI","Автоматический тест Cursor пока не поддерживается. Откройте агента и отправьте короткий запрос в его терминале."],
};
export function validCliReport(report:CliReport,id:AccountAgent):boolean {
  return !!report && report.agent===id && typeof report.found==="boolean" && (report.authenticated===null || typeof report.authenticated==="boolean") && ["account","other","unknown"].includes(report.mode) && Object.hasOwn(CLI_STATES,report.state) && Number.isFinite(report.at) && Number.isFinite(report.duration) && report.duration>=0;
}
