console.log("ShadowShield content script loaded.");

window.addEventListener("message", (event) => {
    if (event.source !== window) {
        return;
    }

    if (!event.data || event.data.source !== "ShadowShield") {
        return;
    }

    if (event.data.type === "fingerprint") {
        const detection = {
            api: event.data.api,
            category: event.data.category || "Unknown",
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        console.log("ShadowShield detection:", detection);
    }
});

const fingerprintSignals = {
    screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
    },

    navigator: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory
    },

    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

console.log(
    "ShadowShield fingerprint signals:",
    fingerprintSignals
);