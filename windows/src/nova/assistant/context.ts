import type { DoctorSnapshot } from "../doctor/diagnostics";

export function doctorQuestion(snapshot: DoctorSnapshot): string {
  return `Объясни этот разовый замер Windows простыми словами. Не делай вывод о причине по одному замеру и не утверждай, что можешь менять настройки. Предложи безопасные следующие шаги. Показатели: ${JSON.stringify(snapshot)}`;
}
