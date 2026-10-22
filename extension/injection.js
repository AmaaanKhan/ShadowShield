(() => {
    "use strict";

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

    // ==========================================
    // 1. Canvas fingerprint detection
    // ==========================================

    const originalToDataURL =
        HTMLCanvasElement.prototype.toDataURL;

    HTMLCanvasElement.prototype.toDataURL = function (...args) {
        reportDetection("Canvas.toDataURL", "Canvas");
        return originalToDataURL.apply(this, args);
    };

    // ==========================================
    // 2. WebGL fingerprint detection
    // ==========================================

    const originalGetContext =
        HTMLCanvasElement.prototype.getContext;

    const hookedWebGLContexts = new WeakSet();

    function installWebGLHooks(gl) {
        if (hookedWebGLContexts.has(gl)) return;

        hookedWebGLContexts.add(gl);

        const originalGetExtension = gl.getExtension;

        gl.getExtension = function (...args) {
            reportDetection("WebGL.getExtension", "WebGL");
            return originalGetExtension.apply(this, args);
        };

        const originalGetParameter = gl.getParameter;

        gl.getParameter = function (...args) {
            reportDetection("WebGL.getParameter", "WebGL");
            return originalGetParameter.apply(this, args);
        };
    }

    HTMLCanvasElement.prototype.getContext = function (...args) {
        const context = originalGetContext.apply(this, args);

        if (
            context &&
            (
                args[0] === "webgl" ||
                args[0] === "webgl2" ||
                args[0] === "experimental-webgl"
            )
        ) {
            reportDetection(
                `Canvas.getContext(${args[0]})`,
                "WebGL"
            );

            installWebGLHooks(context);
        }

        return context;
    };

    // ==========================================
    // 3. Font fingerprint detection
    // ==========================================

    const installFontHook = () => {
        const canvasPrototype =
            window.CanvasRenderingContext2D &&
            window.CanvasRenderingContext2D.prototype;

        if (!canvasPrototype) return false;

        const originalMeasureText = canvasPrototype.measureText;

        if (originalMeasureText.__shadowShieldHooked) {
            return true;
        }

        const hookedMeasureText = function (...args) {
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

    // ==========================================
    // 4. ShadowShield protection profile
    // ==========================================

    const shadowShieldProfile = {
        enabled: true,

        values: {
            hardwareConcurrency: 6,
            deviceMemory: 8,

            language: "ru-RU",
            languages: ["ru-RU", "ru", "en-US", "en"],

            platform: "Linux x86_64",

            userAgent:
                "Mozilla/5.0 (X11; Linux x86_64; rv:158.0) Gecko/20100101 Firefox/158.0",

            appVersion: "5.0 (X11)",
            oscpu: "Linux x86_64",

            timeZone: "Europe/Moscow"
        }
    };

    const shadowTimezone =
        shadowShieldProfile.values.timeZone;

    const shadowLocale =
        shadowShieldProfile.values.language;

    // ==========================================
    // 5. Navigator and screen fingerprinting
    // ==========================================

    const monitoredProperties = [
        [Navigator.prototype, "userAgent", "Browser user-agent"],
        [Navigator.prototype, "appVersion", "Browser app version"],
        [Navigator.prototype, "platform", "Operating system/platform"],
        [Navigator.prototype, "vendor", "Browser vendor"],
        [Navigator.prototype, "language", "Preferred language"],
        [Navigator.prototype, "languages", "Preferred languages"],
        [Navigator.prototype, "hardwareConcurrency", "Logical CPU cores"],
        [Navigator.prototype, "deviceMemory", "Reported device memory"],
        [Navigator.prototype, "maxTouchPoints", "Touchscreen capability"],
        [Navigator.prototype, "cookieEnabled", "Cookie support"],
        [Navigator.prototype, "webdriver", "Automation status"],
        [Navigator.prototype, "oscpu", "Operating system and architecture"],
        [Screen.prototype, "width", "Screen width"],
        [Screen.prototype, "height", "Screen height"],
        [Screen.prototype, "availWidth", "Available screen width"],
        [Screen.prototype, "availHeight", "Available screen height"],
        [Screen.prototype, "colorDepth", "Screen color depth"],
        [Screen.prototype, "pixelDepth", "Screen pixel depth"]
    ];

    for (const [prototype, property, label] of monitoredProperties) {
        if (
            property === "deviceMemory" &&
            !("deviceMemory" in Navigator.prototype)
        ) {
            continue;
        }

        const descriptor =
            Object.getOwnPropertyDescriptor(prototype, property);

        if (
            !descriptor ||
            !descriptor.get ||
            !descriptor.configurable
        ) {
            console.warn(
                `ShadowShield: Cannot override ${label}.`
            );
            continue;
        }

        const originalGetter = descriptor.get;

        Object.defineProperty(prototype, property, {
            ...descriptor,

            get: function () {
                reportDetection(label, "Device Information");

                const originalValue =
                    originalGetter.call(this);

                if (
                    shadowShieldProfile.enabled &&
                    Object.prototype.hasOwnProperty.call(
                        shadowShieldProfile.values,
                        property
                    )
                ) {
                    return shadowShieldProfile.values[property];
                }

                return originalValue;
            }
        });
    }

    // Firefox may not provide navigator.deviceMemory natively.
    if (!("deviceMemory" in Navigator.prototype)) {
        Object.defineProperty(Navigator.prototype, "deviceMemory", {
            configurable: true,
            enumerable: true,

            get() {
                reportDetection(
                    "Reported device memory",
                    "Device Information"
                );

                return shadowShieldProfile.enabled
                    ? shadowShieldProfile.values.deviceMemory
                    : undefined;
            }
        });
    }

    // ==========================================
    // 6. Device pixel ratio detection
    // ==========================================

    const pixelRatioDescriptor =
        Object.getOwnPropertyDescriptor(
            Window.prototype,
            "devicePixelRatio"
        );

    if (
        pixelRatioDescriptor &&
        pixelRatioDescriptor.get &&
        pixelRatioDescriptor.configurable
    ) {
        const originalPixelRatioGetter =
            pixelRatioDescriptor.get;

        Object.defineProperty(Window.prototype, "devicePixelRatio", {
            ...pixelRatioDescriptor,

            get: function () {
                reportDetection("Display pixel ratio", "Display");

                return originalPixelRatioGetter.call(this);
            }
        });
    }

    // ==========================================
    // 7. Timezone and locale normalization
    // ==========================================

    const OriginalDateTimeFormat = Intl.DateTimeFormat;

    function ShadowDateTimeFormat(locales, options) {
        const adjustedOptions = { ...(options || {}) };

        if (!Object.prototype.hasOwnProperty.call(
            adjustedOptions,
            "timeZone"
        )) {
            adjustedOptions.timeZone = shadowTimezone;
        }

        return new OriginalDateTimeFormat(
            locales || shadowLocale,
            adjustedOptions
        );
    }

    ShadowDateTimeFormat.prototype =
        OriginalDateTimeFormat.prototype;

    Object.setPrototypeOf(
        ShadowDateTimeFormat,
        OriginalDateTimeFormat
    );

    Intl.DateTimeFormat = ShadowDateTimeFormat;

    // Report the configured locale and timezone.
    const originalResolvedOptions =
        OriginalDateTimeFormat.prototype.resolvedOptions;

    OriginalDateTimeFormat.prototype.resolvedOptions =
        function (...args) {
            const result =
                originalResolvedOptions.apply(this, args);

            reportDetection(
                "Timezone and locale settings",
                "System Settings"
            );

            if (!shadowShieldProfile.enabled) {
                return result;
            }

            return {
                ...result,
                locale: shadowLocale,
                timeZone: shadowTimezone
            };
        };

    // Moscow uses UTC+3; getTimezoneOffset returns the opposite sign.
    const originalGetTimezoneOffset =
        Date.prototype.getTimezoneOffset;

    Date.prototype.getTimezoneOffset = function (...args) {
        reportDetection(
            "Timezone UTC offset",
            "System Settings"
        );

        if (shadowShieldProfile.enabled) {
            return -180;
        }

        return originalGetTimezoneOffset.apply(this, args);
    };

    // Formatter used to produce a Moscow-time Date.toString() result.
    const shadowDateFormatter = new OriginalDateTimeFormat(
        "en-US",
        {
            timeZone: shadowTimezone,
            weekday: "short",
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
            timeZoneName: "long"
        }
    );

    const originalDateToString = Date.prototype.toString;

    Date.prototype.toString = function () {
        if (!shadowShieldProfile.enabled) {
            return originalDateToString.call(this);
        }

        if (Number.isNaN(this.getTime())) {
            return "Invalid Date";
        }

        const parts = Object.fromEntries(
            shadowDateFormatter.formatToParts(this).map(
                part => [part.type, part.value]
            )
        );

        return (
            `${parts.weekday} ${parts.month} ${parts.day} ` +
            `${parts.year} ${parts.hour}:${parts.minute}:${parts.second} ` +
            "GMT+0300 (Moscow Standard Time)"
        );
    };

    // Apply Moscow timezone to default Date locale-formatting calls.
    for (const methodName of [
        "toLocaleString",
        "toLocaleDateString",
        "toLocaleTimeString"
    ]) {
        const originalMethod = Date.prototype[methodName];

        Date.prototype[methodName] = function (locales, options) {
            if (!shadowShieldProfile.enabled) {
                return originalMethod.call(this, locales, options);
            }

            const adjustedOptions = { ...(options || {}) };

            if (!Object.prototype.hasOwnProperty.call(
                adjustedOptions,
                "timeZone"
            )) {
                adjustedOptions.timeZone = shadowTimezone;
            }

            return originalMethod.call(
                this,
                locales || shadowLocale,
                adjustedOptions
            );
        };
    }

    // ==========================================
    // 8. User-Agent Client Hints detection
    // ==========================================

    if (
        navigator.userAgentData &&
        typeof navigator.userAgentData.getHighEntropyValues === "function"
    ) {
        const uaData = navigator.userAgentData;

        const originalGetHighEntropyValues =
            uaData.getHighEntropyValues;

        uaData.getHighEntropyValues = function (...args) {
            const requestedHints = args[0] || [];

            for (const hint of requestedHints) {
                if (
                    [
                        "architecture",
                        "bitness",
                        "platformVersion",
                        "model",
                        "fullVersionList"
                    ].includes(hint)
                ) {
                    reportDetection(
                        `Browser identity hint: ${hint}`,
                        "Browser Identity"
                    );
                }
            }

            return originalGetHighEntropyValues.apply(this, args);
        };
    }

    // ==========================================
    // 9. Audio fingerprint detection
    // ==========================================

    const installAudioHook = () => {
        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (
            !AudioContextClass ||
            !AudioContextClass.prototype
        ) {
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

        console.log("ShadowShield audio hook installed.");
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