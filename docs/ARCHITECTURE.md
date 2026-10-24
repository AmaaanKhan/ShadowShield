# ShadowShield — Architecture

> This document describes the project structure as of **Phase 0.3-lite**. It is
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
│  │  validate → count per (api, category) → 1 batch / second   │  │
│  └─────────────────┬──────────────────────────────────────────┘  │
└────────────────────┼─────────────────────────────────────────────┘
                     │ runtime.sendMessage  { type: "fingerprint-batch" }
          ┌──────────▼──────────────────────┐
          │  Background (event page)         │
          │  src/background/index.js         │
          │  src/background/event-store.js   │
          │  top-site origin + frame actor,  │
          │  coalesced writes → storage      │
          └──────────┬──────────────────────┘
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
| `src/background/index.js` | Background event page; receives batches, enforces trust rules, writes `storage.local` |
| `src/background/event-store.js` | Pure aggregation, limits and eviction logic (no browser APIs; unit-testable in Node) |
| `src/content/bridge.js` | Isolated-world bridge; validates, rate-limits and batches page→extension events |
| `src/inject/index.js` | MAIN-world bootstrap; builds `ctx`, iterates module registry |
| `src/inject/core/hook.js` | `hookMethod` / `hookGetter` — central override registry |
| `src/inject/core/report.js` | `reportDetection` — postMessage wrapper |
| `src/inject/core/debug.js` | `log` / `warn` — compile-time DEBUG flag |
| `src/inject/modules/*.js` | One module per API group (see Module Contract below) |
| `src/inject/modules/index.js` | Ordered registry array |
| `src/popup/popup.js` | Extension popup UI |
| `src/shared/profiles.js` | **Single source of truth** for the active protection profile |
| `src/shared/detection-schema.js` | Shape rules for detection events, used by both bridge and background |
| `src/shared/webrtc.js` | Pure WebRTC setting defaults and control-status helpers |
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

| Issue | Impact | Status |
|---|---|---|
| ~~Full URLs stored in storage~~ | Privacy leak | **Fixed in 0.3-lite.** Only origins are stored; the origin comes from `sender.url`, never from the page. A legacy `detections` key is deleted on startup. |
| ~~Unbounded storage growth~~ | Slow writes, quota | **Fixed in 0.3-lite.** Aggregated counts with caps (see Storage Schema). |
| **Forged events are still countable** | A page can post a well-formed `source: "ShadowShield"` message and have it counted | **Mitigated, not eliminated.** Events are validated, rate-limited (1 batch/s, 100 keys) and bounded, so forgery cannot inject URLs, grow storage past its caps or spam the popup. A private MessageChannel handshake would close it fully; deferred. |
| **Non-stealth hooks** | Wrapped functions fail `Function.prototype.toString` native checks | Phase 1: make `core/hook.js` stealthy |
| **Per-instance WebGL patching** | Hooks installed on each context object; no WebGL2/OffscreenCanvas prototype coverage | Phase 1: patch the prototypes |
| **No `all_frames` / Worker coverage** | Iframe coverage and top-site attribution are fixed; Workers remain uncovered | Partly fixed in quick-wins batch 1 |
| **Same-origin about:blank frame coherence** | An about:blank frame may expose real values | Needs manual confirmation using `tests/pages/iframe-test/blank-frame.html` |
| **Inconsistent Date getters** | `toDateString`, `toTimeString`, `toUTCString` and local getters (`getHours` …) not intercepted | Phase 1 |
| **`DateTimeFormat` locale/hour-cycle mismatch** | ru-RU locale can still print a 12-hour clock | Phase 1 |
| **`deviceMemory` on a Firefox UA** | Firefox has no `navigator.deviceMemory`; defining it is itself an anomaly | Phase 1 |
| **No runtime config** | Profile is a compile-time constant; no per-site toggles | Phase 2 |

---

## Storage Schema

The activity data uses two keys in `browser.storage.local`. Only **origins** are
stored, never paths or query strings. The separate settings and status keys are
described below.

```json
{
  "stats": {
    "https://example.com": {
      "lastSeen": 1767225600000,
      "apis": {
        "Canvas.toDataURL": {
          "category": "Canvas",
          "count": 12,
          "firstSeen": 1767225000000,
          "lastSeen": 1767225600000
        }
      },
      "frames": {
        "https://embedded.example": {
          "count": 4,
          "firstSeen": 1767225000000,
          "lastSeen": 1767225600000
        }
      }
    }
  },
  "recent": [
    { "origin": "https://example.com", "api": "Canvas.toDataURL",
      "category": "Canvas", "count": 3, "timestamp": 1767225600000 }
  ]
}
```

Limits (`LIMITS` in `src/background/event-store.js`):

| Limit | Value |
|---|---|
| Origins kept (least recently seen evicted first) | 200 |
| Distinct APIs per origin | 64 |
| Embedded origins per origin | 20 |
| `recent` entries | 50 |
| Entries accepted per batch | 100 |
| Count increment accepted per entry | 100000 |

The popup's **Clear data** button sends `{ type: "clear-data" }` to the
background, which only accepts it from extension pages (no `sender.tab`).

The background coalesces iframe batches for 500 ms and saves the state once per
flush. The top-level origin comes from the tab URL; a different HTTP(S) frame
origin is stored under that site's `frames` map.

Additional local keys are maintained separately:

```json
{
  "settings": { "webrtcProtection": true },
  "status": { "webrtc": "active" }
}
```

The `settings` and `status` keys are not removed by **Clear data**.

---

## Security Considerations

- The extension makes **no outbound network requests** (AGENTS.md rule 4).
- All data is stored locally in `browser.storage.local`.
- The background accepts messages only from this extension (`sender.id`), and
  detection batches only from a tab. The site identity is taken from
  `sender.url`, which the browser sets; nothing the page sends is trusted for
  identity.
- The postMessage channel from page to bridge is not authenticated (see Known
  Issues); the bridge validates and rate-limits everything it receives.
- Hooks run in the page's JS context and are visible to advanced page scripts.
