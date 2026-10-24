# Module pages

One page per feature module, named after its file in `src/inject/modules/`
(`canvas.js` -> `canvas.md`). A page explains the module in plain words: what
it does, what it does NOT do, and how to check it.

These pages are the "why and how" companion to the code. The full per-API
status table stays in [`../COVERAGE.md`](../COVERAGE.md); the history of
changes lives in git (`git log src/inject/modules/<name>.js`) and in
[`../../CHANGELOG.md`](../../CHANGELOG.md).

Start a new page by copying [`_TEMPLATE.md`](_TEMPLATE.md).

| Module | Page | Spoofs? |
|---|---|---|
| canvas | [canvas.md](canvas.md) | No (detect only) |
| webgl | [webgl.md](webgl.md) | No (detect only) |
| fonts | [fonts.md](fonts.md) | No (detect only) |
| navigator-screen | [navigator-screen.md](navigator-screen.md) | Partly |
| display | [display.md](display.md) | No (detect only) |
| timezone | [timezone.md](timezone.md) | Yes (partial) |
| client-hints | [client-hints.md](client-hints.md) | No (detect only, Chromium) |
| audio | [audio.md](audio.md) | No (detect only) |
| webrtc-protection | [webrtc-protection.md](webrtc-protection.md) | Background privacy setting |
