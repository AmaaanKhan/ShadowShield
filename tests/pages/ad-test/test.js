// Requests files from well-known ad networks and from normal sites, then
// reports which requests the browser refused to send. A blocked request makes
// fetch() fail; the control sites tell us the network itself is working.

const ADS = [
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
    "https://www.googletagservices.com/tag/js/gpt.js",
    "https://c.amazon-adsystem.com/aax2/apstag.js",
    "https://ads.pubmatic.com/AdServer/js/showad.js",
    "https://ad.doubleclick.net/ddm/trackimp/test"
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
    CONTROLS.forEach((url, i) =>
        addRow(url, "control", controls[i] ? "failed" : "loaded", controls[i] ? "unknown" : "loaded"));

    if (!controls.some((blocked) => !blocked)) {
        document.getElementById("summary").textContent =
            "The control sites failed to load, so this test cannot tell blocked from offline. Check your connection.";
        return;
    }

    const results = await Promise.all(ADS.map(wasBlocked));
    ADS.forEach((url, i) =>
        addRow(url, "ad network", results[i] ? "blocked" : "loaded", results[i] ? "blocked" : "loaded"));

    const blocked = results.filter(Boolean).length;
    document.getElementById("summary").textContent =
        `${blocked} of ${ADS.length} ad requests blocked.`;
}

run();
