
const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

let allDetections = [];

async function loadDetections() {
    const [stored, tabs] = await Promise.all([
        extensionAPI.storage.local.get({ detections: [] }),
        extensionAPI.tabs.query({
            active: true,
            currentWindow: true
        })
    ]);

    allDetections = stored.detections;

    const activeTab = tabs[0];
    const currentOrigin = getOrigin(activeTab?.url);

    displayCurrentSite(activeTab?.url, currentOrigin);
    displayTopSites();

    populateSiteFilter();

    const filter = document.getElementById("site-filter");
    filter.value = "all";
    renderSelectedSite();
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

function displayCurrentSite(url, origin) {
    const container = document.getElementById("current-site");

    container.replaceChildren();

    if (!origin) {
        container.textContent =
            "Website information is unavailable for this tab.";
        return;
    }

    const heading = document.createElement("strong");
    heading.textContent = getHostname(origin);

    const siteDetections = allDetections.filter(
        detection => getOrigin(detection.url) === origin
    );

    const details = document.createElement("p");
    details.textContent = siteDetections.length
        ? `${siteDetections.length} recorded detections`
        : "No detections recorded for this site yet.";

    container.append(heading, details);
}

function displayTopSites() {
    const container = document.getElementById("top-sites");
    container.replaceChildren();

    const siteCounts = new Map();

    for (const detection of allDetections) {
        const origin = getOrigin(detection.url);

        if (!origin) continue;

        const existing = siteCounts.get(origin) || {
            count: 0,
            latest: 0
        };

        existing.count++;

        const timestamp = Date.parse(detection.timestamp);
        if (Number.isFinite(timestamp)) {
            existing.latest = Math.max(existing.latest, timestamp);
        }

        siteCounts.set(origin, existing);
    }

    const topSites = [...siteCounts.entries()]
        .sort((a, b) =>
            b[1].count - a[1].count ||
            b[1].latest - a[1].latest
        )
        .slice(0, 3);

    if (topSites.length === 0) {
        container.textContent = "No website activity recorded yet.";
        return;
    }

    for (const [origin, stats] of topSites) {
        const item = document.createElement("div");
        item.className = "detection";

        const name = document.createElement("strong");
        name.textContent = getHostname(origin);

        const count = document.createElement("p");
        count.textContent = `${stats.count} detections`;

        const viewButton = document.createElement("button");
        viewButton.textContent = "View details";
        viewButton.addEventListener("click", () => {
            const filter = document.getElementById("site-filter");
            filter.value = origin;
            renderSelectedSite();
        });

        item.append(name, count, viewButton);
        container.appendChild(item);
    }
}

function populateSiteFilter() {
    const filter = document.getElementById("site-filter");
    const previousValue = filter.value || "all";

    const origins = [
        ...new Set(
            allDetections
                .map(detection => getOrigin(detection.url))
                .filter(Boolean)
        )
    ].sort();

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
    const selectedOrigin =
        document.getElementById("site-filter").value;

    const filtered = selectedOrigin === "all"
        ? allDetections
        : allDetections.filter(
            detection => getOrigin(detection.url) === selectedOrigin
        );

    displaySummary(filtered);
    displayDetections(filtered);
}

function displaySummary(detections) {
    const summary = document.getElementById("summary");
    const counts = {};

    for (const detection of detections) {
        const category = detection.category || "Unknown";
        counts[category] = (counts[category] || 0) + 1;
    }

    if (detections.length === 0) {
        summary.textContent = "No detections recorded.";
        return;
    }

    summary.innerHTML = `
        <p>Total detections: <strong>${detections.length}</strong></p>
        <p>
            Canvas: ${counts.Canvas || 0}<br>
            WebGL: ${counts.WebGL || 0}<br>
            Audio: ${counts.Audio || 0}<br>
            Font: ${counts.Font || 0}<br>
            Navigator/Screen: ${counts["Navigator/Screen"] || 0}
        </p>
    `;
}

function displayDetections(detections) {
    const container = document.getElementById("detections");
    container.replaceChildren();

    if (detections.length === 0) {
        container.textContent = "No detections recorded.";
        return;
    }

    for (const detection of [...detections].reverse().slice(0, 20)) {
        const item = document.createElement("div");
        item.className = "detection";

        const category = document.createElement("strong");
        category.textContent = detection.category || "Unknown";

        const api = document.createElement("div");
        api.textContent = detection.api || "Unknown API";

        const url = document.createElement("small");
        url.textContent = detection.url || "Unknown URL";

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

loadDetections().catch(error => {
    console.error("ShadowShield: Failed to load detections.", error);
    document.getElementById("current-site").textContent =
        "Could not load website information.";
    document.getElementById("top-sites").textContent =
        "Could not load website activity.";
});
