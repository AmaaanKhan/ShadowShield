import test from "node:test";
import assert from "node:assert/strict";

import {
    LIMITS,
    applyBatch,
    emptyState,
    normalizeState,
    originFromUrl,
    sanitizeBatch
} from "../../src/background/event-store.js";

test("originFromUrl keeps only normal HTTP origins", () => {
    assert.equal(originFromUrl("https://example.com/path?q=1#hash"), "https://example.com");
    assert.equal(originFromUrl("http://localhost:8000/a"), "http://localhost:8000");
    assert.equal(originFromUrl("about:blank"), null);
    assert.equal(originFromUrl("file:///tmp/page.html"), null);
    assert.equal(originFromUrl("not a url"), null);
});

test("sanitizeBatch validates entries, clamps counts, and caps size", () => {
    const entries = [
        { api: "", category: "Canvas", count: 2 },
        { api: "a".repeat(101), category: "Canvas", count: 2 },
        { api: "__proto__", category: "Canvas", count: 2 },
        { api: 42, category: "Canvas", count: 2 },
        null,
        { api: "good", category: "Canvas", count: 2 ** 53 },
        { api: "bad-count", category: "Canvas", count: "x" },
        ...Array.from({ length: LIMITS.maxBatchEntries + 5 }, (_, index) => ({
            api: `api-${index}`,
            category: "Canvas",
            count: 1
        }))
    ];

    const clean = sanitizeBatch(entries);
    assert.equal(clean.length, LIMITS.maxBatchEntries);
    assert.deepEqual(clean[0], {
        api: "good",
        category: "Canvas",
        count: LIMITS.maxCountPerEntry
    });
    assert.deepEqual(clean[1], {
        api: "bad-count",
        category: "Canvas",
        count: 1
    });
    assert.deepEqual(sanitizeBatch("not an array"), []);
});

test("applyBatch aggregates counts and records actor frames", () => {
    const state = emptyState();
    applyBatch(
        state,
        "https://site.example",
        [{ api: "Canvas.toDataURL", category: "Canvas", count: 3 }],
        100,
        LIMITS,
        "https://embed.example"
    );
    applyBatch(
        state,
        "https://site.example",
        [{ api: "Canvas.toDataURL", category: "Canvas", count: 2 }],
        200,
        LIMITS,
        "https://embed.example"
    );

    assert.equal(state.stats["https://site.example"].apis["Canvas.toDataURL"].count, 5);
    assert.equal(state.stats["https://site.example"].apis["Canvas.toDataURL"].firstSeen, 100);
    assert.equal(state.stats["https://site.example"].apis["Canvas.toDataURL"].lastSeen, 200);
    assert.deepEqual(state.stats["https://site.example"].frames["https://embed.example"], {
        count: 5,
        firstSeen: 100,
        lastSeen: 200
    });
});

test("applyBatch ignores invalid or same-origin actors", () => {
    const state = emptyState();
    const entries = [{ api: "a", category: "x", count: 1 }];
    applyBatch(state, "https://site.example", entries, 1, LIMITS, "https://site.example");
    applyBatch(state, "https://site.example", entries, 2, LIMITS, "garbage");
    assert.equal(state.stats["https://site.example"].frames, undefined);
});

test("applyBatch preserves API counts when the actor frame cap is reached", () => {
    const limits = { ...LIMITS, maxFramesPerOrigin: 1 };
    const state = emptyState();
    applyBatch(state, "https://site.example", [{ api: "one", category: "x", count: 1 }], 1, limits, "https://one.example");
    applyBatch(state, "https://site.example", [{ api: "two", category: "x", count: 1 }], 2, limits, "https://two.example");

    assert.equal(Object.keys(state.stats["https://site.example"].frames).length, 1);
    assert.equal(state.stats["https://site.example"].apis.two.count, 1);
});

test("applyBatch rejects non-origin sites and evicts old origins", () => {
    const limits = { ...LIMITS, maxOrigins: 2 };
    const state = emptyState();
    applyBatch(state, "https://old.example", [{ api: "a", category: "x", count: 1 }], 1, limits);
    applyBatch(state, "https://middle.example", [{ api: "a", category: "x", count: 1 }], 2, limits);
    applyBatch(state, "https://new.example", [{ api: "a", category: "x", count: 1 }], 3, limits);
    applyBatch(state, "https://site.example/path", [{ api: "bad", category: "x", count: 1 }], 4, limits);

    assert.deepEqual(Object.keys(state.stats), ["https://middle.example", "https://new.example"]);
    assert.equal(state.recent.some((item) => item.origin === "https://old.example"), false);
});

test("normalizeState tolerates malformed and old-format data", () => {
    assert.deepEqual(normalizeState(null), emptyState());
    const state = normalizeState({
        stats: {
            "https://site.example": {
                lastSeen: "10",
                apis: {},
                frames: "bad"
            },
            broken: "value"
        },
        recent: [null, {}, "bad"]
    });
    assert.deepEqual(state.stats["https://site.example"].frames, {});
    assert.equal(state.recent.length, 1);
});

test("recent activity is capped", () => {
    const state = emptyState();
    for (let index = 0; index < LIMITS.maxRecent + 5; index++) {
        applyBatch(state, "https://site.example", [{
            api: `api-${index}`,
            category: "x",
            count: 1
        }], index);
    }
    assert.equal(state.recent.length, LIMITS.maxRecent);
});
