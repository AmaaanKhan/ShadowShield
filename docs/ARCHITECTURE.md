# ShadowShield — Architecture

> This document describes the project structure as of **Phase 0.2**. It is
> updated at the end of each phase.

---

## Overview — Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser Tab                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Page world (MAIN)  —  dist/injection.js                  │  │
│  │                                                            │  │
│  │  src/inject/index.js        ← bootstrap                   │  │
│  │  src/inject/core/hook.js    ← hookMethod / hookGetter      │  │
│  │  src/inject/core/report.js  ← window.postMessage          │  │
│  │  src/inject/core/debug.js   ← log/warn (debug builds)     │  │
│  │  src/inject/modules/*.js    ← one file per API group       │  │
│  │                                                            │  │
│  │  Reads profile from:  src/shared/profiles.js              │  │
│  └─────────────────┬──────────────────────────────────────────┘  │
│                    │ window.postMessage("ShadowShield")           │
│  ┌─────────────────▼──────────────────────────────────────────┐  │
│  │  Isolated world  —  dist/content.js                        │  │
│  │  src/content/bridge.js                                      │  │
│  └─────────────────┬──────────────────────────────────────────┘  │
└────────────────────┼─────────────────────────────────────────────┘
                     │ browser.runtime.sendMessage
          ┌──────────▼──────────────┐
          │  Background (SW)         │
          │  src/background/index.js │
          │  Writes → storage.local  │
          └──────────┬──────────────┘
                     │ storage.local.get
          ┌──────────▼──────────────┐
          │  Popup UI                │
          │  src/popup/popup.js      │
          │  Reads profile from:     │
          │  src/shared/profiles.js  │
          └─────────────────────────┘
```

---

## Directory Layout

| Path | Purpose |
|---|---|
| `src/background/index.js` | MV3 service worker; receives detections, writes `storage.local` |
| `src/content/bridge.js` | Isolated-world bridge; forwards page→extension messages |
| `src/inject/index.js` | MAIN-world bootstrap; builds `ctx`, iterates module registry |
| `src/inject/core/hook.js` | `hookMethod` / `hookGetter` — central override registry |
| `src/inject/core/report.js` | `reportDetection` — postMessage wrapper |
| `src/inject/core/debug.js` | `log` / `warn` — compile-time DEBUG flag |
| `src/inject/modules/*.js` | One module per API group (see Module Contract below) |
| `src/inject/modules/index.js` | Ordered registry array |
| `src/popup/popup.js` | Extension popup UI |
| `src/shared/profiles.js` | **Single source of truth** for the active protection profile |
| `scripts/build.mjs` | esbuild bundler (`--dev` flag sets `__SHADOWSHIELD_DEBUG__=true`) |
| `tests/pages/` | Manual test pages per feature |
| `tests/unit/` | Automated unit tests (to be added Phase 1+) |
| `docs/` | Architecture (this file), COVERAGE.md, ADDING_A_MODULE.md |

---

## Module Contract

Every file in `src/inject/modules/` **must** export exactly one object of this shape:

```js
export const myModule = {
    id:          "my-module",   // unique slug; used in error messages
    category:    "Canvas",      // detection category string
    description: "What it hooks and why.",

    install(ctx) {
        // ctx.hook.hookMethod(target, name, makeWrapper)
        // ctx.hook.hookGetter(target, prop, makeWrapper)
        // ctx.report(apiName, category)
        // ctx.profile  → shadowShieldProfile (from shared/profiles.js)
        // ctx.debug.log / ctx.debug.warn
    }
};
```

Modules **must not** import from each other. They may only import from
`../core/` (runtime helpers). The profile comes through `ctx.profile`.

---

## Hook System (`core/hook.js`)

Two functions are the only permitted way to override browser APIs:

| Function | Purpose |
|---|---|
| `hookMethod(target, name, makeWrapper)` | Replace a method; calls `makeWrapper(original)` |
| `hookGetter(target, prop, makeWrapper)` | Replace a getter; calls `makeWrapper(originalGetter)` |

Both write with `configurable: true` so overrides are auditable and
reversible. Phase 1 will add stealth (preserve native `toString`).

---

## Debug Build Flag

`__SHADOWSHIELD_DEBUG__` is injected at build time via esbuild `define`:

| Command | Value | Effect |
|---|---|---|
| `npm run build` | `false` | All `debug.log/warn` calls eliminated as dead code |
| `npm run dev` | `true` | `console.log/warn` visible in DevTools |

---

## Known Issues — Planned Fixes

> These are preserved quirks from Phase 0.1, listed here so they are
> discoverable. Phase 1 addresses them in priority order.

| Issue | Impact | Plan |
|---|---|---|
| **Forgeable postMessage channel** | A page can spoof `source: "ShadowShield"` messages | Add structured-clone message with stricter origin filtering |
| **Full URLs stored in storage** | Privacy leak — `detection.url` stores the full `location.href` | `content/bridge.js` must record `location.origin` only (AGENTS.md rule 4) |
| **Non-stealth hooks** | Wrapped functions fail `Function.prototype.toString` native checks | Phase 1: preserve native toString via `Proxy` or `Object.defineProperty` on the wrapper |
| **Per-instance WebGL patching** | WebGL hooks installed on each context object; misses contexts created before injection | Migrate to `WebGLRenderingContext.prototype` in Phase 1 |
| **No `all_frames` / Worker coverage** | Fingerprinting in iframes and workers is undetected | Future phase |
| **Inconsistent Date getters** | `toDateString`, `toTimeString`, `toUTCString` not intercepted | Phase 1 |
| **No runtime config** | Profile is compile-time constant; can't toggle per-site | Phase 2 |

---

## Storage Schema

Detections are stored in `browser.storage.local` under the key `detections`:

```json
{
  "detections": [
    {
      "api":       "Canvas.toDataURL",
      "category":  "Canvas",
      "timestamp": "2026-01-01T00:00:00.000Z",
      "url":       "https://example.com/"   // ← known issue: should be origin only
    }
  ]
}
```

---

## Security Considerations

- The extension makes **no outbound network requests** (AGENTS.md rule 4).
- All data is stored locally in `browser.storage.local`.
- The postMessage channel is not authenticated (see Known Issues above).
- Hooks run in the page's JS context and are visible to advanced page scripts.
