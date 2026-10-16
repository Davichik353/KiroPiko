import { test } from "node:test";
import assert from "node:assert/strict";
import { createUploadButtons } from "../src/upload/actions.ts";

test("the drawn upload choice exposes email and routes it without starting AI or cancelling the file", () => {
  const previous = globalThis.document;
  const element = () => ({ style: {}, children: [], attributes: {}, events: {},
    append(...nodes) { this.children.push(...nodes); },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(key, callback) { this.events[key] = callback; },
    getContext() { return null; },
  });
  globalThis.document = { createElement: element };
  try {
    const calls = [];
    const buttons = createUploadButtons(document, { ask: () => calls.push("ai"), mail: () => calls.push("mail"), cancel: () => calls.push("cancel") }, { ask: "AI", mail: "Отправить по почте", cancel: "Отмена" });
    assert.equal(buttons.length, 3);
    const mail = buttons.find(button => button.attributes["aria-label"] === "Отправить по почте");
    assert.ok(mail);
    mail.events.click();
    assert.deepEqual(calls, ["mail"]);
    buttons[0].events.click();
    assert.deepEqual(calls, ["mail", "ai"]);
  } finally { globalThis.document = previous; }
});
