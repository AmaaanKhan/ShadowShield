const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

async function loadDetections() {
    const result = await extensionAPI.storage.local.get({
        detections: []
    });

    const detections = result.detections;

    displaySummary(detections);
    displayDetections(detections);
}

function displaySummary(detections) {
    const summary = document.getElementById("summary");

    const counts = {};

    for (const detection of detections) {
        counts[detection.category] =
            (counts[detection.category] || 0) + 1;
    }

    if (detections.length === 0) {
        summary.textContent = "No fingerprinting activity detected.";
        return;
    }

    summary.innerHTML = `
        <p>Total detections: <strong>${detections.length}</strong></p>
        <p>
            Canvas: ${counts.Canvas || 0}<br>
            WebGL: ${counts.WebGL || 0}<br>
            Audio: ${counts.Audio || 0}
        </p>
    `;
}

function displayDetections(detections) {
    const container = document.getElementById("detections");

    if (detections.length === 0) {
        container.textContent = "No detections recorded.";
        return;
    }

    container.innerHTML = "";

    const recentDetections = [...detections]
        .reverse()
        .slice(0, 20);

    for (const detection of recentDetections) {
        const item = document.createElement("div");

        item.className = "detection";

        item.innerHTML = `
            <strong>${detection.category}</strong>
            <br>
            ${detection.api}
            <br>
            <small>${detection.url}</small>
            <br>
            <small>${new Date(detection.timestamp).toLocaleString()}</small>
        `;

        container.appendChild(item);
    }
}

loadDetections();