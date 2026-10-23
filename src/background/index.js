/**
 * src/background/index.js
 *
 * Receives batched detections from the content bridge and persists
 * aggregated, origin-only statistics in storage.local.
 *
 * Trust rules:
 *   - Only messages from this extension are accepted (sender.id).
 *   - The site identity comes from sender.url (set by the browser), never
 *     from anything the page or the message claims.
 *   - All writes go through one queue, so they never interleave.
 */

import {
    applyBatch,
    emptyState,
    normalizeState,
    originFromUrl,
    sanitizeBatch
} from "./event-store.js";

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

let writeQueue = Promise.resolve();

/** Run `task` after all earlier tasks; a failure never blocks later ones. */
function enqueue(task) {
    writeQueue = writeQueue.then(task).catch(() => {});
    return writeQueue;
}

async function loadState() {
    const stored = await extensionAPI.storage.local.get({
        stats: {},
        recent: []
    });
    return normalizeState(stored);
}

async function saveState(state) {
    await extensionAPI.storage.local.set({
        stats: state.stats,
        recent: state.recent
    });
}

// Privacy cleanup: earlier versions stored a `detections` list that
// contained full page URLs. Remove it.
enqueue(() => extensionAPI.storage.local.remove("detections"));

extensionAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== extensionAPI.runtime.id) return false;
    if (!message || typeof message !== "object") return false;

    if (message.type === "fingerprint-batch") {
        if (!sender.tab) return false;

        const origin = originFromUrl(sender.url);
        if (!origin) return false;

        const entries = sanitizeBatch(message.entries);
        if (!entries.length) return false;

        enqueue(async () => {
            const state = await loadState();
            applyBatch(state, origin, entries, Date.now());
            await saveState(state);
        });

        return false;
    }

    if (message.type === "clear-data") {
        if (sender.tab) return false; // only extension pages (the popup)

        enqueue(() => saveState(emptyState())).then(() =>
            sendResponse({ ok: true })
        );

        return true; // keep the channel open for the async response
    }

    return false;
});
