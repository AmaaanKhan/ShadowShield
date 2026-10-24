/**
 * Pure helpers for the WebRTC privacy setting.
 */

export function effectiveWebRTCProtection(raw) {
    return raw &&
        raw.settings &&
        typeof raw.settings.webrtcProtection === "boolean"
        ? raw.settings.webrtcProtection
        : true;
}

export function webRTCStatusForControl(levelOfControl) {
    return levelOfControl === "controlled_by_other_extensions" ||
        levelOfControl === "not_controllable"
        ? "controlled-by-other"
        : null;
}
