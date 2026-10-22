// ShadowShield tracker protection (background side).
//
// The browser does the actual blocking using the rules in rules/trackers.json
// (declarativeNetRequest). This script only applies the user's settings:
//   - global on/off       -> enable or disable that rule file
//   - per-site "off"      -> a dynamic rule that allows everything on that site
//
// It keeps no state in memory (Chrome may stop the background at any time),
// so every change is read from and written to browser storage.
//
// Loaded before background.js: listed in manifest "background.scripts"
// (Firefox) and pulled in with importScripts() from background.js (Chrome).

(() => {
    const api = globalThis.browser ?? globalThis.chrome;
    const dnr = api.declarativeNetRequest;

    const RULESET_ID = "trackers";
    const DEFAULT_SETTINGS = { enabled: true, allowedSites: [] };
    const MESSAGE_TYPES = new Set(["get-state", "set-enabled", "set-site-allowed"]);

    async function getSettings() {
        const stored = await api.storage.local.get(DEFAULT_SETTINGS);
        return {
            enabled: stored.enabled !== false,
            allowedSites: Array.isArray(stored.allowedSites) ? stored.allowedSites : []
        };
    }

    async function applyEnabled(enabled) {
        const current = await dnr.getEnabledRulesets();
        const isOn = current.includes(RULESET_ID);
        if (enabled === isOn) return;
        await dnr.updateEnabledRulesets(
            enabled ? { enableRulesetIds: [RULESET_ID] }
                    : { disableRulesetIds: [RULESET_ID] });
    }

    // Sites the user turned protection off for. One "allowAllRequests" rule per
    // site lets everything through for that site's pages (and their iframes).
    async function applySiteRules(allowedSites) {
        const existing = await dnr.getDynamicRules();
        await dnr.updateDynamicRules({
            removeRuleIds: existing.map((rule) => rule.id),
            addRules: allowedSites.map((host, i) => ({
                id: i + 1,
                priority: 100,
                action: { type: "allowAllRequests" },
                condition: { requestDomains: [host], resourceTypes: ["main_frame"] }
            }))
        });
    }

    async function reconcile() {
        const settings = await getSettings();
        await applyEnabled(settings.enabled);
        await applySiteRules(settings.allowedSites);
    }

    async function showBlockedCountOnIcon() {
        // Chromium can show the number of blocked requests on the toolbar icon.
        // Firefox does not support this, so failure here is fine.
        try {
            await dnr.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
        } catch (err) {
            // not supported in this browser
        }
    }

    function normalizeHost(host) {
        return String(host || "").toLowerCase().replace(/^www\./, "");
    }

    async function handleMessage(message) {
        const settings = await getSettings();

        if (message.type === "get-state") {
            return settings;
        }

        if (message.type === "set-enabled") {
            settings.enabled = !!message.value;
            await api.storage.local.set({ enabled: settings.enabled });
            await applyEnabled(settings.enabled);
            return settings;
        }

        if (message.type === "set-site-allowed") {
            const host = normalizeHost(message.host);
            if (!host) return settings;
            const sites = new Set(settings.allowedSites);
            if (message.value) sites.add(host); else sites.delete(host);
            settings.allowedSites = [...sites].sort();
            await api.storage.local.set({ allowedSites: settings.allowedSites });
            await applySiteRules(settings.allowedSites);
            return settings;
        }
    }

    api.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Only handle this feature's messages; others (e.g. fingerprint
        // detections) belong to the listener in background.js.
        if (sender.id !== api.runtime.id || !MESSAGE_TYPES.has(message?.type)) {
            return false;
        }
        handleMessage(message).then(
            (result) => sendResponse({ ok: true, result }),
            (error) => sendResponse({ ok: false, error: String(error) })
        );
        return true; // the response is sent asynchronously
    });

    api.runtime.onInstalled.addListener(() => {
        reconcile().catch((e) => console.error("ShadowShield tracker setup failed:", e));
        showBlockedCountOnIcon();
    });

    api.runtime.onStartup.addListener(() => {
        reconcile().catch((e) => console.error("ShadowShield tracker startup failed:", e));
        showBlockedCountOnIcon();
    });
})();
