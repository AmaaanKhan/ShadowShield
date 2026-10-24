# WebRTC protection

> File: `src/background/index.js`
> Category shown in the popup: Settings
> Mode: background browser setting

## What it does
Uses Firefox's privacy API to set WebRTC IP handling to
`default_public_interface_only` when the popup setting is enabled. This asks
Firefox to expose only the default public interface instead of local network
interfaces.

This is most useful when using a VPN. Firefox already hides local addresses in
many configurations, so the practical difference may be small.

The feature adds an install-time permission for reading and modifying privacy
settings. It does not hook `RTCPeerConnection` or alter page JavaScript.

## What it does NOT do
It does not guarantee anonymity, hide the public VPN address, or control
WebRTC behavior in every browser. Some video-call or peer-to-peer setups may
behave differently when the setting is enabled. Another extension or browser
policy may control the setting instead.

The setting is managed by the extension while it is installed and reverts when
the extension is removed.

## How to test it
1. Build and load the extension in Firefox.
2. Open the popup and enable or disable **Hide my real IP from WebRTC**.
3. Confirm the status line changes to Active or Off.
4. Compare `browserleaks.com/webrtc` with the setting enabled and disabled.

## Design notes
This is a background privacy setting rather than an inject module. The default
is enabled when no valid stored setting exists. The background re-reads the
browser setting after changing it and records a status of Active, Off,
Unavailable, Controlled by another extension, or Error.

## Known issues
- Firefox may already provide similar protection by default.
- The actual result depends on VPN, browser policy, and peer-connection setup.
