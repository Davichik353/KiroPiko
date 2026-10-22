import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setLanguage } from "../src/i18n/i18n.ts";
import { u, ul } from "../src/i18n/kiro.ts";

test("new settings and productivity copy has English translations", () => {
  setLanguage("en");
  for (const file of ["settings/main.ts", "settings/navigation.ts", "settings/support.ts", "settings/agent-setup.ts", "nova/productivity/view.ts", "nova/productivity/store.ts", "nova/onboarding.ts", "island/island.ts", "views/views.ts"]) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    for (const [, literal] of source.matchAll(/\bu[l]?\(("(?:[^"\\]|\\.)*")/g)) {
      const key = JSON.parse(literal);
      assert.equal(/[А-Яа-яЁё]/.test(u(key)), false, `${file}: ${key}`);
    }
  }
});
test("agent link status explanations have English translations", () => {
  setLanguage("en");
  const source = readFileSync(new URL("../src/settings/agent-setup.ts",import.meta.url),"utf8");
  for (const [literal] of source.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
    const text = JSON.parse(literal);
    if (/[А-Яа-яЁё]/.test(text)) assert.equal(/[А-Яа-яЁё]/.test(u(text)),false,text);
  }
});
test("free API setup and quota copy is translated", () => {
  setLanguage("en");
  for (const file of ["settings/free-providers.ts","settings/api-limits.ts","core/free-providers.ts"]) {
    const source = readFileSync(new URL(`../src/${file}`,import.meta.url),"utf8");
    for (const [literal] of source.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
      const text = JSON.parse(literal);
      if (/[А-Яа-яЁё]/.test(text)) assert.equal(/[А-Яа-яЁё]/.test(u(text)),false,`${file}: ${text}`);
    }
  }
});

test("reactive labels follow language without translating user text", () => {
  setLanguage("ru");
  const label = ul("Быстрые действия");
  assert.equal(String(label), "Быстрые действия");
  setLanguage("en");
  assert.equal(String(label), "Quick actions");
  assert.equal(u("Удалить напоминание: {text}", {text:"Позвонить маме"}), "Delete reminder: Позвонить маме");
  assert.equal(u("{n} минут", {n:15}), "15 minutes");
  setLanguage("ru");
  assert.equal(u("{n} минут", {n:15}), "15 минут");
});
