/** Presentation only: permission cards retain the exact tool and command. */
export function readableAction(step: string): string {
  const match = /^(mcp__[\w-]+)(.*)$/.exec(step);
  if (!match) return step;
  const name = match[1].toLowerCase();
  const label = /cua_repl|computer_use/.test(name) ? "Проверяет интерфейс"
    : /apply_patch/.test(name) ? "Изменяет файлы"
    : /exec_command|write_stdin/.test(name) ? "Работает в терминале"
    : /web.*search|search_query/.test(name) ? "Ищет информацию"
    : /github/.test(name) ? "Работает с GitHub"
    : /context7|documentation/.test(name) ? "Читает документацию"
    : /node_repl/.test(name) ? "Выполняет код"
    : "Использует внешний инструмент";
  return label + match[2];
}
