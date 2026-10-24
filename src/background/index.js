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
import {
    effectiveWebRTCProtection,
    webRTCStatusForControl
} from "../shared/webrtc.js";

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

let writeQueue = Promise.resolve();
const pendingBatches = [];
let batchFlushTimer = null;

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

async function saveWebRTCStatus(status) {
    await extensionAPI.storage.local.set({ status: { webrtc: status } });
}

async function updateWebRTCProtection() {
    const privacyAPI =
        extensionAPI.privacy &&
        extensionAPI.privacy.network &&
        extensionAPI.privacy.network.webRTCIPHandlingPolicy;

    if (!privacyAPI) {
        await saveWebRTCStatus("unavailable");
        return;
    }

    try {
        const current = await privacyAPI.get({});
        const controlledStatus = webRTCStatusForControl(current.levelOfControl);
        if (controlledStatus) {
            await saveWebRTCStatus(controlledStatus);
            return;
        }

        const stored = await extensionAPI.storage.local.get({
            settings: { webrtcProtection: true }
        });
        const enabled = effectiveWebRTCProtection(stored);

        if (enabled) {
            await privacyAPI.set({
                value: "default_public_interface_only"
            });
        } else {
            await privacyAPI.clear({});
        }

        const confirmed = await privacyAPI.get({});
        const status =
            enabled &&
            confirmed.value === "default_public_interface_only"
                ? "active"
                : !enabled &&
                    confirmed.value !== "default_public_interface_only"
                    ? "off"
                    : "error";
        await saveWebRTCStatus(status);
    } catch {
        await saveWebRTCStatus("error");
    }
}

function flushPendingBatches() {
    batchFlushTimer = null;

    if (!pendingBatches.length) return;

    const batches = pendingBatches.splice(0);
    enqueue(async () => {
        const state = await loadState();
        for (const batch of batches) {
            applyBatch(
                state,
                batch.siteOrigin,
                batch.entries,
                Date.now(),
                undefined,
                batch.actorOrigin
            );
        }
        await saveState(state);
    });
}

function scheduleBatchFlush() {
    if (batchFlushTimer === null) {
        batchFlushTimer = setTimeout(flushPendingBatches, 500);
    }
}

// Privacy cleanup: earlier versions stored a `detections` list that
// contained full page URLs. Remove it.
enqueue(() => extensionAPI.storage.local.remove("detections"));
enqueue(updateWebRTCProtection);

if (
    extensionAPI.storage.onChanged &&
    typeof extensionAPI.storage.onChanged.addListener === "function"
) {
    extensionAPI.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.settings) {
            enqueue(updateWebRTCProtection);
        }
    });
}

extensionAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== extensionAPI.runtime.id) return false;
    if (!message || typeof message !== "object") return false;

    if (message.type === "fingerprint-batch") {
        if (!sender.tab) return false;

        const frameOrigin = originFromUrl(sender.url);
        const isTop = sender.frameId === undefined || sender.frameId === 0;
        const siteOrigin = isTop
            ? frameOrigin
            : originFromUrl(sender.tab.url);
        if (!siteOrigin) return false;

        const actorOrigin =
            !isTop && frameOrigin && frameOrigin !== siteOrigin
                ? frameOrigin
                : null;

        const entries = sanitizeBatch(message.entries);
        if (!entries.length) return false;

        pendingBatches.push({ siteOrigin, entries, actorOrigin });
        scheduleBatchFlush();

        return false;
    }

    if (message.type === "clear-data") {
        if (sender.tab) return false; // only extension pages (the popup)

        pendingBatches.splice(0);
        if (batchFlushTimer !== null) {
            clearTimeout(batchFlushTimer);
            batchFlushTimer = null;
        }
        enqueue(() => saveState(emptyState())).then(() =>
            sendResponse({ ok: true })
        );

        return true; // keep the channel open for the async response
    }

    return false;
});
