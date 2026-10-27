# Changelog

All notable changes, in plain words, newest first. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Add a line under **Unreleased**
in every pull request that changes what the extension does or how it is built.

## Unreleased

### Added
- Tracker and ad blocking: EasyPrivacy and EasyList turned into browser rules,
  with switches for trackers, ads and the current site in the popup, a blocked
  count, `npm run build:rules` and `npm run check-url`, test pages and unit tests
  (see `docs/modules/blocking.md`).
- "Clear data" button in the popup.
- Iframe coverage with embedded-source attribution, WebRTC protection settings,
  dependency-free unit tests, a test-page server and a verify script.
- Project docs: per-module pages (`docs/modules/`), decision notes
  (`docs/decisions/`), `STATUS.md`, `CONTRIBUTING.md`, pull request checklist.
- Build tooling (esbuild), linting, formatting rules and a CI workflow.

### Changed
- Source restructured into `src/` with one file per protection module and a
  shared core; behaviour of the protections is unchanged.
- The popup's "Protection Profile" now shows the values actually applied
  (it previously showed a different, hardcoded profile).
- Detections are batched and rate-limited before reaching storage.
- Storage now holds website names and counts only (see decision 0002).
- The popup was redesigned, including separate website/date text and clearer
  activity, settings and profile sections.

### Fixed
- Full page URLs were being saved; they are no longer stored, and the old saved
  list is deleted on first run.
- Storage grew without limit; it is now capped.
- A failed storage write could block all later writes.
- Debug messages no longer print in website consoles in release builds.

### Removed
- The old `extension/` and `tests/fingerprint-test/` folders (history is kept in git).
