import { u } from "../i18n/kiro";
import { onEvent } from "../core/bridge";
let disposeNavigation = () => {};
import { h } from "../views/dom";

interface SettingsPage {
  id: string;
  title: string;
  description: string;
  tip: string;
  sections: HTMLElement[];
}

/** Keep every form mounted so changing sections never discards an edit. */
export function mountSettings(root: HTMLElement, version: string, pages: SettingsPage[], preview: boolean) {
  disposeNavigation();
  const search = h("input", { class: "settings-search", type: "search", placeholder: u("Поиск настроек"), "aria-label": u("Поиск настроек") });
  const searchStatus = h("span", { class: "settings-search-status", role: "status" });
  const nav = h("nav", { class: "settings-nav", "aria-label": u("Разделы настроек") });
  const title = h("h1", { tabindex: -1 });
  const subtitle = h("p", { class: "settings-subtitle" });
  const main = h("main", { class: "settings-main" }, h("header", { class: "settings-page-header" }, title, subtitle));
  const panels = pages.map(page => {
    const panel = h("div", { class: "settings-page", id: `settings-${page.id}`, hidden: true,
      role: "region", "aria-label": page.title },
      h("p", { class: "settings-tip", text: page.tip }), ...page.sections);
    panel.querySelectorAll<HTMLElement>(".row").forEach(row => {
      const label = row.querySelector("label, .settings-row-label, span");
      const name = label?.firstChild?.textContent?.trim();
      if (!name) return;
      row.querySelectorAll<HTMLElement>("button.switch, input, select").forEach(control => {
        if (!control.hasAttribute("aria-label") && !control.hasAttribute("aria-labelledby")) {
          control.setAttribute("aria-label", control.matches('input[type="range"]') && name === u("Звук") ? u("Громкость") : name);
        }
      });
    });
    main.append(panel);
    return panel;
  });
  const buttons = pages.map(page => h("button", { type: "button", class: "settings-nav-item",
    text: page.title, "aria-controls": `settings-${page.id}` }));
  function show(index: number, focus = false) {
    pages.forEach((page, i) => {
      panels[i].hidden = i !== index;
      buttons[i].setAttribute("aria-current", i === index ? "page" : "false");
      if (i === index) {
        title.textContent = page.title;
        subtitle.textContent = page.description;
        history.replaceState(null, "", `#${page.id}`);
      }
    });
    main.scrollTop = 0;
    if (focus) title.focus({ preventScroll: true });
  }
  buttons.forEach((button, i) => {
    button.addEventListener("click", () => show(i, true));
    button.addEventListener("keydown", event => {
      const visible = buttons.map((button, index) => button.hidden ? -1 : index).filter(index => index >= 0);
      const position = visible.indexOf(i);
      const next = event.key === "ArrowDown" ? visible[(position + 1) % visible.length]
        : event.key === "ArrowUp" ? visible[(position + visible.length - 1) % visible.length]
        : event.key === "Home" ? visible[0] : event.key === "End" ? visible[visible.length - 1] : -1;
      if (next < 0) return;
      event.preventDefault(); buttons[next].focus(); show(next);
    });
    nav.append(button);
  });
  const sidebar = h("aside", { class: "settings-sidebar" },
    h("div", { class: "settings-brand" }, h("strong", { text: "KiroPiko" }), h("span", { text: u("НАСТРОЙКИ") })),
    search, searchStatus, nav,
    h("div", { class: "settings-sidebar-footer" },
      h("span", { text: version ? u("Версия {version}", {version}) : "KiroPiko preview" }),
      h("span", { text: u("Изменения сохраняются автоматически") })));
  if (preview) main.prepend(h("div", { class: "settings-preview" },
    h("span", { text: u("Превью · подключения работают в приложении Windows") }),
    h("a", { href: "/", text: u("К капсуле ↗") })));
  root.append(sidebar, main);
  search.addEventListener("input", () => {
    const words = search.value.trim().toLocaleLowerCase().split(/\s+/);
    const found = pages.map((page, i) => {
      const text = `${page.title} ${page.description} ${panels[i].textContent}`.toLocaleLowerCase();
      const matches = words.every(word => text.includes(word));
      buttons[i].hidden = !matches;
      return matches ? i : -1;
    }).filter(i => i >= 0);
    searchStatus.textContent = search.value ? found.length ? u("Разделов: {count}", {count:found.length}) : u("Ничего не найдено") : "";
    panels.forEach(panel => panel.querySelectorAll(".settings-search-hit").forEach(row => row.classList.remove("settings-search-hit")));
    if (found.length) {
      show(found[0]);
      if (search.value.trim()) {
        const row = [...panels[found[0]].querySelectorAll<HTMLElement>(".row")].find(row => words.every(word => row.textContent?.toLocaleLowerCase().includes(word)));
        if (row) { row.classList.add("settings-search-hit"); row.scrollIntoView({ block: "center" }); }
      }
    }
  });
  const keydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault(); search.focus(); search.select();
    }
  };
  const navigate = (id: string) => {
    const index = pages.findIndex(page => page.id === id);
    if (index >= 0) { search.value = ""; buttons.forEach(button => button.hidden = false); searchStatus.textContent = ""; show(index); }
  };
  let stopped = false, unlisten: (() => void) | undefined;
  void onEvent<string>("navigate-settings", id => { if (!stopped) navigate(id); }).then(fn => { if (stopped) fn(); else unlisten = fn; });
  const storage = (event: StorageEvent) => {
    if (event.key !== "kiropiko.settings.target" || !event.newValue) return;
    try { navigate(JSON.parse(event.newValue).id); } catch { /* ignore invalid requests */ }
  };
  window.addEventListener("keydown", keydown);
  window.addEventListener("storage", storage);
  disposeNavigation = () => { stopped = true; unlisten?.(); window.removeEventListener("keydown", keydown); window.removeEventListener("storage", storage); };
  const active = pages.findIndex(page => page.id === location.hash.slice(1));
  show(active < 0 ? 0 : active);
  try {
    const pending = JSON.parse(localStorage.getItem("kiropiko.settings.target") ?? "null");
    if (pending && Date.now() - pending.at < 30000) navigate(pending.id);
    localStorage.removeItem("kiropiko.settings.target");
  } catch { /* an invalid pending route has no effect */ }
}
