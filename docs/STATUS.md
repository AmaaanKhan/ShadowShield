# ShadowShield — Status

_Last updated: Phase 0.3-lite._

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

## Key decisions
- Firefox is the primary target; Chromium compatibility only where cheap.
- Hooks must go through `core/hook.js`; modules never import each other.
- Origin comes from `sender.url` in the background, never from page data.
- Deferred on purpose: MessageChannel handshake, unit-test framework, forgery test page.

## Open issues
See "Known Issues" in `docs/ARCHITECTURE.md` (stealth hooks, WebGL prototype
patching, iframes/workers, Date/locale coherence, `deviceMemory` on Firefox).

## Next step
Stop restructuring. The base is complete: commit it, then pick the first feature by demo value and build it as a module
(see `docs/ADDING_A_MODULE.md`). Likely first: **Phase 1 stealth hooks** in
`core/hook.js`, because every later spoof depends on hooks not being detectable.

## Quick-wins batch 1 progress
- [x] Stage 1 — dependency-free unit tests and CI test step
- [x] Stage 2 — iframe coverage and top-site attribution
- [x] Stage 3 — WebRTC IP protection setting
- [ ] Stage 4 — popup redesign
- [ ] Stage 5 — verify script and documentation
