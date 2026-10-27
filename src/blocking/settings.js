/**
 * src/blocking/settings.js
 *
 * Pure helpers for tracker and ad blocking: settings shape, host handling and
 * the browser rules derived from them. No browser APIs here, so everything is
 * unit-testable in Node (tests/unit/blocking-settings.test.mjs).
 *
 * Storage: one key, "blocking", in storage.local:
 *   { trackers: true, ads: true, allowedSites: ["example.com"] }
 * Only host names the user chose to switch off are stored (never paths, never
 * browsing history).
 */

export const STORAGE_KEY = "blocking";

/** Static rulesets declared in manifest.json; each has a setting of the same name. */
export const RULESET_IDS = ["trackers", "ads"];

/**
 * Exception rules in the generated lists have ids from here up (see
 * scripts/lib/abp-to-dnr.mjs). A match on a lower id is a real block.
 */
export const ALLOW_RULE_ID_START = 100000;

export const MAX_ALLOWED_SITES = 200;

const HOST_PATTERN =
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

/** Lower-case host without a leading "www.", or null if it is not a plain host. */
export function normalizeHost(value) {
    if (typeof value !== "string") return null;
    const host = value.trim().toLowerCase().replace(/^www\./, "");
    if (!host || host.length > 253 || !HOST_PATTERN.test(host)) return null;
    return host;
}

/** Host of an http(s) page URL, or null for anything else (about:, moz-extension:, ...). */
export function hostFromUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return normalizeHost(parsed.hostname);
    } catch {
        return null;
    }
}

function cleanSites(list) {
    const hosts = list.map((item) => normalizeHost(item)).filter(Boolean);
    return [...new Set(hosts)].sort().slice(0, MAX_ALLOWED_SITES);
}

/** Turns whatever is in storage into valid settings. Missing or corrupt means "on". */
export function normalizeSettings(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
        trackers: source.trackers !== false,
        ads: source.ads !== false,
        allowedSites: Array.isArray(source.allowedSites)
            ? cleanSites(source.allowedSites)
            : []
    };
}

/**
 * Applies one user change. Returns { settings, error } and never edits its input.
 * change.type: "set-trackers" | "set-ads" | "set-site-protected"
 */
export function applyChange(current, change) {
    const settings = normalizeSettings(current);
    if (!change || typeof change !== "object") {
        return { settings, error: "Unknown change." };
    }

    if (change.type === "set-trackers") {
        settings.trackers = change.value === true;
    } else if (change.type === "set-ads") {
        settings.ads = change.value === true;
    } else if (change.type === "set-site-protected") {
        const host = normalizeHost(change.host);
        if (!host) return { settings, error: "That page has no site to switch off." };

        const sites = new Set(settings.allowedSites);
        if (change.value === true) {
            sites.delete(host);
        } else {
            if (!sites.has(host) && sites.size >= MAX_ALLOWED_SITES) {
                return {
                    settings,
                    error: `You can switch off at most ${MAX_ALLOWED_SITES} sites.`
                };
            }
            sites.add(host);
        }
        settings.allowedSites = [...sites].sort();
    } else {
        return { settings, error: "Unknown change." };
    }

    return { settings, error: null };
}

/** Which static rulesets to switch on or off so the browser matches the settings. */
export function rulesetChanges(settings, enabledIds) {
    const enable = [];
    const disable = [];
    for (const id of RULESET_IDS) {
        const wanted = settings[id] === true;
        const isOn = enabledIds.includes(id);
        if (wanted && !isOn) enable.push(id);
        if (!wanted && isOn) disable.push(id);
    }
    return { enable, disable };
}

/**
 * One "allow everything" rule per site the user switched off. It covers the
 * page and everything it loads, for both lists at once.
 */
export function siteAllowRules(allowedSites) {
    return allowedSites.map((host, index) => ({
        id: index + 1,
        priority: 100,
        action: { type: "allowAllRequests" },
        condition: { requestDomains: [host], resourceTypes: ["main_frame"] }
    }));
}

/** Counts real blocks per list from the browser's list of matched rules. */
export function countBlocked(matches) {
    const counts = { trackers: 0, ads: 0 };
    for (const match of Array.isArray(matches) ? matches : []) {
        const rule = match && match.rule;
        if (!rule || rule.ruleId >= ALLOW_RULE_ID_START) continue;
        if (rule.rulesetId === "trackers") counts.trackers++;
        if (rule.rulesetId === "ads") counts.ads++;
    }
    return counts;
}
