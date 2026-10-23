/**
 * src/inject/modules/client-hints.js
 *
 * Hooks navigator.userAgentData.getHighEntropyValues to detect
 * User-Agent Client Hints requests (§8 of the original injection.js).
 *
 * Firefox does not expose userAgentData; the install() is a no-op there.
 */

/** @type {import("../index.js").Module} */
export const clientHints = {
    id: "client-hints",
    category: "Browser Identity",
    description: "Hooks navigator.userAgentData.getHighEntropyValues (Chromium only).",

    install(ctx) {
        if (
            !navigator.userAgentData ||
            typeof navigator.userAgentData.getHighEntropyValues !== "function"
        ) {
            return; // Firefox — silently skip.
        }

        const uaData = navigator.userAgentData;
        const originalGetHighEntropyValues = uaData.getHighEntropyValues;

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
                    ctx.report(`Browser identity hint: ${hint}`, "Browser Identity");
                }
            }

            return originalGetHighEntropyValues.apply(this, args);
        };
    }
};
