import { h } from "../views/dom";
export function panel(title: string, subtitle: string, body: HTMLElement): HTMLElement {
  return h("div", { class: "view nova-view" }, h("section", { class: "nova-panel" },
    h("div", { class: "nova-heading" }, h("strong", { text: title }), h("span", { text: subtitle })), body));
}
