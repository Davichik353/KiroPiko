import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// The original sequence contains a TS parameter property, so compile this pure
// module using the same TypeScript dependency as the application.
const source = readFileSync(new URL("../src/upload/sequence.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { UploadSeq, USC } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("a real drop restarts a sequence reset by opening the compact island and reaches the file actions", () => {
  let clock = 10000;
  mock.method(performance, "now", () => clock);
  try {
    UploadSeq.enterZone(200, 90);
    UploadSeq.deactivate();
    UploadSeq.performDrop(2.4);
    assert.equal(UploadSeq.isActive, true);
    assert.equal(UploadSeq.dropped, true);
    assert.equal(UploadSeq.sinceDrop(), 0);
    clock += (USC.T_PROG_START - USC.T_DROP + 2.4 + 2) * 1000;
    assert.ok(UploadSeq.frame().chooseAlpha > 0.99);
  } finally { UploadSeq.deactivate(); mock.restoreAll(); }
});
