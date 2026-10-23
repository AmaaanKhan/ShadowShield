/**
 * src/inject/core/report.js
 *
 * Sends a fingerprint-detection event from the page world to the
 * isolated content-script bridge via window.postMessage.
 *
 * The channel string "ShadowShield" is the same value as today —
 * changing it would break the content bridge without a coordinated update.
 *
 * Known issue (planned Phase 1 fix): the postMessage channel is
 * forgeable by the page; move to a structured-clone event with an
 * origin check on the receiving end.
 */

/**
 * Report that a monitored API was accessed.
 *
 * @param {string} api      - The raw API identifier string (e.g. "Canvas.toDataURL")
 * @param {string} category - Category label (e.g. "Canvas", "WebGL", "Device Information")
 */
export function reportDetection(api, category) {
    window.postMessage(
        {
            source: "ShadowShield",
            type: "fingerprint",
            api,
            category
        },
        "*"
    );
}
