import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDictionary, noteMarkdown } from "../src/notebook/model.ts";
test("dictionary parses Cyrillic phrases and preserves multiline snippets", () => {
  const d = parseDictionary("KiroPiko\nUzCombinator", "киро пико => KiroPiko", "подпись => Давлат\\nKiroPiko");
  assert.deepEqual(d.words, ["KiroPiko", "UzCombinator"]);
  assert.equal(d.replacements[0].from, "киро пико");
  assert.equal(d.snippets[0].text, "Давлат\nKiroPiko");
  assert.throws(() => parseDictionary("", "неправильная строка", ""), /Строка 1/);
  assert.throws(() => parseDictionary("", " => x", ""), /Строка 1/);
  assert.equal(parseDictionary("", "условие => a => b", "").replacements[0].to, "a => b");
});
test("note export labels generated summaries and preserves the original transcript", () => {
  const md = noteMarkdown({ title: "Встреча", text: "Исходный текст", summary: "Черновик AI", updatedAt: 1 });
  assert.match(md, /Исходный текст/); assert.match(md, /проверьте факты/); assert.match(md, /Черновик AI/);
});
