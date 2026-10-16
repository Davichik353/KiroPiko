/** A local description of visible syntax, never a shell parser or safety verdict. */
export function explainAction(tool: string, command: string): string[] {
  const text = `${tool} ${command}`.toLowerCase();
  const lines: string[] = [];
  if (/\b(rm|del|erase|rmdir|remove-item|unlink)\b/.test(text)) lines.push("В запросе есть операция удаления. Проверьте точные пути и возможность восстановления.");
  if (/\b(curl|wget|invoke-webrequest|invoke-restmethod|fetch)\b|https?:\/\//.test(text)) lines.push("В запросе есть сетевой адрес или обращение к сети. Возможны загрузка файлов и передача данных.");
  if (/\b(npm|pnpm|yarn|pip|cargo|winget|choco)\b.*\b(install|add|update|upgrade|build)\b/.test(text)) lines.push("Запуск менеджера пакетов/сборки может загрузить зависимости и выполнить их скрипты.");
  if (/\b(edit|write|multiedit|set-content|add-content|out-file|mv|cp|move-item|copy-item)\b|>{1,2}/.test(text)) lines.push("Запрос может создать, изменить, переместить или перезаписать файлы. Цель указана в исходном запросе выше.");
  if (/\b(git)\b.*\b(push|reset|clean|checkout|restore)\b/.test(text)) lines.push("Команда Git может изменить файлы, историю или удалённый репозиторий. Проверьте аргументы.");
  if (!lines.length) lines.push("Агент просит выполнить показанное действие. По одному тексту нельзя надёжно определить все изменения файлов и обращения к сети.");
  lines.push("Локальный разбор видимого текста: вложенные команды, скрипты и содержимое файлов не проверены. Это не гарантия безопасности. Allow остаётся вашим решением.");
  return lines;
}
