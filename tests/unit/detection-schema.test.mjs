import test from "node:test";
import assert from "node:assert/strict";

import { isValidDetection } from "../../src/shared/detection-schema.js";

test("isValidDetection accepts normal names", () => {
    assert.equal(isValidDetection("Canvas.toDataURL", "Canvas"), true);
});

test("isValidDetection rejects malformed names", () => {
    assert.equal(isValidDetection("", "Canvas"), false);
    assert.equal(isValidDetection("a".repeat(101), "Canvas"), false);
    assert.equal(isValidDetection("__proto__", "Canvas"), false);
    assert.equal(isValidDetection(42, "Canvas"), false);
    assert.equal(isValidDetection("Canvas", ""), false);
    assert.equal(isValidDetection("Canvas", "a".repeat(51)), false);
});
