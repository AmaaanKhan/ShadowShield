// Tracker and ad blocking section of the popup: shows what was blocked on the
// current tab and lets the user switch trackers, ads, or this site on or off.
// Kept separate from popup.js (fingerprint activity) and wrapped in a
// function so the two files cannot clash.

(() => {
    const api = globalThis.browser ?? globalThis.chrome;

    // Exception rules start at this id; must match tools/lib/abp-to-dnr.mjs.
    const ALLOW_RULE_ID_START = 100000;

    const el = (id) => document.getElementById(id);

    let state = { enabled: true, adsEnabled: true, allowedSites: [] };
    let tab = null;
    let host = null;

    function send(message) {
        return api.runtime.sendMessage(message).then((reply) => {
            if (!reply?.ok) throw new Error(reply?.error || "No response from background");
            return reply.result;
        });
    }

    function showError(text) {
        el("tracker-error").textContent = text;
        el("tracker-error").hidden = !text;
    }

    function hostFromUrl(url) {
        try {
            const u = new URL(url);
            if (u.protocol !== "http:" && u.protocol !== "https:") return null;
            return u.hostname.toLowerCase().replace(/^www\./, "");
        } catch (e) {
            return null;
        }
    }

    // Returns { trackers, ads } or null when the browser cannot tell us.
    async function countBlocked(tabId) {
        // Needs the activeTab permission, which is granted when the popup opens.
        // Firefox only provides this API when its debugging preference is on.
        try {
            const result = await api.declarativeNetRequest.getMatchedRules({ tabId });
            const matches = result?.rulesMatchedInfo ?? [];
            const count = (rulesetId) => matches.filter((m) =>
                m.rule.rulesetId === rulesetId && m.rule.ruleId < ALLOW_RULE_ID_START
            ).length;
            return { trackers: count("trackers"), ads: count("ads") };
        } catch (e) {
            return null;
        }
    }

    function plural(n, word) {
        return `${n} ${word}${n === 1 ? "" : "s"}`;
    }

    async function render() {
        const siteToggle = el("site-toggle");
        const anyBlocking = state.enabled || state.adsEnabled;
        el("global-toggle").checked = state.enabled;
        el("ads-toggle").checked = state.adsEnabled;

        if (host === null) {
            el("site-name").textContent = "this site";
            siteToggle.checked = false;
            siteToggle.disabled = true;
        } else {
            el("site-name").textContent = host;
            siteToggle.checked = !state.allowedSites.includes(host);
            siteToggle.disabled = !anyBlocking;
        }
        siteToggle.closest(".tracker-row").classList.toggle("disabled", siteToggle.disabled);

        const summary = el("tracker-summary");
        if (host === null) {
            summary.textContent = "Open a website to see blocked trackers.";
        } else if (!anyBlocking) {
            summary.textContent = "Tracker and ad blocking is paused.";
        } else if (state.allowedSites.includes(host)) {
            summary.textContent = "Protection is off for this site.";
        } else {
            const blocked = await countBlocked(tab.id);
            if (blocked === null) {
                summary.textContent = "Blocked count is not available in this browser.";
            } else {
                const parts = [];
                if (state.enabled) parts.push(plural(blocked.trackers, "tracker"));
                if (state.adsEnabled) parts.push(plural(blocked.ads, "ad"));
                summary.textContent = `${parts.join(" and ")} blocked on this page`;
            }
        }
    }

    async function loadListInfo() {
        const lines = [];
        for (const file of ["trackers", "ads"]) {
            try {
                const response = await fetch(api.runtime.getURL(`rules/${file}.meta.json`));
                const meta = await response.json();
                lines.push(`${meta.name} list, ${meta.listLastModified ?? "unknown date"}`);
            } catch (e) {
                // list info is optional
            }
        }
        el("list-info").textContent = lines.join(" | ");
    }

    async function change(message) {
        showError("");
        try {
            state = await send(message);
        } catch (e) {
            showError("Could not save that change. " + e.message);
            state = await send({ type: "get-state" }).catch(() => state);
        }
        await render();
    }

    async function init() {
        try {
            [tab] = await api.tabs.query({ active: true, currentWindow: true });
            host = tab?.url ? hostFromUrl(tab.url) : null;
            state = await send({ type: "get-state" });
        } catch (e) {
            showError("Could not load settings. " + e.message);
        }

        el("global-toggle").addEventListener("change", (event) =>
            change({ type: "set-enabled", value: event.target.checked }));

        el("ads-toggle").addEventListener("change", (event) =>
            change({ type: "set-ads-enabled", value: event.target.checked }));

        el("site-toggle").addEventListener("change", (event) =>
            change({ type: "set-site-allowed", host, value: !event.target.checked }));

        await render();
        loadListInfo();
    }

    init();
})();
