# ShadowShield — Status

_Last updated: Tracker and ad blocking added._

## Completed
- **0.1** Tooling: esbuild build, ESLint, Prettier, CI, `AGENTS.md`, docs skeleton.
- **0.2** Restructure: `src/inject` split into `core/` + `modules/` with an ordered
  registry; single profile in `src/shared/profiles.js` (popup reads it); debug
  logging compiled out of release builds.
- **0.3-lite** Safe pipeline: bridge validates, rate-limits and batches; background
  stores aggregated, origin-only data with caps; popup shows the new data and has
  "Clear data"; legacy `detections` (full URLs) removed on startup.

- **Docs system** Per-module pages (`docs/modules/`), decision notes
  (`docs/decisions/`), `CHANGELOG.md`, `CONTRIBUTING.md` and a pull request
  checklist, so collaborators know where to work and what to write down.
- **Quick-wins batch 1** Dependency-free tests, iframe attribution, WebRTC
  protection, redesigned popup, test-page server, verification script and docs.

- **Tracker and ad blocking** (Network lane) `src/blocking/`: EasyPrivacy and
  EasyList converted to browser rules, switches in the popup, test pages, unit
  tests, docs and decision 0007. Checked in Chromium; **still needs a manual check
  in Firefox** (load `dist/manifest.json`, open `tests/pages/tracker-test/` and
  `ad-test/`, try the switches).

## Key decisions
- Firefox is the primary target; Chromium compatibility only where cheap.
- Hooks must go through `core/hook.js`; modules never import each other.
- Origin comes from `sender.url` in the background, never from page data.
- Deferred on purpose: MessageChannel handshake, unit-test framework, forgery test page.

## Open issues
See "Known Issues" in `docs/ARCHITECTURE.md` (stealth hooks, WebGL prototype
patching, workers, Date/locale coherence, `deviceMemory` on Firefox, and
same-origin about:blank coherence).

## Open issues: blocking
- Firefox only shows the blocked count when `extensions.dnr.feedback` is `true`.
- No cosmetic filtering (hiding empty ad space) and no YouTube ad blocking; see
  `docs/modules/blocking.md`.
- The lists go stale; rerun `npm run build:rules` now and then.

## Next step
Quick-wins batch 1 is complete. The next recommended work is **Phase 1 stealth
hooks** in `core/hook.js`, because every later spoof depends on hooks not being
detectable. Workers, complete timezone coherence, and authenticated
page-to-bridge reporting remain open.

## Quick-wins batch 1 progress
- [x] Stage 1 — dependency-free unit tests and CI test step
- [x] Stage 2 — iframe coverage and top-site attribution
- [x] Stage 3 — WebRTC IP protection setting
- [x] Stage 4 — popup redesign
- [x] Stage 5 — verify script and documentation
