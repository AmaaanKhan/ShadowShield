# 0008 — One manifest for Firefox and Chromium

- Status: Accepted (refines [0004](0004-firefox-first.md); Firefox stays the primary target)
- Date: 2026-10

## Context
Decision 0004 expected a Chromium port to need its own manifest. In practice
Chromium only differs in how it starts the background code: Firefox runs the
files listed in `background.scripts`, Chromium needs one `background.service_worker`
file. Manifest V3 lets a manifest list both (this is the pattern in Mozilla's
documentation), and each browser uses the key it understands and ignores the other.

## Decision
`src/manifest.json` lists both. The build writes a two-line
`dist/service-worker.js` that loads the same two bundles (`blocking.js` and
`background.js`). Loading `dist/` in Chrome (`chrome://extensions` > Load unpacked)
now works with no manual edits.

## Why
- Everyone can try the extension in either browser from the same `dist/`.
- No second manifest to keep in sync, and no copy of the background code.
- Rejected: a separate Chrome build script and manifest. More to maintain for a
  difference of one key.

## Consequences
- Chrome 121 or newer is needed (older Chrome refuses a manifest that lists `scripts`).
- Chrome runs the background as a service worker that can stop when idle, so
  background code must not rely on state kept in memory for long. Today
  `src/background/index.js` holds detection batches in memory for 500 ms, which is
  fine. Anything longer should use `storage.local`.
- Firefox-only pieces still do nothing in Chrome and vice versa (for example
  `client-hints` is for Chromium). Chromium behaviour of the page protections is not
  verified; see `docs/COVERAGE.md`.
- `scripts/build.mjs` must keep writing `dist/service-worker.js`; a unit test checks
  that the manifest lists both keys.
