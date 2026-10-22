// Chat view — DOM port of PromptView / ChatBubble / TypingDotsView /
// ModelPickerView from IslandViewContent.swift.
//
// Answers are rendered as Markdown (markdown.ts). A local model streams its
// answer: Rust sends `chat-delta` events with the text visible so far. The
// model name above the text field opens the picker: provider chips, then the
// models of the chosen provider, asked for only once it is picked.

import { h, svg, clear } from "./dom";
import { ICONS } from "./icons";
import { renderMarkdown } from "./markdown";
import { Bridge, onEvent, type ChatContext, type ModelInfo } from "../core/bridge";
import {
  activeModel, pickModel, providerDef, visibleProviders, withModel, isFreeRouterModel, type ProviderDef,
} from "../core/providers";
import { Sound } from "../core/sound";
import { Speech } from "../nova/voice/speech";
import { showNotice } from "../nova/preview";
import { chooseAutoModel } from "../nova/assistant/auto-model";
import { u, ul } from "../i18n/kiro";
import { readTasks, saveTask, clearTasks } from "../core/task-history";
import { lowQuota } from "../core/api-limits";
import { PROVIDERS } from "../core/providers";
import { chooseChatFile } from "../core/attach-file";
import { attachmentProblem } from "../core/attachments";
import { State, type ChatMessage } from "../core/state";
import type { ViewHost } from "./views";
import { N_, t, tl } from "../i18n/i18n";

const STRINGS = {
  placeholderFirst: N_("Ask me anything…"),
  placeholderNext: N_("Continue…"),
  send: N_("Send"),
  switchModel: N_("Switch provider or model"),
  noModel: N_("Choose a model"),
  loading: N_("Loading models…"),
  noKey: N_("No API key — add it in Settings."),
  openSettings: N_("Open Settings"),
};

let nextId = 1;

function bubble(message: ChatMessage): HTMLElement {
  if (message.role === "user") {
    return h(
      "div",
      { class: "chat-row user" },
      h("div", { class: "bubble", text: message.content }),
    );
  }
  const reply = h("div", { class: "reply" });
  renderMarkdown(reply, message.content);
  return h("div", { class: "chat-row", style: "flex-direction:column" }, reply,
    message.modelLabel ? h("small", { class: "chat-routing", text: message.modelLabel }) : null);
}

function typingDots(): HTMLElement {
  return h(
    "div",
    { class: "chat-row" },
    h("div", { class: "typing" }, h("i"), h("i"), h("i")),
  );
}

/** The coloured chip showing what the question is about (a dropped file). */
function contextChip(label: string): HTMLElement {
  const chip = h("div", { class: "chip" }, h("i", { class: "chip-dot" }), h("span", { text: label }));
  requestAnimationFrame(() => chip.classList.add("settled"));
  return chip;
}

function saveSettings() {
  void Bridge.saveSettings(State.settings);
}

// ── Model picker ──────────────────────────────────────────────────────────────

interface Picker {
  el: HTMLElement;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

/** Provider chips, then the chosen provider's models — ModelPickerView. */
function buildPicker(onChange: () => void): Picker {
  const chips = h("div", { class: "picker-chips" });
  const list = h("div", { class: "picker-list" });
  const el = h("div", { class: "picker" }, chips, h("div", { class: "picker-rule" }), list);

  /** Models already asked for, by provider; a model server is asked again each time. */
  const cache = new Map<string, ModelInfo[]>();
  let isOpen = false;
  let request = 0;

  function drawChips() {
    clear(chips);
    for (const p of visibleProviders(State.settings)) {
      const on = p.id === State.settings.chatProvider;
      const chip = h(
        "button",
        { class: on ? "picker-chip on" : "picker-chip", style: `--accent:${p.accent}` },
        h("i", { class: "picker-dot" }),
        h("span", { text: t(p.name) }),
      );
      chip.addEventListener("click", () => {
        if (p.id === State.settings.chatProvider) return;
        State.settings = { ...State.settings, chatProvider: p.id };
        saveSettings();
        Sound.play("pop");
        drawChips();
        void loadModels();
        onChange();
      });
      chips.append(chip);
    }
  }

  function status(text: string, withSettings = false) {
    clear(list);
    const line = h("div", { class: "picker-status", text });
    if (withSettings) {
      line.append(
        h("button", {
          class: "picker-link",
          text: tl(STRINGS.openSettings),
          onclick: () => void Bridge.openSettingsWindow(),
        }),
      );
    }
    list.append(line);
  }

  function drawModels(p: ProviderDef, models: ModelInfo[]) {
    clear(list);
    const current = activeModel(State.settings);
    for (const m of models) {
      const on = m.id === current;
      const row = h(
        "button",
        { class: on ? "picker-model on" : "picker-model", style: `--accent:${p.accent}`, title: m.id },
        h("span", { class: "picker-model-name", text: m.label }),
        on ? svg(ICONS.check, 11, { stroke: 2.2 }) : null,
      );
      row.addEventListener("click", () => {
        State.settings = withModel(State.settings, p.id, m.id);
        saveSettings();
        Sound.play("blip");
        close();
      });
      list.append(row);
    }
    list.querySelector(".picker-model.on")?.scrollIntoView({ block: "nearest" });
  }

  async function loadModels() {
    const p = providerDef(State.settings.chatProvider);
    const ticket = ++request;
    const cached = p.urlField ? undefined : cache.get(p.id);
    if (cached) {
      drawModels(p, cached);
      return;
    }
    // Nothing is asked of a provider that has no key yet.
    if (p.key && !(await Bridge.secretPresent(p.key))) {
      if (ticket === request) status(t(STRINGS.noKey), true);
      return;
    }
    if (ticket !== request) return;
    status(t(STRINGS.loading));
    try {
      const models = await Bridge.chatModels(p.id);
      if (ticket !== request) return;
      if (!p.urlField) cache.set(p.id, models);
      const keep = pickModel(p, models.map((m) => m.id), activeModel(State.settings));
      if (keep && keep !== activeModel(State.settings)) {
        State.settings = withModel(State.settings, p.id, keep);
        saveSettings();
        onChange();
      }
      drawModels(p, models);
    } catch (err) {
      if (ticket === request) status(String(err).replace(/^Error:\s*/, ""), Boolean(p.key));
    }
  }

  function open() {
    isOpen = true;
    el.classList.add("on");
    drawChips();
    onChange();
    void loadModels();
  }

  function close() {
    isOpen = false;
    request++;
    el.classList.remove("on");
    onChange();
  }

  return {
    el,
    open,
    close,
    get isOpen() {
      return isOpen;
    },
  };
}

// ── View ──────────────────────────────────────────────────────────────────────

export function buildPrompt(onHeightChange: () => void): ViewHost {
  const chipRow = h("div", { class: "chip-row" });
  const log = h("div", { class: "chat-log" });
  const input = h("input", {
    type: "text",
    class: "chat-input",
    placeholder: t(STRINGS.placeholderFirst),
    spellcheck: "false",
  }) as HTMLInputElement;
  const send = h("button", { class: "send-btn", title: tl(STRINGS.send) }, svg(ICONS.arrowUp, 11));
  const bar = h("div", { class: "chat-bar" }, input, send);
  const fileFeedback=h("p",{class:"chat-file-feedback",role:"status","aria-live":"polite",hidden:true});
  const fileDestination=h("small",{class:"chat-file-destination"});
  const attach=h("button",{type:"button",class:"attach-file",text:ul("Прикрепить файл"),title:ul("Выбор файла начнёт новый чат. Сам файл отправится только вместе с вашим сообщением.")});
  attach.onclick=async()=>{
    if(sending)return;
    const result=await chooseChatFile();
    fileFeedback.textContent=u(result.message);fileFeedback.hidden=false;
    if(result.attached){renderedCount=-1;input.focus();}
    State.notify();onHeightChange();
  };

  const modelDot = h("i", { class: "model-dot" });
  const modelName = h("span", { class: "model-name" });
  const modelBtn = h(
    "button",
    { class: "model-btn", title: tl(STRINGS.switchModel) },
    modelDot,
    modelName,
    svg(ICONS.chevronUpDown, 9, { stroke: 2 }),
  );
  const modelRow = h("div", { class: "model-row" }, modelBtn);
  const auto = h("button", { class: "nova-speech-btn chat-auto", text: "Авто", title: "Выбор модели внутри выбранного провайдера. Цена и бесплатная квота не проверяются." });
  const routing = h("div", { class: "chat-routing", role: "status" });
  auto.onclick = async () => {
    if (sending) return;
    const next = { ...State.settings, chatAutoModel: !State.settings.chatAutoModel };
    try { await Bridge.saveSettings(next); State.settings = next; State.notify(); }
    catch (err) { showNotice(String(err)); }
  };
  modelRow.append(auto);
  const readReply = h("button", { class: "nova-speech-btn", text: "Озвучить", title: "Озвучить последний ответ", disabled: true });
  const stopSpeech = h("button", { class: "nova-speech-btn", text: "Стоп", title: "Остановить озвучивание", disabled: true });
  modelRow.append(readReply, stopSpeech);
  readReply.addEventListener("click", () => {
    const reply = [...State.chatHistory].reverse().find(message => message.role === "assistant");
    if (!reply) return;
    try { Speech.speak(reply.content); } catch (err) { showNotice(String(err).replace(/^Error:\s*/, "")); }
  });
  stopSpeech.addEventListener("click", () => Speech.stop());

  const body = h("div", { class: "chat-body" });
  const quota = h("div",{class:"chat-quota",role:"status",hidden:true});
  let quotaRequest=0;
  async function refreshQuota(provider:string,model:string) {
    const ticket=++quotaRequest;quota.hidden=true;clear(quota);
    try {
      const snapshot=await Bridge.apiLimits(provider);
      if(ticket!==quotaRequest || provider!==State.settings.chatProvider || !lowQuota(snapshot,provider,model))return;
      const alternatives=[];
      for(const p of PROVIDERS.filter(p=>p.key && p.id!==provider))if(await Bridge.secretPresent(p.key!))alternatives.push(p);
      if(ticket!==quotaRequest || provider!==State.settings.chatProvider)return;
      quota.append(h("p",{text:u("Осталось не более 15% лимита. Можно выбрать другой сервис с сохранённым ключом. Его доступность и тариф проверяются отдельно.")}));
      for(const p of alternatives)quota.append(h("button",{text:p.name,onclick:async()=>{
        if(sending)return;
        const next={...State.settings,chatProvider:p.id,chatAutoModel:false};
        try{await Bridge.saveSettingsChecked(next);State.settings=next;quotaRequest++;quota.hidden=true;State.notify();picker.open();}catch{showNotice(u("Не удалось сохранить настройки. Повторите попытку."));}
      }}));
      if(!alternatives.length)quota.append(h("button",{text:u("Подключить другой AI"),onclick:()=>void Bridge.openSettingsWindow()}));
      quota.dataset.provider=provider;quota.hidden=false;
      window.setTimeout(()=>{if(ticket===quotaRequest)quota.hidden=true;},Math.max(0,snapshot.at+120000-Date.now()));
    }catch{/* Unknown quota must never become a low-quota warning. */}
  }
  const historyList=h("div",{class:"task-history-list"});
  const history=h("details",{class:"task-history"},h("summary",{text:ul("История задач чата")}),h("p",{class:"hint",text:ul("Последние 50 задач хранятся на этом устройстве. Повтор заполняет поле ввода; отправьте его после проверки. Файлы нужно приложить заново.")}),historyList);
  function drawHistory(){
    clear(historyList);
    const tasks=readTasks();
    if(!tasks.length)historyList.append(h("p",{text:u("Сохранённых задач пока нет.")}));
    for(const task of tasks)historyList.append(h("details",{},h("summary",{text:task.query.slice(0,100)}),h("small",{text:`${task.provider} · ${task.model} · ${new Date(task.at).toLocaleString()} · ${Math.round(task.duration/1000)} s`}),h("p",{text:task.failed?u("Не удалось получить ответ."):task.answer}),h("button",{text:u("Повторить"),disabled:sending,onclick:()=>{if(sending)return;input.value=task.query;history.open=false;input.focus();routing.textContent=u("Запрос подготовлен. Он будет отправлен в текущем чате выбранной модели; проверьте контекст и вложения.");}})));
    historyList.append(h("button",{text:u("Удалить историю задач"),onclick:()=>{try{clearTasks();drawHistory();}catch{showNotice(u("Не удалось удалить историю."));}}}));
  }
  history.addEventListener("toggle",()=>{if(history.open)drawHistory();});
  const picker = buildPicker(() => {
    body.classList.toggle("picking", picker.isOpen);
    drawModelButton();
  });
  body.append(chipRow, log, picker.el, quota, history, fileFeedback, routing, modelRow, attach,fileDestination, bar);

  const el = h("div", { class: "view" }, h("div", { class: "card wash chat-card" }, body));
  (el.querySelector(".card") as HTMLElement).style.setProperty("--wash", "rgba(99,102,241,0.5)");

  let sending = false;
  let renderedCount = -1;
  // A local model answers token by token: where its text so far is shown.
  let live: HTMLElement | null = null;

  function drawModelButton() {
    const p = providerDef(State.settings.chatProvider);
    modelDot.style.background = p.accent;
    modelName.textContent = activeModel(State.settings) || t(STRINGS.noModel);
    modelBtn.classList.toggle("open", picker.isOpen);
    modelBtn.disabled = sending;
    auto.disabled = sending;
    auto.setAttribute("aria-pressed", String(State.settings.chatAutoModel));
    auto.textContent = State.settings.chatAutoModel ? "Авто · вкл" : "Авто";
  }

  modelBtn.addEventListener("click", () => {
    if (sending) return;
    if (picker.isOpen) picker.close();
    else picker.open();
  });

  void onEvent<string>("chat-delta", (text) => {
    if (!sending || !text) return; // nothing visible yet: the dots stay
    if (!live) {
      live = h("div", { class: "reply" });
      log.querySelector(".typing")?.parentElement?.remove();
      log.append(h("div", { class: "chat-row" }, live));
    }
    renderMarkdown(live, text);
    log.scrollTop = log.scrollHeight;
  });

  async function submit() {
    const query = input.value.trim();
    if (!query || sending || State.filePreparing) return;
    const attached=State.droppedFile;
    const problem=attached?attachmentProblem(attached,State.settings.chatProvider):null;
    if(problem){fileFeedback.textContent=u(problem);fileFeedback.hidden=false;return;}
    Speech.stop();
    if (picker.isOpen) picker.close();
    input.value = "";
    sending = true;
    history.open=false;quotaRequest++;quota.hidden=true;
    const started=Date.now();
    const taskProvider=State.settings.chatProvider;
    let taskModel=activeModel(State.settings);
    let taskAnswer="",taskFailed=true;
    drawModelButton();
    Sound.play("send");

    State.chatHistory.push({ id: nextId++, role: "user", content: query });
    State.stateOverride = "thinking";
    State.notify();
    onHeightChange();

    const file = State.droppedFile;
    const context: ChatContext | null =
      !State.chatHistory.some(m=>m.role==="assistant") && file ? { kind: "file", name: file.name, path: file.path } : null;

    try {
      let selected: string | undefined;
      if (State.settings.chatAutoModel) {
        const provider = State.settings.chatProvider;
        let models = await Bridge.chatModels(provider);
        if (provider === "openrouter" && isFreeRouterModel(activeModel(State.settings))) {
          models = models.filter(model=>isFreeRouterModel(model.id));
          if (!models.length) throw new Error(u("OpenRouter: нет доступных бесплатных моделей. Попробуйте позже или выберите модель вручную."));
        }
        const image = !!context && context.kind === "file" && /\.(png|jpe?g|webp|gif)$/i.test(context.name);
        const choice = chooseAutoModel(models, activeModel(State.settings), query, image);
        selected = choice.model;
        taskModel=selected;
        routing.textContent = `${providerDef(provider).name} · ${selected} — ${choice.reason}. Стоимость определяется провайдером.`;
      } else routing.textContent = `${providerDef(State.settings.chatProvider).name} · ${activeModel(State.settings)}`;
      const reply = await Bridge.chatSend(query, context, selected);
      taskAnswer=reply.text;taskFailed=false;
      State.chatHistory.push({ id: nextId++, role: "assistant", content: reply.text, modelLabel: routing.textContent ?? undefined });
      State.stateOverride = null;
      Sound.play("finish");
    } catch (err) {
      State.stateOverride = null;
      State.noteMessage = String(err).replace(/^Error:\s*/, "");
      State.view = "note";
      Sound.play("error");
    } finally {
      if(!saveTask({id:`${started}-${nextId}`,query,answer:taskAnswer,provider:taskProvider,model:taskModel,at:started,duration:Date.now()-started,context:!!context,failed:taskFailed}))routing.textContent=u("Не удалось сохранить задачу на устройстве.");
      sending = false;
      live = null;
      renderedCount = -1; // the finished answer replaces the streamed one
      drawModelButton();
      State.notify();
      onHeightChange();
      input.focus();
      void refreshQuota(taskProvider,taskModel);
    }
  }

  send.addEventListener("click", () => void submit());
  input.addEventListener("keydown", (e) => {
    const key = (e as KeyboardEvent).key;
    if (key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (key === "Escape" && picker.isOpen) {
      e.preventDefault();
      picker.close();
    }
    e.stopPropagation(); // Escape closes the island, not the chat
  });

  return {
    el,
    sync() {
      if(State.view!=="prompt" || State.settings.chatProvider!==quota.dataset.provider)quota.hidden=true;
      readReply.disabled = sending || !State.chatHistory.some(message => message.role === "assistant");
      stopSpeech.disabled = !State.novaSpeaking;
      if ((State.view !== "prompt" || State.mode !== "expanded") && State.novaSpeaking) Speech.stop();
      if (State.novaDraft != null) {
        input.value = State.novaDraft;
        State.novaDraft = null;
      }
      const file = State.droppedFile;
      attach.disabled=sending || State.filePreparing;
      attach.textContent=State.filePreparing?u("Готовим файл…"):u("Прикрепить файл");
      attach.title=u("Выбор файла начнёт новый чат. Сам файл отправится только вместе с вашим сообщением.");
      fileDestination.textContent=u("Файл получит {name} после нажатия «Отправить».",{name:providerDef(State.settings.chatProvider).name});
      const sent=State.chatHistory.some(m=>m.role==="assistant");
      const wantChip = `${file?.path ?? ""}|${sent}|${sending}|${State.filePreparing}`;
      if (chipRow.dataset.label !== wantChip) {
        chipRow.dataset.label = wantChip;
        clear(chipRow);
        if (file) {
          chipRow.append(contextChip(file.name),h("small",{text:sent?u("Файл уже в контексте чата"):u("Отправится с сообщением")}));
          chipRow.append(h("button",{type:"button",text:sent?u("Новый чат без файла"):u("Убрать файл"),disabled:sending || State.filePreparing,onclick:async()=>{
            try{
              if(sent){await Bridge.chatResetChecked();State.chatHistory=[];renderedCount=-1;}
              State.droppedFile=null;State.promptContext=null;fileFeedback.hidden=true;State.notify();onHeightChange();
            }catch{showNotice(u("Не удалось очистить контекст. Повторите попытку."));}
          }}));
        }
      }

      const thinking = State.stateOverride === "thinking";
      const count = State.chatHistory.length + (thinking ? 0.5 : 0);
      if (count !== renderedCount && !live) {
        renderedCount = count;
        clear(log);
        for (const m of State.chatHistory) log.append(bubble(m));
        if (thinking) log.append(typingDots());
        log.scrollTop = log.scrollHeight;
      }

      // Leaving the chat folds the picker away.
      if (State.view !== "prompt" && picker.isOpen) picker.close();
      drawModelButton();

      input.placeholder = t(State.chatHistory.length === 0 ? STRINGS.placeholderFirst : STRINGS.placeholderNext);
      input.disabled = sending || State.filePreparing;
      send.disabled = sending || State.filePreparing;
    },
    focus() {
      input.focus();
      input.select();
      if(!sending)void refreshQuota(State.settings.chatProvider,activeModel(State.settings));
    },
  };
}
