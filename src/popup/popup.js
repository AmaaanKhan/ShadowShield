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

let allDetections = [];


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

function friendlyName(api) {
    if (!api) return "Unknown activity";
    if (friendlyNames[api]) return friendlyNames[api];

    if (api.startsWith("Browser identity hint:")) {
        const hint = api.split(":").slice(1).join(":").trim();
        const names = {
            architecture: "CPU architecture hint",
            bitness: "System bitness hint",
            platformVersion: "Operating system version hint",
            model: "Device model hint",
            fullVersionList: "Browser version details"
        };
        return names[hint] || `Browser identity: ${hint}`;
    }

    return api;
}

function getOrigin(url) {
    try {
        return new URL(url).origin;
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

async function loadDetections() {
    displayProtectionProfile();
    const [stored, tabs] = await Promise.all([
        extensionAPI.storage.local.get({ detections: [] }),
        extensionAPI.tabs.query({
            active: true,
            currentWindow: true
        })
    ]);

    allDetections = stored.detections;

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

    const count = allDetections.filter(
        (d) => getOrigin(d.url) === origin
    ).length;

    const details = document.createElement("p");
    details.textContent = count
        ? `${count} recorded API accesses`
        : "No API accesses recorded yet.";

    container.append(heading, details);
}

function displayTopSites() {
    const container = document.getElementById("top-sites");
    container.replaceChildren();

    const counts = new Map();

    for (const detection of allDetections) {
        const origin = getOrigin(detection.url);
        if (!origin) continue;

        const entry = counts.get(origin) || { count: 0, latest: 0 };
        entry.count++;

        const timestamp = Date.parse(detection.timestamp);
        if (Number.isFinite(timestamp)) {
            entry.latest = Math.max(entry.latest, timestamp);
        }

        counts.set(origin, entry);
    }

    const topSites = [...counts.entries()]
        .sort((a, b) =>
            b[1].count - a[1].count ||
            b[1].latest - a[1].latest
        )
        .slice(0, 3);

    if (!topSites.length) {
        container.textContent = "No website activity recorded yet.";
        return;
    }

    for (const [origin, stats] of topSites) {
        const item = document.createElement("div");
        item.className = "detection";

        const name = document.createElement("strong");
        name.textContent = getHostname(origin);

        const count = document.createElement("p");
        count.textContent = `${stats.count} recorded API accesses`;

        const button = document.createElement("button");
        button.textContent = "View details";
        button.addEventListener("click", () => {
            document.getElementById("site-filter").value = origin;
            renderSelectedSite();
        });

        item.append(name, count, button);
        container.appendChild(item);
    }
}

function populateSiteFilter() {
    const filter = document.getElementById("site-filter");
    const previousValue = filter.value || "all";

    const origins = [...new Set(
        allDetections
            .map((d) => getOrigin(d.url))
            .filter(Boolean)
    )].sort();

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

    filter.value = origins.includes(previousValue)
        ? previousValue
        : "all";
}

function renderSelectedSite() {
    const selected = document.getElementById("site-filter").value;

    const detections = selected === "all"
        ? allDetections
        : allDetections.filter(
            (d) => getOrigin(d.url) === selected
        );

    displaySummary(detections);
    displayDetections(detections);
}

function displaySummary(detections) {
    const summary = document.getElementById("summary");
    summary.replaceChildren();

    const uniqueAttributes = new Set(
        detections.map((d) => d.api || "Unknown activity")
    );

    const heading = document.createElement("p");
    heading.textContent =
        `Total API accesses: ${detections.length}`;

    const unique = document.createElement("p");
    unique.textContent =
        `Distinct attributes observed: ${uniqueAttributes.size}`;

    summary.append(heading, unique);

    if (!detections.length) {
        const empty = document.createElement("p");
        empty.textContent = "No recorded activity for this selection.";
        summary.appendChild(empty);
        return;
    }

    const counts = new Map();

    for (const detection of detections) {
        const category = detection.category || "Unknown";
        counts.set(category, (counts.get(category) || 0) + 1);
    }

    for (const [category, count] of [...counts.entries()]
        .sort((a, b) => b[1] - a[1])) {
        const line = document.createElement("p");
        const label = document.createElement("strong");
        label.textContent = categoryLabels[category] || category;
        line.append(label, document.createTextNode(`: ${count}`));
        summary.appendChild(line);
    }
}

function displayDetections(detections) {
    const container = document.getElementById("detections");
    container.replaceChildren();

    if (!detections.length) {
        container.textContent = "No recorded activity.";
        return;
    }

    for (const detection of [...detections].reverse().slice(0, 20)) {
        const item = document.createElement("div");
        item.className = "detection";

        const category = document.createElement("strong");
        category.textContent =
            categoryLabels[detection.category] ||
            detection.category ||
            "Other Activity";

        const api = document.createElement("div");
        api.textContent = friendlyName(detection.api);

        const url = document.createElement("small");
        url.textContent = getHostname(getOrigin(detection.url));

        const timestamp = document.createElement("small");
        timestamp.textContent = detection.timestamp
            ? new Date(detection.timestamp).toLocaleString()
            : "Unknown time";

        item.append(category, api, url, timestamp);
        container.appendChild(item);
    }
}

document.getElementById("site-filter").addEventListener(
    "change",
    renderSelectedSite
);

loadDetections().catch((error) => {
    console.error("ShadowShield: Failed to load detections.", error);
    document.getElementById("current-site").textContent =
        "Could not load website information.";
    document.getElementById("top-sites").textContent =
        "Could not load website activity.";
    document.getElementById("summary").textContent =
        "Could not load activity summary.";
});
