/**
 * src/blocking/popup.js
 *
 * The "Trackers and ads" card in the popup: switches for trackers, ads and the
 * current site, plus what was blocked on this page. Built into
 * dist/popup/blocking.js and loaded by popup.html next to popup.js.
 */

import { countBlocked, hostFromUrl } from "./settings.js";
import trackersMeta from "./rules/trackers.meta.json";
import adsMeta from "./rules/ads.meta.json";

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

const trackersToggle = document.getElementById("blocking-trackers-toggle");
const adsToggle = document.getElementById("blocking-ads-toggle");
const siteToggle = document.getElementById("blocking-site-toggle");
const siteName = document.getElementById("blocking-site-name");
const summary = document.getElementById("blocking-summary");
const errorBox = document.getElementById("blocking-error");
const listInfo = document.getElementById("blocking-lists");

let settings = { trackers: true, ads: true, allowedSites: [] };
let tabId = null;
let host = null;
let changed = false;

async function send(message) {
    const reply = await extensionAPI.runtime.sendMessage(message);
    if (!reply || !reply.ok) {
        throw new Error((reply && reply.error) || "No answer from the background.");
    }
    return reply.settings;
}

function showError(text) {
    errorBox.textContent = text;
    errorBox.hidden = !text;
}

function plural(count, word) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
}

async function loadCounts() {
    // Works with the activeTab permission, which opening the popup grants.
    // Firefox only offers this to everyone when the developer setting
    // extensions.dnr.feedback is on; otherwise we say the count is unavailable.
    try {
        const result = await extensionAPI.declarativeNetRequest.getMatchedRules({ tabId });
        return countBlocked(result && result.rulesMatchedInfo);
    } catch {
        return null;
    }
}

async function renderSummary() {
    const anyOn = settings.trackers || settings.ads;
    let text;

    if (host === null) {
        text = "Open a website to see what was blocked.";
    } else if (!anyOn) {
        text = "Blocking is paused.";
    } else if (settings.allowedSites.includes(host)) {
        text = "Blocking is off for this site.";
    } else {
        const counts = await loadCounts();
        if (counts === null) {
            text = "Blocked count is not available in this browser.";
        } else {
            const parts = [];
            if (settings.trackers) parts.push(plural(counts.trackers, "tracker"));
            if (settings.ads) parts.push(plural(counts.ads, "ad"));
            text = `${parts.join(" and ")} blocked on this page`;
        }
    }

    summary.textContent = changed ? `${text}. Reload the page to apply.` : text;
}

function render() {
    trackersToggle.checked = settings.trackers;
    adsToggle.checked = settings.ads;

    if (host === null) {
        siteName.textContent = "Not available on this page";
        siteToggle.checked = false;
        siteToggle.disabled = true;
    } else {
        siteName.textContent = host;
        siteToggle.checked = !settings.allowedSites.includes(host);
        siteToggle.disabled = !(settings.trackers || settings.ads);
    }

    return renderSummary();
}

async function change(message) {
    showError("");
    try {
        settings = await send(message);
        changed = true;
    } catch (error) {
        showError(error.message);
        settings = await send({ type: "blocking:get-state" }).catch(() => settings);
    }
    await render();
}

async function init() {
    listInfo.textContent =
        `Lists: ${trackersMeta.name} (${trackersMeta.listLastModified}), ` +
        `${adsMeta.name} (${adsMeta.listLastModified})`;

    const tabs = await extensionAPI.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    tabId = tab ? tab.id : null;
    host = tab && tab.url ? hostFromUrl(tab.url) : null;
    settings = await send({ type: "blocking:get-state" });

    trackersToggle.addEventListener("change", (event) =>
        change({ type: "blocking:set-trackers", value: event.target.checked }));
    adsToggle.addEventListener("change", (event) =>
        change({ type: "blocking:set-ads", value: event.target.checked }));
    siteToggle.addEventListener("change", (event) =>
        change({
            type: "blocking:set-site-protected",
            host,
            value: event.target.checked
        }));

    await render();
}

init().catch((error) => {
    console.error("ShadowShield blocking: popup failed to load.", error);
    showError("Could not load blocking settings. Please reload the popup.");
});

