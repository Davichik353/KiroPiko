import type { AgentTask } from "../../core/state";
import { fileName, type FileDiff } from "../../core/diff";
export interface TaskSummary { outcome: string; files: string[]; checks: string; next: string }
export function taskSummary(task: AgentTask, diffs: FileDiff[]): TaskSummary {
  const files = [...new Set(diffs.map(d => fileName(d.path)))].slice(0, 20);
  const count = task.steps.filter(s => /\b(test|pytest|jest|vitest|cargo test|npm test|gradlew|build|lint)\b/i.test(s)).length;
  return {
    outcome: (task.finalLine || "Агент сообщил о завершении. Результат требует проверки.").slice(0, 1000),
    files,
    checks: count ? `В событиях замечены проверки/сборки: ${count}. Код завершения и полнота проверок не подтверждены.` : "Подтверждённые результаты тестов не поступали.",
    next: files.length ? "Просмотрите изменения файлов и запустите нужные проверки проекта." : "Откройте сессию и проверьте результат задачи.",
  };
}
