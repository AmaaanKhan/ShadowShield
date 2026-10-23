console.log("ShadowShield background service started.");

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;

let storageWriteQueue = Promise.resolve();

extensionAPI.runtime.onMessage.addListener((message) => {
    if (message.type !== "fingerprint-detection") {
        return;
    }

    const detection = message.detection;

    console.log(
        "ShadowShield background received:",
        detection
    );

    storageWriteQueue = storageWriteQueue.then(async () => {
        const result = await extensionAPI.storage.local.get({
            detections: []
        });

        result.detections.push(detection);

        await extensionAPI.storage.local.set({
            detections: result.detections
        });
    });
});