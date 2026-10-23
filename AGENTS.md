# ShadowShield — Agent & Contributor Rules

> **Scope:** These rules apply to every code change, PR, and AI-assisted task in
> this repository. They exist to keep the extension deterministic, auditable, and
> free of accidental data leaks.

---

## 1. Module Isolation

- **Modules never import from each other directly.**  
  `src/inject/modules/`, `src/content/`, `src/background/`, and `src/popup/`
  are isolated boundaries. Cross-cutting utilities live exclusively in
  `src/inject/core/` (runtime helpers, inject-layer only) or `src/shared/`
  (pure, side-effect-free constants and types usable by any layer). Only these
  two directories may be imported.

  ```
  ✅  import { hookMethod } from "../core/hook.js";
  ✅  import { shadowShieldProfile } from "../../shared/profiles.js";
  ❌  import something from "../modules/canvas.js";   // cross-module
  ❌  import something from "../../content/bridge.js"; // cross-boundary
  ```

## 2. Hook Registration

- **All function/getter overrides MUST go through `core/hook.js`.**  
  Direct `Object.defineProperty` calls that intercept browser APIs are not
  permitted outside of `core/hook.js`. This ensures every override is logged,
  auditable, and reversible.

  ```
  ✅  hookMethod(HTMLCanvasElement.prototype, "toDataURL", (orig) => …)
  ❌  HTMLCanvasElement.prototype.toDataURL = function (…) { … }
  ```

## 3. No `console.log` in the Page World

- `src/inject/` runs with `"world": "MAIN"` — it executes in the same
  JS context as the page.  
  **No `console.*` calls are permitted there unless routed through the
  `debug` helpers in `src/inject/core/debug.js`**, which are compiled
  away to nothing in release builds.

  ```js
  // ✅ correct
  ctx.debug.log("hook installed");
  ctx.debug.warn("Cannot override", prop);

  // ❌ wrong — visible to the page in production
  console.log("ShadowShield active");
  ```

  Background, content, and popup scripts may use `console.*` freely.

## 4. Privacy — Origin Only, No Network

- **Never store or transmit full URLs.** Record the `origin` only
  (`location.origin`, not `location.href`).  
  _(Known issue in Phase 0.2: `content/bridge.js` still sends the full URL;
  fix is planned for Phase 1.)_
- **The extension makes zero outbound network requests.** Do not add `fetch`,
  `XMLHttpRequest`, or WebSocket calls. All data stays in `browser.storage.local`.

## 5. Test Coverage Requirements

Every new feature or override requires **all three** of the following before it
can be considered "done":

| Requirement | Location |
|---|---|
| Manual test-page case | `tests/pages/<feature>/` |
| Unit test (where feasible) | `tests/unit/<feature>.test.js` |
| Row in coverage table | `docs/COVERAGE.md` |

- **Never mark a spoofed value as verified until you have confirmed it** on at
  least one real fingerprinting site (e.g. `browserleaks.com`) or a test page
  that exercises the same API path.

## 6. Change Discipline

- **Keep changes small and in scope.** A PR that adds a new spoof must not also
  refactor unrelated code.
- **Ask before adding dependencies.** Every new `devDependency` or
  `dependency` must be discussed and justified. Runtime dependencies in the
  extension bundle are especially scrutinised.
- When uncertain about scope, open a discussion rather than making a
  large-footprint change.

## 7. Single Source of Truth for Profile Values

- **All spoof values live in `src/shared/profiles.js`.** Do not duplicate
  profile constants in individual modules or the popup. Import from shared/.

---

_Last updated: Phase 0.2 — core + modules refactor_
