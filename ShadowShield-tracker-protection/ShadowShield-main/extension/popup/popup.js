// ShadowShield popup: shows the blocked count for the current tab and lets
// the user pause blocking globally or for the current site.

const api = globalThis.browser ?? globalThis.chrome;

const RULESET_ID = "trackers";
const ALLOW_RULE_ID_START = 100000; // exception rules; must match tools/lib/abp-to-dnr.mjs

const el = (id) => document.getElementById(id);
const countBox = document.querySelector(".count");

let state = { enabled: true, allowedSites: [] };
let tab = null;
let host = null;

function send(message) {
    return api.runtime.sendMessage(message).then((reply) => {
        if (!reply?.ok) throw new Error(reply?.error || "No response from background");
        return reply.result;
    });
}

function showError(text) {
    el("error").textContent = text;
    el("error").hidden = !text;
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

async function countBlocked(tabId) {
    // Needs the activeTab permission, which is granted when the popup opens.
    // Firefox only provides this API when its debugging preference is on.
    try {
        const result = await api.declarativeNetRequest.getMatchedRules({ tabId });
        const matches = result?.rulesMatchedInfo ?? [];
        return matches.filter((m) =>
            m.rule.rulesetId === RULESET_ID && m.rule.ruleId < ALLOW_RULE_ID_START
        ).length;
    } catch (e) {
        return null;
    }
}

function siteIsProtected() {
    return state.enabled && host !== null && !state.allowedSites.includes(host);
}

async function render() {
    el("global-toggle").checked = state.enabled;

    const status = el("status");
    status.textContent = state.enabled ? "Tracker protection on" : "Tracker protection paused";
    status.classList.toggle("paused", !state.enabled);

    const siteToggle = el("site-toggle");
    const siteRow = el("site-row");
    if (host === null) {
        el("site-name").textContent = "Not available on this page";
        siteToggle.checked = false;
        siteToggle.disabled = true;
    } else {
        el("site-name").textContent = host;
        siteToggle.checked = !state.allowedSites.includes(host);
        siteToggle.disabled = !state.enabled;
    }
    siteRow.classList.toggle("disabled", siteToggle.disabled);

    countBox.classList.toggle("inactive", !siteIsProtected());
    if (host === null) {
        el("count").textContent = "–";
        el("count-label").textContent = "Open a website to see blocked trackers.";
    } else if (!state.enabled) {
        el("count").textContent = "–";
        el("count-label").textContent = "Blocking is paused.";
    } else if (!siteIsProtected()) {
        el("count").textContent = "–";
        el("count-label").textContent = "Protection is off for this site.";
    } else {
        const blocked = await countBlocked(tab.id);
        if (blocked === null) {
            el("count").textContent = "–";
            el("count-label").textContent = "Blocked count is not available in this browser.";
        } else {
            el("count").textContent = String(blocked);
            el("count-label").textContent =
                blocked === 1 ? "tracker blocked on this page" : "trackers blocked on this page";
        }
    }
}

async function loadListInfo() {
    try {
        const response = await fetch(api.runtime.getURL("rules/trackers.meta.json"));
        const meta = await response.json();
        el("list-info").textContent =
            `${meta.name} list, ${meta.listLastModified ?? "unknown date"}`;
    } catch (e) {
        el("list-info").textContent = "";
    }
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

    el("site-toggle").addEventListener("change", (event) =>
        change({ type: "set-site-allowed", host, value: !event.target.checked }));

    await render();
    loadListInfo();
}

init();
