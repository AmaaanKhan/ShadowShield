/**
 * src/inject/modules/navigator-screen.js
 *
 * Hooks all Navigator and Screen properties in the monitoredProperties
 * list and installs the deviceMemory fallback for Firefox (§§4–5 of the
 * original injection.js).
 *
 * Spoof values come from ctx.profile — no local constants here.
 */

import { hookGetter } from "../core/hook.js";

/** @type {import("../index.js").Module} */
export const navigatorScreen = {
    id: "navigator-screen",
    category: "Device Information",
    description: "Hooks Navigator and Screen property getters; spoofs profile values.",

    install(ctx) {
        const profile = ctx.profile;

        const monitoredProperties = [
            [Navigator.prototype, "userAgent",            "Browser user-agent"],
            [Navigator.prototype, "appVersion",           "Browser app version"],
            [Navigator.prototype, "platform",             "Operating system/platform"],
            [Navigator.prototype, "vendor",               "Browser vendor"],
            [Navigator.prototype, "language",             "Preferred language"],
            [Navigator.prototype, "languages",            "Preferred languages"],
            [Navigator.prototype, "hardwareConcurrency",  "Logical CPU cores"],
            [Navigator.prototype, "deviceMemory",         "Reported device memory"],
            [Navigator.prototype, "maxTouchPoints",       "Touchscreen capability"],
            [Navigator.prototype, "cookieEnabled",        "Cookie support"],
            [Navigator.prototype, "webdriver",            "Automation status"],
            [Navigator.prototype, "oscpu",                "Operating system and architecture"],
            [Screen.prototype,    "width",                "Screen width"],
            [Screen.prototype,    "height",               "Screen height"],
            [Screen.prototype,    "availWidth",           "Available screen width"],
            [Screen.prototype,    "availHeight",          "Available screen height"],
            [Screen.prototype,    "colorDepth",           "Screen color depth"],
            [Screen.prototype,    "pixelDepth",           "Screen pixel depth"]
        ];

        for (const [prototype, property, label] of monitoredProperties) {
            // Skip deviceMemory if it's not natively present (handled below).
            if (
                property === "deviceMemory" &&
                !("deviceMemory" in Navigator.prototype)
            ) {
                continue;
            }

            const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

            if (!descriptor || !descriptor.get || !descriptor.configurable) {
                ctx.debug.warn(`navigator-screen: Cannot override ${label}.`);
                continue;
            }

            const originalGetter = descriptor.get;

            hookGetter(prototype, property, () => function () {
                ctx.report(label, "Device Information");

                const originalValue = originalGetter.call(this);

                if (
                    profile.enabled &&
                    Object.prototype.hasOwnProperty.call(profile.values, property)
                ) {
                    return profile.values[property];
                }

                return originalValue;
            });
        }

        // Firefox may not provide navigator.deviceMemory natively — define it.
        if (!("deviceMemory" in Navigator.prototype)) {
            hookGetter(Navigator.prototype, "deviceMemory", () => function () {
                ctx.report("Reported device memory", "Device Information");
                return profile.enabled ? profile.values.deviceMemory : undefined;
            });
        }
    }
};
