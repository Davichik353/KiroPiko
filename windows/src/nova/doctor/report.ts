import { diagnose, gib, type DoctorSnapshot } from "./diagnostics";
export function doctorReport(snapshot: DoctorSnapshot): string {
  return ["KiroPiko · System Doctor", `Замер: ${snapshot.capturedAt}`, `Система: ${snapshot.os}`,
    `CPU: ${snapshot.cpuPercent == null ? "недоступно" : `${Math.round(snapshot.cpuPercent)}%`}`,
    `RAM: свободно ${gib(snapshot.memoryFreeBytes)} из ${gib(snapshot.memoryTotalBytes)} ГБ`,
    `Сеть: ${snapshot.networkConnected == null ? "недоступно" : snapshot.networkConnected ? "адаптер подключён" : "нет активного адаптера"}`,
    "", "Диски:", ...snapshot.disks.map(d => `${d.name}: свободно ${gib(d.freeBytes)} из ${gib(d.totalBytes)} ГБ`),
    "", "Наблюдения:", ...diagnose(snapshot).map(f => `• ${f.text}`), "",
    "Один замер не является полной проверкой исправности Windows. Доступность интернета не проверялась.",
    "Отчёт сохранён по запросу пользователя. Системные настройки не изменялись."].join("\n");
}
