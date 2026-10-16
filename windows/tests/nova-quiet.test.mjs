import { test } from "node:test";
import assert from "node:assert/strict";
import { quietPolicy } from "../src/nova/attention.ts";

test("manual quiet works without OS access; fullscreen auto quiet never means agent approval", () => {
  assert.equal(quietPolicy(true, false, null), true);
  assert.equal(quietPolicy(false, true, null), false);
  assert.equal(quietPolicy(false, true, 5), false);
  for (const state of [1, 2, 3, 4, 6]) {
    assert.equal(quietPolicy(false, true, state), true);
    assert.equal(quietPolicy(false, false, state), false);
  }
  assert.equal(quietPolicy(false, true, 7), false);
});
