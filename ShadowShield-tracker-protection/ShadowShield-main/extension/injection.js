(() => {
    console.log("ShadowShield injection layer active.");

    const reportDetection = (api, category) => {
        window.postMessage(
            {
                source: "ShadowShield",
                type: "fingerprint",
                api,
                category
            },
            "*"
        );
    };

    // Canvas fingerprinting
    const originalToDataURL =
        HTMLCanvasElement.prototype.toDataURL;

    HTMLCanvasElement.prototype.toDataURL = function (...args) {
        reportDetection("Canvas.toDataURL", "Canvas");

        return originalToDataURL.apply(this, args);
    };

    // WebGL fingerprinting
    const originalGetContext =
        HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (...args) {
        if (args[0] === "webgl" || args[0] === "webgl2") {
            reportDetection(
                `Canvas.getContext(${args[0]})`,
                "WebGL"
            );
        }

        return originalGetContext.apply(this, args);
    };

    // Audio fingerprinting
    const installAudioHook = () => {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass || !AudioContextClass.prototype) {
            return false;
        }

        const originalCreateAnalyser =
            AudioContextClass.prototype.createAnalyser;

        if (originalCreateAnalyser.__shadowShieldHooked) {
            return true;
        }

        const hookedCreateAnalyser = function (...args) {
            reportDetection(
                "AudioContext.createAnalyser",
                "Audio"
            );

            return originalCreateAnalyser.apply(this, args);
        };

        hookedCreateAnalyser.__shadowShieldHooked = true;

        Object.defineProperty(
            AudioContextClass.prototype,
            "createAnalyser",
            {
                value: hookedCreateAnalyser,
                configurable: true,
                writable: true
            }
        );

        console.log("ShadowShield Audio hook installed.");

        return true;
    };

    if (!installAudioHook()) {
        let attempts = 0;

        const audioHookInterval = setInterval(() => {
            attempts++;

            if (installAudioHook() || attempts >= 50) {
                clearInterval(audioHookInterval);

                if (attempts >= 50) {
                    console.warn(
                        "ShadowShield: AudioContext hook could not be installed."
                    );
                }
            }
        }, 100);
    }
})();