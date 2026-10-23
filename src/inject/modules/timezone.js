/**
 * src/inject/modules/timezone.js
 *
 * Hooks Intl.DateTimeFormat, Date.prototype.getTimezoneOffset,
 * Date.prototype.toString, and the three toLocale* methods to normalize
 * timezone and locale output (§7 of the original injection.js).
 *
 * All quirks are preserved exactly as they were. Known issues
 * (planned Phase 1 fixes):
 *   - Date.prototype.toDateString / toTimeString / toUTCString are not
 *     intercepted, leaving inconsistent Date stringification paths.
 *   - The ShadowDateTimeFormat constructor lacks Symbol.toStringTag,
 *     instance-check parity, and correct handling of the `new.target`
 *     path for subclassing.
 */

import { hookMethod } from "../core/hook.js";

/** @type {import("../index.js").Module} */
export const timezone = {
    id: "timezone",
    category: "System Settings",
    description: "Normalizes Intl.DateTimeFormat, Date timezone/locale methods to the profile timezone.",

    install(ctx) {
        const profile = ctx.profile;
        const shadowTimezone = profile.values.timeZone;
        const shadowLocale  = profile.values.language;

        // ------------------------------------------------------------------
        // 1. Replace Intl.DateTimeFormat with a wrapper that injects the
        //    shadow timezone when none is explicitly provided.
        // ------------------------------------------------------------------
        const OriginalDateTimeFormat = Intl.DateTimeFormat;

        function ShadowDateTimeFormat(locales, options) {
            const adjustedOptions = { ...(options || {}) };

            if (!Object.prototype.hasOwnProperty.call(adjustedOptions, "timeZone")) {
                adjustedOptions.timeZone = shadowTimezone;
            }

            return new OriginalDateTimeFormat(
                locales || shadowLocale,
                adjustedOptions
            );
        }

        ShadowDateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
        Object.setPrototypeOf(ShadowDateTimeFormat, OriginalDateTimeFormat);

        Intl.DateTimeFormat = ShadowDateTimeFormat;

        // ------------------------------------------------------------------
        // 2. Hook resolvedOptions() to return the shadow timezone/locale.
        // ------------------------------------------------------------------
        const originalResolvedOptions =
            OriginalDateTimeFormat.prototype.resolvedOptions;

        OriginalDateTimeFormat.prototype.resolvedOptions = function (...args) {
            const result = originalResolvedOptions.apply(this, args);

            ctx.report("Timezone and locale settings", "System Settings");

            if (!profile.enabled) {
                return result;
            }

            return {
                ...result,
                locale:   shadowLocale,
                timeZone: shadowTimezone
            };
        };

        // ------------------------------------------------------------------
        // 3. getTimezoneOffset — Moscow UTC+3 → returns -180.
        // ------------------------------------------------------------------
        hookMethod(
            Date.prototype,
            "getTimezoneOffset",
            (original) => function (...args) {
                ctx.report("Timezone UTC offset", "System Settings");
                if (profile.enabled) return -180;
                return original.apply(this, args);
            }
        );

        // ------------------------------------------------------------------
        // 4. Date.prototype.toString — format as Moscow time string.
        // ------------------------------------------------------------------
        const shadowDateFormatter = new OriginalDateTimeFormat("en-US", {
            timeZone:     shadowTimezone,
            weekday:      "short",
            month:        "short",
            day:          "2-digit",
            year:         "numeric",
            hour:         "2-digit",
            minute:       "2-digit",
            second:       "2-digit",
            hourCycle:    "h23",
            timeZoneName: "long"
        });

        const originalDateToString = Date.prototype.toString;

        Date.prototype.toString = function () {
            if (!profile.enabled) {
                return originalDateToString.call(this);
            }

            if (Number.isNaN(this.getTime())) {
                return "Invalid Date";
            }

            const parts = Object.fromEntries(
                shadowDateFormatter.formatToParts(this).map(
                    (part) => [part.type, part.value]
                )
            );

            return (
                `${parts.weekday} ${parts.month} ${parts.day} ` +
                `${parts.year} ${parts.hour}:${parts.minute}:${parts.second} ` +
                "GMT+0300 (Moscow Standard Time)"
            );
        };

        // ------------------------------------------------------------------
        // 5. toLocaleString / toLocaleDateString / toLocaleTimeString.
        // ------------------------------------------------------------------
        for (const methodName of [
            "toLocaleString",
            "toLocaleDateString",
            "toLocaleTimeString"
        ]) {
            const originalMethod = Date.prototype[methodName];

            Date.prototype[methodName] = function (locales, options) {
                if (!profile.enabled) {
                    return originalMethod.call(this, locales, options);
                }

                const adjustedOptions = { ...(options || {}) };

                if (!Object.prototype.hasOwnProperty.call(adjustedOptions, "timeZone")) {
                    adjustedOptions.timeZone = shadowTimezone;
                }

                return originalMethod.call(
                    this,
                    locales || shadowLocale,
                    adjustedOptions
                );
            };
        }
    }
};
