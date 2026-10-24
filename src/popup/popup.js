import { getProfileDisplayRows } from "../shared/profiles.js";

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

let stats = {};
let recent = [];
let settings = { webrtcProtection: true };
let status = { webrtc: "unavailable" };
let currentOrigin = null;
let viewedOrigin = null;
let clearTimer = null;

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

const categoryColors = {
    Canvas: "#e76f51",
    WebGL: "#2a9d8f",
    Font: "#e9c46a",
    Audio: "#8b5cf6",
    "Device Information": "#2463eb",
    Display: "#0f766e",
    "System Settings": "#d9480f",
    "Browser Identity": "#c2255c"
};

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
    return Object.values(site.apis || {}).reduce((sum, entry) => sum + entry.count, 0);
}

function siteForView() {
    return viewedOrigin ? stats[viewedOrigin] : null;
}

function showEmpty(container, text) {
    container.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty";
    message.textContent = text;
    container.appendChild(message);
}

function displayCurrentSite() {
    const container = document.getElementById("current-site");
    const site = siteForView();
    container.replaceChildren();

    if (!viewedOrigin) {
        showEmpty(container, "ShadowShield only watches normal web pages.");
        document.getElementById("site-origin").textContent = "";
        return;
    }

    document.getElementById("site-origin").textContent =
        viewedOrigin === currentOrigin ? "This tab" : "Selected site";

    const hostname = document.createElement("div");
    hostname.className = "site-hostname";
    hostname.textContent = getHostname(viewedOrigin);

    const distinct = document.createElement("strong");
    distinct.textContent = String(site ? Object.keys(site.apis || {}).length : 0);
    const label = document.createElement("span");
    label.textContent = "signals read";
    const stat = document.createElement("div");
    stat.className = "site-stat";
    stat.append(distinct, label);

    const total = document.createElement("p");
    total.className = "site-total";
    total.textContent = `${site ? siteTotal(site) : 0} total accesses`;
    container.append(hostname, stat, total);
}

function displaySummary() {
    const container = document.getElementById("summary");
    const site = siteForView();
    container.replaceChildren();

    if (!site || !Object.keys(site.apis || {}).length) {
        showEmpty(container, viewedOrigin
            ? "Nothing detected on this site yet."
            : "ShadowShield only watches normal web pages.");
        return;
    }

    const counts = new Map();
    for (const entry of Object.values(site.apis)) {
        counts.set(entry.category, (counts.get(entry.category) || 0) + entry.count);
    }

    const rows = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const maximum = rows[0][1];

    for (const [category, count] of rows) {
        const row = document.createElement("div");
        row.className = "signal-row";
        const dot = document.createElement("span");
        dot.className = "signal-dot";
        dot.style.setProperty("--dot", lookup(categoryColors, category) || "#8994a5");
        const label = document.createElement("span");
        label.className = "signal-label";
        label.textContent = lookup(categoryLabels, category) || category;
        const number = document.createElement("span");
        number.className = "signal-count";
        number.textContent = String(count);
        const bar = document.createElement("span");
        bar.className = "signal-bar";
        const fill = document.createElement("span");
        fill.style.setProperty("--dot", lookup(categoryColors, category) || "#8994a5");
        fill.style.width = `${Math.max(3, count / maximum * 100)}%`;
        bar.appendChild(fill);
        row.append(dot, label, number, bar);
        container.appendChild(row);
    }
}

function displayFrames() {
    const card = document.getElementById("frames-card");
    const container = document.getElementById("frames");
    const frames = siteForView() && siteForView().frames;
    container.replaceChildren();

    if (!frames || !Object.keys(frames).length) {
        card.hidden = true;
        return;
    }

    card.hidden = false;
    for (const [origin, frame] of Object.entries(frames)
        .sort((a, b) => b[1].count - a[1].count)) {
        const row = document.createElement("div");
        row.className = "frame-row";
        const name = document.createElement("span");
        name.className = "frame-name";
        name.textContent = getHostname(origin);
        const count = document.createElement("span");
        count.className = "frame-count";
        count.textContent = `${frame.count} reads`;
        row.append(name, count);
        container.appendChild(row);
    }
}

function displayRecent() {
    const container = document.getElementById("detections");
    const items = viewedOrigin
        ? recent.filter((item) => item.origin === viewedOrigin).slice(-10).reverse()
        : [];

    if (!items.length) {
        showEmpty(container, "No recent activity.");
        return;
    }

    container.replaceChildren();
    for (const item of items) {
        const row = document.createElement("div");
        row.className = "activity-row";
        const api = document.createElement("span");
        api.className = "activity-api";
        api.textContent = `${friendlyName(item.api)}${item.count > 1 ? ` x${item.count}` : ""}`;
        const time = document.createElement("span");
        time.className = "activity-time";
        time.textContent = item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString()
            : "Unknown time";
        row.append(api, time);
        container.appendChild(row);
    }
}

function displayAllSites() {
    const container = document.getElementById("all-sites");
    container.replaceChildren();

    if (viewedOrigin !== currentOrigin && currentOrigin) {
        const back = document.createElement("button");
        back.className = "back-link";
        back.textContent = "Back to this tab's site";
        back.addEventListener("click", () => {
            viewedOrigin = currentOrigin;
            render();
        });
        container.appendChild(back);
    }

    const sites = Object.entries(stats)
        .map(([origin, site]) => ({ origin, count: siteTotal(site) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    if (!sites.length) {
        showEmpty(container, "No website activity recorded yet.");
        return;
    }

    for (const site of sites) {
        const row = document.createElement("div");
        row.className = "site-row";
        const button = document.createElement("button");
        button.className = "site-button site-name";
        button.textContent = getHostname(site.origin);
        button.addEventListener("click", () => {
            viewedOrigin = site.origin;
            render();
        });
        const count = document.createElement("span");
        count.className = "site-count";
        count.textContent = `${site.count} reads`;
        row.append(button, count);
        container.appendChild(row);
    }
}

const statusLabels = {
    active: "Active",
    off: "Off",
    unavailable: "Unavailable in this browser",
    "controlled-by-other": "Controlled by another extension",
    error: "Error"
};

function displaySettings() {
    document.getElementById("webrtc-toggle").checked =
        settings.webrtcProtection === true;
    document.getElementById("webrtc-status").textContent =
        `WebRTC protection: ${lookup(statusLabels, status.webrtc) || "Unavailable in this browser"}`;
}

function displayProtectionProfile() {
    const container = document.getElementById("protection-status");
    container.replaceChildren();
    for (const { label, value } of getProfileDisplayRows()) {
        const row = document.createElement("div");
        row.className = "profile-row";
        const name = document.createElement("strong");
        name.textContent = label;
        const configured = document.createElement("span");
        configured.textContent = value;
        row.append(name, configured);
        container.appendChild(row);
    }
}

function render() {
    displayCurrentSite();
    displaySummary();
    displayFrames();
    displayRecent();
    displayAllSites();
    displaySettings();
}

function showLoadError(error) {
    console.error("ShadowShield: Failed to load popup data.", error);
    const message = document.getElementById("load-error");
    message.hidden = false;
    message.textContent = "Could not load ShadowShield data. Please reload the popup.";
}

async function loadData() {
    const [stored, tabs] = await Promise.all([
        extensionAPI.storage.local.get({
            stats: {},
            recent: [],
            settings: { webrtcProtection: true },
            status: { webrtc: "unavailable" }
        }),
        extensionAPI.tabs.query({ active: true, currentWindow: true })
    ]);

    stats = stored.stats && typeof stored.stats === "object" ? stored.stats : {};
    recent = Array.isArray(stored.recent) ? stored.recent : [];
    settings = stored.settings && typeof stored.settings === "object"
        ? stored.settings
        : { webrtcProtection: true };
    status = stored.status && typeof stored.status === "object"
        ? stored.status
        : { webrtc: "unavailable" };
    currentOrigin = getOrigin(tabs[0] && tabs[0].url);
    viewedOrigin = currentOrigin;

    displayProtectionProfile();
    render();
}

document.getElementById("webrtc-toggle").addEventListener("change", async (event) => {
    try {
        settings = {
            ...settings,
            webrtcProtection: event.target.checked
        };
        await extensionAPI.storage.local.set({ settings });
        displaySettings();
    } catch (error) {
        event.target.checked = !event.target.checked;
        showLoadError(error);
    }
});

document.getElementById("clear-data").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (clearTimer !== null) {
        clearTimeout(clearTimer);
        clearTimer = null;
        try {
            await extensionAPI.runtime.sendMessage({ type: "clear-data" });
            await loadData();
        } catch (error) {
            showLoadError(error);
        }
        button.textContent = "Clear data";
        return;
    }

    button.textContent = "Click again to confirm";
    clearTimer = setTimeout(() => {
        clearTimer = null;
        button.textContent = "Clear data";
    }, 3000);
});

loadData().catch(showLoadError);
