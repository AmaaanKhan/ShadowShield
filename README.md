# ShadowShield

**A Browser Fingerprint Detection and Resistance Prototype**

ShadowShield is a browser extension prototype designed to detect selected browser fingerprinting activity, override selected JavaScript-visible browser properties, and present recorded detections through a popup dashboard.

The project explores how websites collect browser and device characteristics and how controlled profile normalization can change selected fingerprinting signals.

> **Project status:** Experimental prototype. ShadowShield does not prevent all fingerprinting techniques or guarantee anonymity.

## New here? Start with this

**What this is:** a Firefox extension that spots websites trying to fingerprint your browser and changes what they can see. If you know plain HTML, CSS and JavaScript, you already know almost everything you need.

**The only new idea:** instead of one giant `script.js`, the code is many small JS files that each do one job. A build tool glues them into one file for the browser. You edit the small files. Two new keywords: `export` means "let other files use this", and `import` means "bring in something from another file". It works like `<script src="...">`, except every file keeps its own variables, so two people can use the same name without clashing.

### Where do I work?

| I want to… | Work in | What it feels like |
|---|---|---|
| Change how the popup looks | `src/popup/` | Normal HTML, CSS and JS |
| Add or improve a protection | `src/inject/modules/` | One small JS file per protection |
| Change what gets spoofed | `src/shared/profiles.js` | A plain object of values |
| Block trackers (future) | `src/blocking/` | New folder, nothing else needs to change |

Pick **one** of these per change. They rarely touch the same files, so several people can work at once.

### Your everyday loop

1. Edit a file inside `src/`. **Never edit `dist/`.** It is generated and gets overwritten.
2. Run `npm run build`. Or run `npm run dev` and leave it running; it rebuilds every time you save.
3. In Firefox, open `about:debugging#/runtime/this-firefox`, find ShadowShield and click **Reload**.
4. Try it on the local test page (see Testing below) or on https://browserleaks.com/javascript.

First time only: `npm install`, then load `dist/manifest.json` as described under Installation.

### Files you can ignore

`dist/`, `node_modules/`, `.git/` and `package-lock.json` are created automatically. The dotfiles (`.github`, `.editorconfig`, `.prettierrc`, …), `eslint.config.mjs`, `scripts/` and `package.json` are settings that already work. `LICENSE`, `CHANGELOG.md` and `AGENTS.md` are reference.

### Your first 15 minutes

- **Interface person:** change a colour in `src/popup/popup.css`, rebuild, reload the extension, open the popup and see it.
- **Protection person:** copy `src/inject/modules/display.js` (the smallest module) to a new file, rename it, add one `import` and one line in `src/inject/modules/index.js`, rebuild and watch it appear in the popup. Don't commit this practice file.

### Adding a real feature

Copy an existing module and change it; they all share the same shape. Then follow [docs/ADDING_A_MODULE.md](docs/ADDING_A_MODULE.md). Before you start, read [CONTRIBUTING.md](CONTRIBUTING.md) and the page in [docs/modules/](docs/modules/) for the area you are touching.

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

Profile values are defined in `src/shared/profiles.js` (single source of truth). The popup reads from the same file, so what you see in the UI always matches what is actually spoofed.

### Timezone and Locale Normalization

The prototype normalizes selected JavaScript-visible timezone and locale outputs, including the reported timezone, UTC offset, and some date-formatting methods.

This implementation is incomplete. Other local date getters, browser internals, HTTP headers, and independent fingerprinting signals may still expose information about the actual environment.

### Popup Dashboard

The extension popup provides a view of recorded fingerprint activity, including the current website, frequently observed websites, category summaries, and recent detections. The data is stored as website names and counts only (never full page addresses), and a **Clear data** button wipes it.

### Local Fingerprint Test Page

A local test page is included for experimenting with browser-visible fingerprint properties during development.

## Repository Structure

    ShadowShield/
    ├── src/
    │   ├── manifest.json
    │   ├── background/
    │   │   ├── index.js          ← receives batches, writes storage
    │   │   └── event-store.js    ← pure aggregation logic (no browser APIs)
    │   ├── content/
    │   │   └── bridge.js
    │   ├── inject/
    │   │   ├── index.js          ← bootstrap
    │   │   ├── core/
    │   │   │   ├── hook.js
    │   │   │   ├── report.js
    │   │   │   └── debug.js
    │   │   └── modules/
    │   │       ├── index.js      ← ordered registry
    │   │       ├── canvas.js
    │   │       ├── webgl.js
    │   │       ├── fonts.js
    │   │       ├── navigator-screen.js
    │   │       ├── display.js
    │   │       ├── timezone.js
    │   │       ├── client-hints.js
    │   │       └── audio.js
    │   ├── popup/
    │   │   ├── popup.html
    │   │   ├── popup.css
    │   │   └── popup.js
    │   └── shared/
    │       ├── profiles.js       ← protection profile (single source of truth)
    │       └── detection-schema.js ← shape rules for detection events
    ├── scripts/
    │   └── build.mjs
    ├── tests/
    │   └── pages/
    │       └── fingerprint-test/
    │           ├── index.html
    │           └── test.js
    ├── docs/
    │   ├── ARCHITECTURE.md
    │   ├── COVERAGE.md
    │   ├── ADDING_A_MODULE.md
    │   ├── STATUS.md             ← current progress, decisions, next step
    │   ├── modules/              ← one plain-language page per module
    │   └── decisions/            ← short "why we chose this" notes
    ├── CHANGELOG.md
    └── CONTRIBUTING.md

## Requirements

- Mozilla Firefox for the primary development workflow
- Git
- Node.js ≥ 20 and npm

No backend server or database is required.

## Installation

### From source (development)

1. Clone the repository:

       git clone https://github.com/AmaaanKhan/ShadowShield.git
       cd ShadowShield

2. Install dependencies:

       npm install

3. Build the extension:

       npm run build

4. Open Firefox and navigate to:

       about:debugging#/runtime/this-firefox

5. Select **Load Temporary Add-on**.

6. Select the file:

       dist/manifest.json

7. Open a website and click the ShadowShield toolbar icon to inspect the popup.

Temporary add-ons generally need to be loaded again after Firefox restarts.

### Development mode (watch + auto-reload)

    npm run dev

This enables the debug console output and rebuilds on every file change.
Use `web-ext run` separately if you want automatic Firefox reload.

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

    npx http-server tests/pages/fingerprint-test -p 8000

Keep the terminal open and visit:

http://127.0.0.1:8000

### Lint and build

    npm run lint
    npm run build

## Contributing

| Read this | When |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Before your first change: the three lanes, the workflow, where things get written down |
| [docs/ADDING_A_MODULE.md](docs/ADDING_A_MODULE.md) | Adding a new protection |
| [docs/modules/](docs/modules/) | How an existing module works and what its limits are |
| [docs/decisions/](docs/decisions/) | Why something was built the way it was |
| [docs/STATUS.md](docs/STATUS.md) | Where the project stands and what is next |
| [AGENTS.md](AGENTS.md) | The rules every change must follow (also used by AI coding agents) |

When reporting an issue, include:

- Browser name and version
- Operating system
- Steps to reproduce
- Expected and observed behavior
- Relevant console errors

Avoid reporting a property as successfully spoofed until its behavior has been independently verified.

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

## License

See the [LICENSE](LICENSE) file for the project's license.
