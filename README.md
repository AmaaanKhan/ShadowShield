# ShadowShield

**A Browser Fingerprint Detection and Resistance Prototype**

ShadowShield is a browser extension prototype designed to detect selected browser fingerprinting activity, override selected JavaScript-visible browser properties, and present recorded detections through a popup dashboard.

The project explores how websites collect browser and device characteristics and how controlled profile normalization can change selected fingerprinting signals.

> **Project status:** Experimental prototype. ShadowShield does not prevent all fingerprinting techniques or guarantee anonymity.

## Features

### Fingerprint Detection

The extension instruments selected browser APIs and reports observed access to:

- Canvas fingerprinting APIs
- WebGL context and parameter APIs
- Canvas text measurement
- Audio analyser creation
- Navigator and screen properties
- Timezone and locale APIs
- Supported User-Agent Client Hints requests

Detection means a monitored API was accessed. It does not necessarily indicate malicious activity.

### Configurable Protection Profile

The current demonstration profile configures these JavaScript-visible properties:

| Property | Configured value |
| --- | --- |
| Platform | Linux x86-64 |
| User agent | Firefox on Linux x86-64 |
| Reported logical CPU cores | 6 |
| Reported device memory | 8 GB |
| Preferred language | Russian (`ru-RU`) |
| Preferred languages | `ru-RU`, `ru`, `en-US`, `en` |
| Reported timezone | `Europe/Moscow` |

These values describe the configured profile, not a complete transformation of the underlying operating system or every browser signal.

### Timezone and Locale Normalization

The prototype normalizes selected JavaScript-visible timezone and locale outputs, including the reported timezone, UTC offset, and some date-formatting methods.

This implementation is incomplete. Other local date getters, browser internals, HTTP headers, and independent fingerprinting signals may still expose information about the actual environment.

### Popup Dashboard

The extension popup provides a view of recorded fingerprint activity, including the current website, frequently observed websites, category summaries, and recent detections.

### Local Fingerprint Test Page

A local test page is included for experimenting with browser-visible fingerprint properties during development.

## Repository Structure

    ShadowShield/
    ├── extension/
    │   ├── manifest.json
    │   ├── background.js
    │   ├── content.js
    │   ├── injection.js
    │   └── popup/
    │       ├── popup.html
    │       ├── popup.css
    │       └── popup.js
    └── tests/
        └── fingerprint-test/
            ├── index.html
            └── test.js

## Requirements

- Mozilla Firefox for the primary development workflow
- Git
- Node.js and npm for serving the local test page
- Internet access to test against BrowserLeaks

No backend server or database is required for the basic extension prototype.

## Installation in Firefox

1. Clone the repository:

       git clone https://github.com/AmaaanKhan/ShadowShield.git
       cd ShadowShield

2. Open Firefox and navigate to:

       about:debugging#/runtime/this-firefox

3. Select **Load Temporary Add-on**.

4. Select the file:

       extension/manifest.json

5. Open a website and click the ShadowShield toolbar icon to inspect the popup.

Temporary add-ons generally need to be loaded again after Firefox restarts.

## Testing

### Test the configured profile

With ShadowShield loaded, visit:

https://browserleaks.com/javascript

Inspect the reported platform, user agent, CPU count, device memory, language, timezone, and date/time information.

The current profile is intended to report Linux x86-64, six logical CPU cores, 8 GB of reported memory, Russian language preferences, and the Moscow timezone for the properties currently overridden by the extension.

### Compare with ShadowShield disabled

1. Record the fingerprint results with ShadowShield enabled.
2. Disable or unload the extension.
3. Reload the same test page.
4. Record the original results.
5. Compare which properties changed and which remained unchanged.

Use the same browser and test page for both runs. Results can vary with browser version, browser settings, and website behavior.

### Run the local test page

From the repository root, run:

    npx http-server tests/fingerprint-test -p 8000

Keep the terminal open and visit:

http://127.0.0.1:8000

The server is intended for local development and testing.

## Technical Notes and Limitations

- The extension uses page-context JavaScript hooks for selected APIs and a content script to forward detection events.
- Access to an instrumented API is recorded as an observation; it is not proof of tracking or malicious behavior.
- JavaScript property overrides do not change the physical device, installed operating system, browser binary, or all network-level information.
- User-Agent Client Hints and other browser-specific signals may remain inconsistent with the configured profile.
- Timezone normalization is partial. Local date getters and browser-internal behavior are not comprehensively virtualized.
- Some properties are non-configurable, unavailable, or implemented differently across browsers. The current implementation may not be able to override them.
- Firefox is the primary development target. Chromium compatibility has not been comprehensively verified.
- Recorded activity depends on which instrumented APIs websites access and which events the extension successfully receives.
- This project is an educational prototype, not a replacement for browser-native privacy protections.

## Development

Check the working tree:

    git status

Check changes for whitespace errors:

    git diff --check

Run the local fingerprint test page and verify the extension manually in Firefox before submitting changes.

## Contributing

When reporting an issue, include:

- Browser name and version
- Operating system
- Steps to reproduce
- Expected and observed behavior
- Relevant console errors

Avoid reporting a property as successfully spoofed until its behavior has been independently verified.

## License

See the [LICENSE](LICENSE) file for the project's license.
