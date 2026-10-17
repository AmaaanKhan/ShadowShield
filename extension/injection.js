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
        const context = originalGetContext.apply(this, args);

        if (
            context &&
            (args[0] === "webgl" ||
                args[0] === "webgl2" ||
                args[0] === "experimental-webgl")
        ) {
            reportDetection(
                `Canvas.getContext(${args[0]})`,
                "WebGL"
            );

            installWebGLHooks(context);
        }

        return context;
    };

    const hookedWebGLContexts = new WeakSet();

    function installWebGLHooks(gl) {
        if (hookedWebGLContexts.has(gl)) {
            return;
        }

        hookedWebGLContexts.add(gl);

        // Detect requests for WebGL extensions
        const originalGetExtension = gl.getExtension;

        gl.getExtension = function (...args) {
            reportDetection(
                "WebGL.getExtension",
                "WebGL"
            );

            return originalGetExtension.apply(this, args);
        };

        // Detect requests for graphics parameters
        const originalGetParameter = gl.getParameter;

        gl.getParameter = function (...args) {
            reportDetection(
                "WebGL.getParameter",
                "WebGL"
            );

            return originalGetParameter.apply(this, args);
        };
    }
        // Font fingerprinting
    const installFontHook = () => {
        const canvasPrototype =
            window.CanvasRenderingContext2D &&
            window.CanvasRenderingContext2D.prototype;

        if (!canvasPrototype) {
            return false;
        }

        const originalMeasureText = canvasPrototype.measureText;

        if (originalMeasureText.__shadowShieldHooked) {
            return true;
        }

        const hookedMeasureText = function (...args) {
            console.log(
                "ShadowShield detected measureText:",
                args[0]
            );

            reportDetection("Canvas.measureText", "Font");

            return originalMeasureText.apply(this, args);
        };

        hookedMeasureText.__shadowShieldHooked = true;

        Object.defineProperty(canvasPrototype, "measureText", {
            value: hookedMeasureText,
            configurable: true,
            writable: true
        });

        console.log("ShadowShield font hook installed.");

        return true;
    };

    installFontHook();
        // Navigator and screen fingerprinting
    const monitoredProperties = [
        [Navigator.prototype, "userAgent", "Navigator.userAgent"],
        [Navigator.prototype, "language", "Navigator.language"],
        [Navigator.prototype, "languages", "Navigator.languages"],
        [Navigator.prototype, "platform", "Navigator.platform"],
        [Navigator.prototype, "hardwareConcurrency", "Navigator.hardwareConcurrency"],
        [Navigator.prototype, "deviceMemory", "Navigator.deviceMemory"],
        [Screen.prototype, "width", "Screen.width"],
        [Screen.prototype, "height", "Screen.height"],
        [Screen.prototype, "colorDepth", "Screen.colorDepth"],
        [Screen.prototype, "pixelDepth", "Screen.pixelDepth"]
    ];

    for (const [prototype, property, api] of monitoredProperties) {
        const descriptor =
            Object.getOwnPropertyDescriptor(prototype, property);

        if (!descriptor || !descriptor.get || !descriptor.configurable) {
            console.warn(`ShadowShield: Cannot monitor ${api}.`);
            continue;
        }

        const originalGetter = descriptor.get;

        Object.defineProperty(prototype, property, {
            ...descriptor,
            get: function () {
                reportDetection(api, "Navigator/Screen");
                return originalGetter.call(this);
            }
        });
    }
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