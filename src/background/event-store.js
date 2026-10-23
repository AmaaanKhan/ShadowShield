/**
 * src/background/event-store.js
 *
 * Pure aggregation logic for detection data. NO browser APIs in this file,
 * so it can be unit tested in plain Node.
 *
 * State shape (what is persisted in storage.local):
 *
 *   stats:  {
 *     [origin]: {
 *       lastSeen: <epoch ms>,
 *       apis: { [api]: { category, count, firstSeen, lastSeen } }
 *     }
 *   }
 *   recent: [ { origin, api, category, count, timestamp } ]   // newest last
 *
 * Only origins (https://example.com) are ever stored - never paths or queries.
 */

import { isValidDetection } from "../shared/detection-schema.js";

export const LIMITS = Object.freeze({
    maxOrigins: 200,
    maxApisPerOrigin: 64,
    maxRecent: 50,
    maxBatchEntries: 100,
    maxCountPerEntry: 100000
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export function emptyState() {
    return { stats: {}, recent: [] };
}

/**
 * Turn a browser-supplied URL (sender.url) into an origin, or null if it is
 * not a normal http(s) page.
 */
export function originFromUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed.origin;
    } catch {
        return null;
    }
}

/** Defensive: make whatever came out of storage safe to work with. */
export function normalizeState(raw) {
    const state = emptyState();

    if (raw && typeof raw === "object") {
        if (raw.stats && typeof raw.stats === "object" && !Array.isArray(raw.stats)) {
            for (const [origin, site] of Object.entries(raw.stats)) {
                if (
                    site &&
                    typeof site === "object" &&
                    site.apis &&
                    typeof site.apis === "object" &&
                    !Array.isArray(site.apis)
                ) {
                    state.stats[origin] = {
                        lastSeen: Number(site.lastSeen) || 0,
                        apis: site.apis
                    };
                }
            }
        }

        if (Array.isArray(raw.recent)) {
            state.recent = raw.recent.filter(
                (item) => item && typeof item === "object"
            );
        }
    }

    return state;
}

/**
 * Validate and clean a batch received from the content bridge.
 * Anything malformed is dropped; counts are clamped.
 *
 * @returns {Array<{api: string, category: string, count: number}>}
 */
export function sanitizeBatch(entries, limits = LIMITS) {
    if (!Array.isArray(entries)) return [];

    const clean = [];

    for (const entry of entries) {
        if (clean.length >= limits.maxBatchEntries) break;
        if (!entry || typeof entry !== "object") continue;
        if (!isValidDetection(entry.api, entry.category)) continue;

        const count =
            Number.isInteger(entry.count) && entry.count >= 1
                ? Math.min(entry.count, limits.maxCountPerEntry)
                : 1;

        clean.push({ api: entry.api, category: entry.category, count });
    }

    return clean;
}

/**
 * Merge a sanitized batch into the state (mutates and returns `state`).
 * Enforces every cap: APIs per origin, number of origins, recent length.
 */
export function applyBatch(state, origin, entries, now, limits = LIMITS) {
    if (typeof origin !== "string" || !/^https?:\/\/[^/?#\s]+$/.test(origin)) {
        return state;
    }

    const isNewSite = !hasOwn(state.stats, origin);
    const site = isNewSite
        ? { lastSeen: now, apis: {} }
        : state.stats[origin];

    let touched = false;

    for (const { api, category, count } of entries) {
        let entry = hasOwn(site.apis, api) ? site.apis[api] : null;

        if (!entry) {
            if (Object.keys(site.apis).length >= limits.maxApisPerOrigin) {
                continue; // this origin already tracks the maximum APIs
            }
            entry = { category, count: 0, firstSeen: now, lastSeen: now };
            site.apis[api] = entry;
        }

        entry.count = Math.min(entry.count + count, Number.MAX_SAFE_INTEGER);
        entry.lastSeen = now;
        touched = true;

        state.recent.push({
            origin,
            api,
            category: entry.category,
            count,
            timestamp: now
        });
    }

    if (!touched) return state;

    site.lastSeen = now;
    state.stats[origin] = site;

    evictOldOrigins(state, limits);

    if (state.recent.length > limits.maxRecent) {
        state.recent = state.recent.slice(-limits.maxRecent);
    }

    return state;
}

/** Drop the least recently seen origins beyond the cap. */
export function evictOldOrigins(state, limits = LIMITS) {
    const origins = Object.keys(state.stats);
    if (origins.length <= limits.maxOrigins) return state;

    origins.sort((a, b) => state.stats[a].lastSeen - state.stats[b].lastSeen);

    for (const origin of origins.slice(0, origins.length - limits.maxOrigins)) {
        delete state.stats[origin];
    }

    state.recent = state.recent.filter((item) => hasOwn(state.stats, item.origin));

    return state;
}
