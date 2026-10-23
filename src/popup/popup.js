/**
 * src/popup/popup.js  —  ShadowShield popup controller
 *
 * Reads the active protection profile from src/shared/profiles.js so
 * the "Protection Profile" section always reflects the real spoofed values
 * instead of a hardcoded list.
 */

import { getProfileDisplayRows } from "../shared/profiles.js";

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

/**
 * Aggregated data from storage (see docs/ARCHITECTURE.md, Storage Schema).
 * @type {Record<string, {lastSeen: number, apis: Record<string, {category: string, count: number, firstSeen: number, lastSeen: number}>}>}
 */
let stats = {};

/** @type {Array<{origin: string, api: string, category: string, count: number, timestamp: number}>} */
let recent = [];


function displayProtectionProfile() {
    const container = document.getElementById("protection-status");
    container.replaceChildren();

    const heading = document.createElement("p");
    heading.textContent = "Active Protection Profile";

    const description = document.createElement("p");
    description.textContent =
        "These values are applied by the page injection layer.";

    const list = document.createElement("div");

    for (const { label, value } of getProfileDisplayRows()) {
        const item = document.createElement("div");
        item.className = "detection";

        const lbl = document.createElement("strong");
        lbl.textContent = label;

        const val = document.createElement("div");
        val.textContent = `Configured value: ${value}`;

        item.append(lbl, val);
        list.appendChild(item);
    }

    container.append(heading, description, list);
}


const categoryLabels = {
    "Device Information": "Device & Browser",
    "Navigator/Screen": "Device & Browser",
    Display: "Display",
    "System Settings": "System Settings",
    "Browser Identity": "Browser Identity",
    Canvas: "Canvas Fingerprinting",
    WebGL: "Graphics (WebGL)",
    Font: "Font Fingerprinting",
    Audio: "Audio Fingerprinting",
    Unknown: "Other Activity"
};

const friendlyNames = {
    "Logical CPU cores": "CPU core count",
    "Reported device memory": "Reported system memory",
    "Operating system/platform": "Operating system / platform",
    "Browser user-agent": "Browser identity",
    "Browser app version": "Browser version information",
    "Browser vendor": "Browser vendor",
    "Preferred language": "Preferred language",
    "Preferred languages": "Language preferences",
    "Touchscreen capability": "Touchscreen support",
    "Automation status": "Browser automation indicator",
    "Screen width": "Screen width",
    "Screen height": "Screen height",
    "Available screen width": "Available screen width",
    "Available screen height": "Available screen height",
    "Screen color depth": "Display color depth",
    "Screen pixel depth": "Display pixel depth",
    "Display pixel ratio": "Display pixel ratio",
    "Timezone and locale settings": "Timezone and locale",
    "Timezone UTC offset": "Timezone UTC offset",
    "Canvas.toDataURL": "Canvas image extraction",
    "Canvas.measureText": "Font measurement",
    "AudioContext.createAnalyser": "Audio analysis access",
    "WebGL.getExtension": "Graphics capability lookup",
    "WebGL.getParameter": "Graphics hardware information",
    "Canvas.getContext(webgl)": "WebGL graphics access",
    "Canvas.getContext(webgl2)": "WebGL 2 graphics access",
    "Canvas.getContext(experimental-webgl)": "Experimental WebGL access"
};

/** Own-property lookup, so names like "constructor" never hit Object.prototype. */
function lookup(table, key) {
    return Object.prototype.hasOwnProperty.call(table, key)
        ? table[key]
        : undefined;
}

function friendlyName(api) {
    if (!api) return "Unknown activity";
    if (lookup(friendlyNames, api)) return lookup(friendlyNames, api);

    if (api.startsWith("Browser identity hint:")) {
        const hint = api.split(":").slice(1).join(":").trim();
        const names = {
            architecture: "CPU architecture hint",
            bitness: "System bitness hint",
            platformVersion: "Operating system version hint",
            model: "Device model hint",
            fullVersionList: "Browser version details"
        };
        return lookup(names, hint) || `Browser identity: ${hint}`;
    }

    return api;
}

function getOrigin(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:"
            ? parsed.origin
            : null;
    } catch {
        return null;
    }
}

function getHostname(origin) {
    try {
        return new URL(origin).host;
    } catch {
        return origin || "Unknown website";
    }
}

function siteTotal(site) {
    return Object.values(site.apis).reduce((sum, e) => sum + e.count, 0);
}

/** Merge stats (all sites, or one origin) into [{ api, category, count }]. */
function collectEntries(selected) {
    const merged = new Map();
    const origins = selected === "all" ? Object.keys(stats) : [selected];

    for (const origin of origins) {
        const site = stats[origin];
        if (!site) continue;

        for (const [api, entry] of Object.entries(site.apis)) {
            const key = `${entry.category}\u0000${api}`;
            const existing = merged.get(key);

            if (existing) {
                existing.count += entry.count;
            } else {
                merged.set(key, {
                    api,
                    category: entry.category,
                    count: entry.count
                });
            }
        }
    }

    return [...merged.values()];
}

async function loadDetections() {
    displayProtectionProfile();

    const [stored, tabs] = await Promise.all([
        extensionAPI.storage.local.get({ stats: {}, recent: [] }),
        extensionAPI.tabs.query({
            active: true,
            currentWindow: true
        })
    ]);

    stats = stored.stats || {};
    recent = Array.isArray(stored.recent) ? stored.recent : [];

    const currentOrigin = getOrigin(tabs[0]?.url);

    displayCurrentSite(currentOrigin);
    displayTopSites();
    populateSiteFilter();

    document.getElementById("site-filter").value = "all";
    renderSelectedSite();
}

function displayCurrentSite(origin) {
    const container = document.getElementById("current-site");
    container.replaceChildren();

    if (!origin) {
        container.textContent =
            "Website information is unavailable for this tab.";
        return;
    }

    const heading = document.createElement("strong");
    heading.textContent = getHostname(origin);

    const count = Object.prototype.hasOwnProperty.call(stats, origin)
        ? siteTotal(stats[origin])
        : 0;

    const details = document.createElement("p");
    details.textContent = count
        ? `${count} recorded API accesses`
        : "No API accesses recorded yet.";

    container.append(heading, details);
}

function displayTopSites() {
    const container = document.getElementById("top-sites");
    container.replaceChildren();

    const topSites = Object.entries(stats)
        .map(([origin, site]) => ({
            origin,
            count: siteTotal(site),
            latest: site.lastSeen || 0
        }))
        .sort((a, b) => b.count - a.count || b.latest - a.latest)
        .slice(0, 3);

    if (!topSites.length) {
        container.textContent = "No website activity recorded yet.";
        return;
    }

    for (const { origin, count } of topSites) {
        const item = document.createElement("div");
        item.className = "detection";

        const name = document.createElement("strong");
        name.textContent = getHostname(origin);

        const total = document.createElement("p");
        total.textContent = `${count} recorded API accesses`;

        const button = document.createElement("button");
        button.textContent = "View details";
        button.addEventListener("click", () => {
            document.getElementById("site-filter").value = origin;
            renderSelectedSite();
        });

        item.append(name, total, button);
        container.appendChild(item);
    }
}

function populateSiteFilter() {
    const filter = document.getElementById("site-filter");
    const previousValue = filter.value || "all";

    const origins = Object.keys(stats).sort();

    filter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All websites";
    filter.appendChild(allOption);

    for (const origin of origins) {
        const option = document.createElement("option");
        option.value = origin;
        option.textContent = getHostname(origin);
        filter.appendChild(option);
    }

    filter.value = origins.includes(previousValue) ? previousValue : "all";
}

function renderSelectedSite() {
    const selected = document.getElementById("site-filter").value;

    const entries = collectEntries(selected);
    const recentItems = selected === "all"
        ? recent
        : recent.filter((item) => item.origin === selected);

    displaySummary(entries);
    displayDetections(recentItems);
}

function displaySummary(entries) {
    const summary = document.getElementById("summary");
    summary.replaceChildren();

    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const uniqueAttributes = new Set(entries.map((e) => e.api));

    const heading = document.createElement("p");
    heading.textContent = `Total API accesses: ${total}`;

    const unique = document.createElement("p");
    unique.textContent =
        `Distinct attributes observed: ${uniqueAttributes.size}`;

    summary.append(heading, unique);

    if (!entries.length) {
        const empty = document.createElement("p");
        empty.textContent = "No recorded activity for this selection.";
        summary.appendChild(empty);
        return;
    }

    const counts = new Map();

    for (const { category, count } of entries) {
        const name = category || "Unknown";
        counts.set(name, (counts.get(name) || 0) + count);
    }

    for (const [category, count] of [...counts.entries()]
        .sort((a, b) => b[1] - a[1])) {
        const line = document.createElement("p");
        const label = document.createElement("strong");
        label.textContent = lookup(categoryLabels, category) || category;
        line.append(label, document.createTextNode(`: ${count}`));
        summary.appendChild(line);
    }
}

function displayDetections(items) {
    const container = document.getElementById("detections");
    container.replaceChildren();

    if (!items.length) {
        container.textContent = "No recorded activity.";
        return;
    }

    for (const item of [...items].reverse().slice(0, 20)) {
        const row = document.createElement("div");
        row.className = "detection";

        const category = document.createElement("strong");
        category.textContent =
            lookup(categoryLabels, item.category) ||
            item.category ||
            "Other Activity";

        const api = document.createElement("div");
        api.textContent = item.count > 1
            ? `${friendlyName(item.api)} \u00d7${item.count}`
            : friendlyName(item.api);

        const site = document.createElement("small");
        site.textContent = getHostname(item.origin);

        const timestamp = document.createElement("small");
        timestamp.textContent = item.timestamp
            ? new Date(item.timestamp).toLocaleString()
            : "Unknown time";

        row.append(category, api, site, timestamp);
        container.appendChild(row);
    }
}

function showLoadError(error) {
    console.error("ShadowShield: Failed to load detections.", error);
    document.getElementById("current-site").textContent =
        "Could not load website information.";
    document.getElementById("top-sites").textContent =
        "Could not load website activity.";
    document.getElementById("summary").textContent =
        "Could not load activity summary.";
}

document.getElementById("site-filter").addEventListener(
    "change",
    renderSelectedSite
);

document.getElementById("clear-data").addEventListener("click", async () => {
    try {
        await extensionAPI.runtime.sendMessage({ type: "clear-data" });
        await loadDetections();
    } catch (error) {
        showLoadError(error);
    }
});

loadDetections().catch(showLoadError);
