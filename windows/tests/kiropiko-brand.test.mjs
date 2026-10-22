import test from "node:test";
import assert from "node:assert/strict";
import { LANGUAGE_CODES, setLanguage, t } from "../src/i18n/i18n.ts";

test("Android instructions use KiroPiko while supplied names remain untouched", () => {
  const key = "In Coucou for Android, scan this code with the camera or paste the link.";
  try {
    for (const lang of LANGUAGE_CODES) {
      setLanguage(lang);
      assert.ok(!t(key).includes("Coucou"), lang);
      const template = "Open {name}";
      assert.ok(t(template, { name: "Coucou project" }).includes("Coucou project"));
    }
  } finally { setLanguage("en"); }
});
