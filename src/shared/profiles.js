/**
 * src/shared/profiles.js
 *
 * Single source of truth for the active ShadowShield protection profile.
 * Pure constants — no side effects, no DOM, no browser APIs.
 *
 * Both the inject layer (page world) and the popup import from here so
 * the displayed values always match what is actually spoofed.
 */

/**
 * The active profile object consumed by the inject layer.
 *
 * @type {{
 *   enabled: boolean,
 *   values: {
 *     hardwareConcurrency: number,
 *     deviceMemory: number,
 *     language: string,
 *     languages: string[],
 *     platform: string,
 *     userAgent: string,
 *     appVersion: string,
 *     oscpu: string,
 *     timeZone: string,
 *   }
 * }}
 */
export const shadowShieldProfile = {
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

/**
 * Human-readable display rows derived from the profile.
 * Each entry: { label: string, value: string }
 *
 * Used by the popup "Protection Profile" section so it always reflects
 * the actual configured values rather than a hardcoded list.
 */
export function getProfileDisplayRows() {
    const v = shadowShieldProfile.values;
    return [
        { label: "Enabled",               value: shadowShieldProfile.enabled ? "Yes" : "No" },
        { label: "Platform",              value: v.platform },
        { label: "User agent",            value: v.userAgent },
        { label: "App version",           value: v.appVersion },
        { label: "OS/CPU",                value: v.oscpu },
        { label: "CPU core count",        value: String(v.hardwareConcurrency) },
        { label: "Reported device memory",value: `${v.deviceMemory} GB` },
        { label: "Preferred language",    value: v.language },
        { label: "Preferred languages",   value: v.languages.join(", ") },
        { label: "Timezone",              value: v.timeZone }
    ];
}
