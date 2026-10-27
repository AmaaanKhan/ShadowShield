// Requests files from known trackers and from normal sites, then reports
// which requests the browser refused to send. A blocked request makes
// fetch() fail; the control sites tell us the network itself is working.

const TRACKERS = [
    "https://www.google-analytics.com/analytics.js",
    "https://static.hotjar.com/c/hotjar-1.js",
    "https://bat.bing.com/bat.js",
    "https://cdn.segment.com/analytics.js/v1/test/analytics.min.js",
    "https://api.mixpanel.com/track",
    "https://www.clarity.ms/tag/test",
    "https://connect.facebook.net/en_US/fbevents.js"
];

const CONTROLS = [
    "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js",
    "https://fonts.googleapis.com/css?family=Roboto"
];

async function wasBlocked(url) {
    try {
        await fetch(url, { mode: "no-cors", cache: "no-store" });
        return false;
    } catch (e) {
        return true;
    }
}

function addRow(url, kind, result, className) {
    const tr = document.createElement("tr");
    for (const text of [new URL(url).hostname, kind, result]) {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
    }
    tr.lastChild.className = className;
    document.querySelector("#results tbody").appendChild(tr);
}

async function run() {
    const controls = await Promise.all(CONTROLS.map(wasBlocked));
    const networkOk = controls.some((blocked) => !blocked);
    CONTROLS.forEach((url, i) =>
        addRow(url, "control", controls[i] ? "failed" : "loaded", controls[i] ? "unknown" : "loaded"));

    if (!networkOk) {
        document.getElementById("summary").textContent =
            "The control sites failed to load, so this test cannot tell blocked from offline. Check your connection.";
        return;
    }

    const results = await Promise.all(TRACKERS.map(wasBlocked));
    TRACKERS.forEach((url, i) =>
        addRow(url, "tracker", results[i] ? "blocked" : "loaded", results[i] ? "blocked" : "loaded"));

    const blocked = results.filter(Boolean).length;
    document.getElementById("summary").textContent =
        `${blocked} of ${TRACKERS.length} trackers blocked.`;
}

run();
