import test from "node:test";
import assert from "node:assert/strict";

import {
    effectiveWebRTCProtection,
    webRTCStatusForControl
} from "../../src/shared/webrtc.js";

test("WebRTC protection defaults on for missing or corrupt settings", () => {
    assert.equal(effectiveWebRTCProtection(null), true);
    assert.equal(effectiveWebRTCProtection({}), true);
    assert.equal(effectiveWebRTCProtection({
        settings: { webrtcProtection: "yes" }
    }), true);
    assert.equal(effectiveWebRTCProtection({
        settings: { webrtcProtection: false }
    }), false);
});

test("WebRTC control status recognizes unavailable ownership", () => {
    assert.equal(
        webRTCStatusForControl("controlled_by_other_extensions"),
        "controlled-by-other"
    );
    assert.equal(
        webRTCStatusForControl("not_controllable"),
        "controlled-by-other"
    );
    assert.equal(webRTCStatusForControl("controllable_by_this_extension"), null);
});
