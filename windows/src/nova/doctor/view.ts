import { h, clear } from "../../views/dom";
import { Bridge, IS_TAURI } from "../../core/bridge";
import { State } from "../../core/state";
import { diagnose, gib, type DoctorSnapshot } from "./diagnostics";
import type { ViewActions, ViewHost } from "../../views/views";
import { panel } from "../panel";
import { doctorQuestion } from "../assistant/context";
import { doctorReport } from "./report";
export function buildDoctor(actions: ViewActions): ViewHost {
  const status = h("div", { class: "nova-status", role: "status", text: "Диагностика по запросу. Данные остаются на компьютере." });
  const readings = h("div", { class: "nova-readings" });
  const findings = h("div", { class: "nova-findings" });
  const button = h("button", { class: "btn primary", text: "Проверить компьютер" });
  let running = false;
  let latest: DoctorSnapshot | null = null;
  const preview = h("pre", { class: "nova-report", hidden: true });
  const exportButton = h("button", { class: "btn secondary", text: "Отчёт", disabled: true });
  const saveReport = h("button", { class: "btn secondary", text: "Сохранить TXT", hidden: true });
  exportButton.onclick = () => { if (latest) { preview.textContent = doctorReport(latest); preview.hidden = !preview.hidden; saveReport.hidden = preview.hidden; } };
  saveReport.onclick = async () => {
    if (!latest) return;
    const report = doctorReport(latest);
    if (IS_TAURI) {
      saveReport.disabled = true;
      try { const path = await Bridge.exportDoctorReport(report); status.textContent = `Отчёт сохранён: ${path}`; }
      catch (err) { status.textContent = `Не удалось сохранить отчёт: ${String(err)}`; }
      finally { saveReport.disabled = false; }
    } else {
      const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
      const link = h("a", { href: url, download: "KiroPiko-System-Doctor.txt" }) as HTMLAnchorElement;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "Сохранение TXT запрошено. Проверьте загрузки браузера.";
    }
  };
  const explain = h("button", { class: "btn secondary", text: "Объяснить с ИИ", disabled: true });
  explain.addEventListener("click", async () => {
    if (!latest) return;
    State.droppedFile = null;
    State.chatHistory = [];
    await Bridge.chatReset();
    State.novaDraft = doctorQuestion(latest);
    actions.setView("prompt");
  });
  function show(s: DoctorSnapshot) {
    latest = s;
    explain.disabled = false;
    exportButton.disabled = false;
    if (!preview.hidden) preview.textContent = doctorReport(s);
    clear(readings);
    const ram = s.memoryTotalBytes > 0 ? `${Math.round((1 - s.memoryFreeBytes / s.memoryTotalBytes) * 100)}%` : "—";
    const metrics = [
      ["CPU", s.cpuPercent == null ? "—" : `${Math.round(s.cpuPercent)}%`, "Нагрузка сейчас"],
      ["RAM", ram, `${gib(s.memoryFreeBytes)} ГБ свободно`],
      ["Сеть", s.networkConnected == null ? "—" : s.networkConnected ? "Подключена" : "Нет связи", "Состояние адаптера"],
    ];
    for (const [name, value, detail] of metrics) readings.append(h("div", { class: "nova-metric" }, h("small", { text: name }), h("strong", { text: value }), h("small", { text: detail })));
    clear(findings);
    for (const d of s.disks) findings.append(h("div", { class: "nova-disk", text: `${d.name} · ${gib(d.freeBytes)} / ${gib(d.totalBytes)} ГБ свободно` }));
    for (const f of diagnose(s)) findings.append(h("p", { class: `nova-finding ${f.level}`, text: f.text }));
    status.textContent = `${s.os} · замер ${new Date(s.capturedAt).toLocaleTimeString()}`;
  }
  button.addEventListener("click", async () => {
    if (running) return;
    if (!IS_TAURI) { status.textContent = "Настоящие показатели доступны в приложении KiroPiko для Windows. Браузер не имеет доступа к CPU, RAM и дискам."; return; }
    running = true;
    button.disabled = true;
    status.textContent = "Считываю показатели Windows…";
    try { show(await Bridge.systemSnapshot()); }
    catch (err) { status.textContent = String(err).replace(/^Error:\s*/, ""); }
    finally { running = false; button.disabled = false; }
  });
  return { el: panel("System Doctor", "WINDOWS · ТОЛЬКО ЧТЕНИЕ", h("div", {}, status, readings, findings,
    h("div", { class: "nova-footer nova-wrap" }, button, explain, exportButton, saveReport), preview, h("small", { class: "nova-status", text: "ИИ получит показатели только после отправки сообщения. KiroPiko не изменяет систему." }))), sync() {} };
}
