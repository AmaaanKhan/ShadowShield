/**
 * src/shared/detection-schema.js
 *
 * Shape rules for detection events. Used by BOTH the content bridge and the
 * background event store, so a malformed or oversized event is rejected on
 * both sides of the message channel (defence in depth).
 *
 * Pure constants and functions - no DOM, no browser APIs.
 */

export const MAX_API_LENGTH = 100;
export const MAX_CATEGORY_LENGTH = 50;

/** Names that would break plain-object storage. */
const RESERVED_NAMES = new Set(["__proto__"]);

function isValidName(value, maxLength) {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= maxLength &&
        !RESERVED_NAMES.has(value)
    );
}

/**
 * @param {unknown} api       e.g. "Canvas.toDataURL"
 * @param {unknown} category  e.g. "Canvas"
 * @returns {boolean}
 */
export function isValidDetection(api, category) {
    return (
        isValidName(api, MAX_API_LENGTH) &&
        isValidName(category, MAX_CATEGORY_LENGTH)
    );
}
