import { h } from "../views/dom";
import type { Msg } from "../i18n/i18n";
export function panel(title: string | Msg, subtitle: string | Msg, body: HTMLElement): HTMLElement {
  return h("div", { class: "view nova-view" }, h("section", { class: "nova-panel" },
    h("div", { class: "nova-heading" }, h("strong", { text: title }), h("span", { text: subtitle })), body));
}
