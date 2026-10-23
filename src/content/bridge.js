/**
 * src/content/bridge.js
 *
 * Isolated-world bridge between the page-world inject layer and the
 * background script.
 *
 * The page can see and forge window messages, so nothing here trusts them:
 *   - every message is shape-validated and anything malformed is dropped;
 *   - events are collapsed into per-(api, category) counts;
 *   - at most one batched message is sent per second, with a hard cap on
 *     distinct keys per batch, so a hostile page cannot flood the extension;
 *   - the bridge sends NO origin or URL: the background derives the site
 *     from sender.url, which the browser sets and the page cannot change.
 *
 * A forged but well-formed event can still be counted. That is an accepted
 * limitation for now: it cannot inject URLs, grow storage past its caps, or
 * spam the popup.
 */

import { isValidDetection } from "../shared/detection-schema.js";

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

const FLUSH_INTERVAL_MS = 1000;
const MAX_KEYS_PER_FLUSH = 100;

/** @type {Map<string, {api: string, category: string, count: number}>} */
const pending = new Map();
let flushTimer = null;

function flush() {
    flushTimer = null;

    if (!pending.size) return;

    const entries = [...pending.values()];
    pending.clear();

    try {
        const result = extensionAPI.runtime.sendMessage({
            type: "fingerprint-batch",
            entries
        });

        if (result && typeof result.catch === "function") {
            result.catch(() => {}); // e.g. extension reloaded; nothing to do
        }
    } catch {
        // Extension context invalidated; drop the batch.
    }
}

window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const data = event.data;

    if (
        !data ||
        typeof data !== "object" ||
        data.source !== "ShadowShield" ||
        data.type !== "fingerprint"
    ) {
        return;
    }

    const api = data.api;
    const category = data.category || "Unknown";

    if (!isValidDetection(api, category)) return;

    const key = `${category}\u0000${api}`;
    const existing = pending.get(key);

    if (existing) {
        existing.count++;
    } else if (pending.size < MAX_KEYS_PER_FLUSH) {
        pending.set(key, { api, category, count: 1 });
    } else {
        return; // too many distinct keys this interval; drop
    }

    if (flushTimer === null) {
        flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
    }
});

// Don't lose the last events when the user navigates away.
window.addEventListener("pagehide", flush);
