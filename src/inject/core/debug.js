/**
 * src/inject/core/debug.js
 *
 * Lightweight debug helpers for the page-world inject bundle.
 *
 * __SHADOWSHIELD_DEBUG__ is replaced at build time by esbuild `define`:
 *   - `npm run build` → false  (calls compile away to dead code)
 *   - `npm run dev`   → true   (calls survive and print)
 *
 * Usage:
 *   import { log, warn } from "./core/debug.js";
 *   log("hook installed", navigator.userAgent);
 *   warn("Cannot override", propertyName);
 *
 * AGENTS.md rule 3: no console.* in the page world unless behind this flag.
 */

/* global __SHADOWSHIELD_DEBUG__ */

export function log(...args) {
    if (typeof __SHADOWSHIELD_DEBUG__ !== "undefined" && __SHADOWSHIELD_DEBUG__) {
        // eslint-disable-next-line no-console
        console.log("[ShadowShield]", ...args);
    }
}

export function warn(...args) {
    if (typeof __SHADOWSHIELD_DEBUG__ !== "undefined" && __SHADOWSHIELD_DEBUG__) {
        // eslint-disable-next-line no-console
        console.warn("[ShadowShield]", ...args);
    }
}
