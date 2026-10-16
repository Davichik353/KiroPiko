import { h } from "./dom";
import { State } from "../core/state";
import { Bridge, IS_TAURI } from "../core/bridge";
import type { ViewActions, ViewHost } from "./views";
import { panel } from "../nova/panel";

export function buildMail(actions: ViewActions): ViewHost {
  const to = h("input", { type: "email", placeholder: "Кому: name@example.com", "aria-label": "Получатель", required: true }) as HTMLInputElement;
  const from = h("input", { type: "email", placeholder: "От кого: адрес подтверждённого домена Resend", "aria-label": "Отправитель", required: true }) as HTMLInputElement;
  const subject = h("input", { placeholder: "Тема", "aria-label": "Тема", required: true }) as HTMLInputElement;
  const body = h("textarea", { placeholder: "Текст письма", "aria-label": "Текст письма", rows: 2 }) as HTMLTextAreaElement;
  const key = h("input", { type: "password", placeholder: "API-ключ Resend (если ещё не подключён)", "aria-label": "API-ключ Resend", autocomplete: "off" }) as HTMLInputElement;
  const file = h("small");
  const status = h("p", { role: "status", class: "nova-status" });
  const send = h("button", { class: "btn primary", type: "submit", text: "Проверить письмо" }) as HTMLButtonElement;
  let path = "", name = "", requestId = crypto.randomUUID(), confirmed = false, busy = false, sent = false;
  const reset = () => { if (busy) return; confirmed = false; sent = false; requestId = crypto.randomUUID(); send.textContent = "Проверить письмо"; send.disabled = false; };
  for (const field of [to, from, subject, body, key]) field.addEventListener("input", reset);
  const form = h("form", { class: "kiro-mail-form", style: "display:flex;flex-direction:column;gap:8px" }, to, from, subject, body, key, file,
    h("small", { text: "Письмо и вложение отправляются через Resend только после подтверждения. Нужны API-ключ и подтверждённый адрес отправителя." }),
    h("div", { class: "actions" }, send, h("button", { type: "button", class: "btn secondary", text: "Назад", onclick: () => { if (!busy) actions.setView("choose"); } })), status) as HTMLFormElement;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || sent) return;
    if (!IS_TAURI) { status.textContent = "Отправка файлов доступна в приложении Windows."; return; }
    if (!path) { status.textContent = "Сначала перетащите файл в островок."; return; }
    if (!confirmed) {
      confirmed = true;
      status.textContent = `От: ${from.value} → ${to.value}. Тема: ${subject.value}. Вложение: ${name}. Проверьте данные и подтвердите отправку.`;
      send.textContent = "Подтвердить и отправить";
      return;
    }
    busy = true; send.disabled = true;
    for (const field of [to, from, subject, body, key]) field.disabled = true;
    try {
      if (key.value.trim()) { await Bridge.secretSet("resend-api-key", key.value.trim()); key.value = ""; }
      const id = await Bridge.sendMail({ to: to.value.trim(), from: from.value.trim(), subject: subject.value, body: body.value, path, requestId });
      sent = true; status.textContent = `Resend принял письмо. ID: ${id}. Это ещё не подтверждение доставки.`; send.textContent = "Принято Resend";
    } catch (error) { status.textContent = String(error).replace(/^Error:\s*/, ""); }
    finally { busy = false; send.disabled = sent; for (const field of [to, from, subject, body, key]) field.disabled = false; }
  });
  const el = panel("Электронная почта", "RESEND · С ВЛОЖЕНИЕМ", form);
  return { el, sync() {
    const dropped = State.droppedFile;
    if (dropped && path !== dropped.path && !busy) { path = dropped.path; name = dropped.name; subject.value = name; reset(); status.textContent = ""; }
    file.textContent = name ? `Вложение: ${name}` : "Файл не выбран";
  }, focus() { to.focus(); } };
}
