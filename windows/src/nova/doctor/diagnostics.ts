export interface DoctorSnapshot {
  capturedAt: string;
  cpuPercent: number | null;
  memoryTotalBytes: number;
  memoryFreeBytes: number;
  disks: { name: string; totalBytes: number; freeBytes: number }[];
  networkConnected: boolean | null;
  os: string;
}

export interface DoctorFinding {
  level: "warning" | "info";
  text: string;
}

/** One sample can flag pressure, but cannot prove its cause. */
export function diagnose(s: DoctorSnapshot): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  if (s.cpuPercent != null && s.cpuPercent >= 85) findings.push({ level: "warning", text: "CPU занят более чем на 85%. Если нагрузка сохраняется, проверьте процессы в Диспетчере задач." });
  if (s.memoryTotalBytes > 0 && s.memoryFreeBytes / s.memoryTotalBytes < 0.1) findings.push({ level: "warning", text: "Свободно менее 10% памяти. Закройте ненужные приложения или вкладки, чтобы уменьшить нагрузку." });
  for (const disk of s.disks) {
    if (disk.totalBytes > 0 && disk.freeBytes / disk.totalBytes < 0.1) findings.push({ level: "warning", text: `На диске ${disk.name} осталось менее 10% места. Посмотрите раздел «Память» в настройках Windows перед удалением файлов.` });
  }
  if (s.networkConnected === false) findings.push({ level: "warning", text: "Нет активного сетевого адаптера. Проверьте Wi-Fi или кабель. Доступность интернета отдельно не проверялась." });
  if (!findings.length) findings.push({ level: "info", text: "В этом замере признаков высокой нагрузки не обнаружено. Это не полная проверка исправности Windows." });
  return findings;
}

export function gib(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(1);
}
