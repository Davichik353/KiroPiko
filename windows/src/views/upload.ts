// Drop zone, upload progress and the "what do you want to do with it" card —
// ports of UploadView / UploadingView / ChooseView from IslandViewContent.swift.
//
// A file can be discussed with AI or sent explicitly through Resend.

import { h, clear } from "./dom";
import { State } from "../core/state";
import type { ViewActions, ViewHost } from "./views";
import { t, tl } from "../i18n/i18n";
import {u,ul} from "../i18n/kiro";
import {chooseChatFile} from "../core/attach-file";

/** Dashed rounded rect drawn as SVG so the dashes can march like on macOS. */
function dashedFrame(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(ns, "svg");
  el.setAttribute("class", "drop-frame");
  el.setAttribute("preserveAspectRatio", "none");
  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("x", "0.75");
  rect.setAttribute("y", "0.75");
  rect.setAttribute("width", "calc(100% - 1.5px)");
  rect.setAttribute("height", "calc(100% - 1.5px)");
  rect.setAttribute("rx", "20");
  rect.setAttribute("fill", "none");
  rect.setAttribute("stroke-width", "1.5");
  rect.setAttribute("stroke-dasharray", "6 5");
  el.append(rect);
  return el;
}

export function buildUpload(actions?:ViewActions): ViewHost {
  const frame = dashedFrame();
  const title = h("div", { class: "drop-title", text: ul("Прикрепите один файл") });
  const feedback=h("p",{class:"hint",role:"status"});
  const choose=h("button",{class:"btn primary",text:ul("Выбрать файл"),onclick:async()=>{const result=await chooseChatFile();feedback.textContent=u(result.message);if(result.attached)actions?.setView("prompt");}});
  const tags = h(
    "div",
    { class: "drop-tags" },
    ...["TXT / MD", "Код", "Изображения", "PDF · Anthropic"].map((chip) => h("span", { text: ul(chip) })),
  );
  const card = h(
    "div",
    { class: "card drop-card" },
    frame,
    h("div", { class: "drop-body" }, title,h("p",{class:"hint",text:ul("Выберите файл кнопкой или перетащите сюда. Затем напишите вопрос в чате. Выбор файла начинает новый чат.")}),choose,tags,feedback),
  );
  const el = h("div", { class: "view" }, card);

  return {
    el,
    sync() {
      card.classList.toggle("over", State.fileDragOver);
      choose.disabled=State.filePreparing || State.stateOverride==="thinking";
    },
  };
}

export function buildUploading(): ViewHost {
  const label = h("span", { class: "up-name" });
  const percent = h("span", { class: "up-pct" });
  const fill = h("div", { class: "up-fill" });
  const glow = h("div", { class: "up-glow" });
  const card = h(
    "div",
    { class: "card up-card" },
    h("div", { class: "up-row" }, label, percent),
    h("div", { class: "up-track" }, fill, glow),
  );
  const el = h("div", { class: "view" }, card);

  return {
    el,
    sync() {
      const done = !State.filePreparing;
      label.textContent = done
        ? `✓  ${State.droppedFile?.name ?? t("File")}`
        : u("Готовим файл на этом устройстве: {name}",{name:State.droppedFile?.name ?? t("file")});
      label.classList.toggle("done", done);
      percent.textContent = done ? u("Ничего не отправлено") : "";
      const w = State.uploadProgress * 526;
      fill.style.width = `${w}px`;
      glow.style.transform = `translateX(${Math.max(0, w - 14)}px)`;
      glow.style.opacity = State.uploadProgress > 0.01 ? "1" : "0";
      card.classList.toggle("done", done);
    },
  };
}

export function buildChoose(actions: ViewActions): ViewHost {
  const title = h("div", { class: "title" });
  const sub = h("div", { class: "sub", text: ul("Файл на этом устройстве. Откройте чат, напишите вопрос и отправьте его вместе с файлом.") });
  const row = h(
    "div",
    { class: "actions" },
    h("button", {
      class: "btn secondary",
      text: ul("По электронной почте"),
      onclick: () => actions.setView("mail"),
    }),
    h("button", {
      class: "btn primary",
      text: ul("Открыть чат с файлом"),
      onclick: () => actions.setView("prompt"),
    }),
    h("button", {
      class: "btn secondary",
      text: tl("Cancel"),
      onclick: () => actions.cancelDrop(),
    }),
  );
  const el = h(
    "div",
    { class: "view" },
    h(
      "div",
      { class: "card" },
      h("div", { class: "stack", style: "padding:0 18px 0 98px" }, title, sub, row),
    ),
  );

  return {
    el,
    sync() {
      clear(title);
      title.append(
        h("b", { text: State.droppedFile?.name ?? t("file") }),
        document.createTextNode(t(" is ready.")),
      );
    },
  };
}
