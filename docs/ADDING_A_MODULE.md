# ShadowShield — Adding a Module

Step-by-step guide to adding a new inject-layer module that hooks a new
browser API, reports detections, and (optionally) spoofs a value.

---

## Prerequisites

Read `docs/ARCHITECTURE.md` and `AGENTS.md` before starting.

---

## Step 1 — Create the module file

Create `src/inject/modules/<your-module>.js`.

### Minimal template

```js
/**
 * src/inject/modules/<your-module>.js
 *
 * Hooks <TargetAPI> to detect <what-it-detects>.
 */

import { hookMethod } from "../core/hook.js";
// import { hookGetter } from "../core/hook.js";   // if hooking a getter

/** @type {import("../index.js").Module} */
export const yourModule = {
    id:          "your-module",        // unique slug — used in error logs
    category:    "Canvas",             // category string shown in popup
    description: "Hooks SomeAPI.foo to detect something.",

    install(ctx) {
        hookMethod(
            SomePrototype,
            "methodName",
            (original) => function (...args) {
                ctx.report("SomeAPI.methodName", "CategoryName");
                return original.apply(this, args);
            }
        );
    }
};
```

### Rules

- **Import only from `../core/`** — never from other modules (AGENTS.md §1).
- **All overrides via `hookMethod` or `hookGetter`** — no raw
  `Object.defineProperty` (AGENTS.md §2).
- **No `console.*`** directly — use `ctx.debug.log` / `ctx.debug.warn`
  (AGENTS.md §3).
- **Profile values via `ctx.profile`** — do not hard-code spoof values.

---

## Step 2 — Register the module

Open `src/inject/modules/index.js`.

1. Add an import at the top:

   ```js
   import { yourModule } from "./your-module.js";
   ```

2. Add the module to the `registry` array in the desired install order:

   ```js
   export const registry = [
       // …existing entries…
       yourModule   // §N  Brief description of what this hooks
   ];
   ```

> To disable a module temporarily, comment out both its import line and
> its registry entry. All other modules continue to work.

---

## Step 3 — Add a test page

Create a directory `tests/pages/<your-module>/` with at least:

- `index.html` — a minimal page that exercises the hooked API.
- `test.js` — a script that calls the API and logs what it observes.

Use the existing `tests/pages/fingerprint-test/` as a reference.

---

## Step 4 — Add a COVERAGE.md row

Open `docs/COVERAGE.md` and add a row to the API Coverage Table:

```markdown
| `SomeAPI.methodName` | CategoryName | ✅ | — | 🔍 Detected | `tests/pages/your-module/` | — |
```

Status must be `🔍 Detected` until the spoof is independently verified
on a real fingerprinting site. See the legend in `COVERAGE.md`.

---

## Step 5 — Verify

1. `npm run build` — must pass with no new errors or warnings.
2. `npm run lint` — must pass.
3. Load `dist/manifest.json` via `about:debugging` in Firefox.
4. Visit your test page and confirm the detection is recorded in the popup.
5. If the module spoofs a value, verify it on `browserleaks.com` or
   equivalent before marking it ✅ in COVERAGE.md.

---

## Step 6 — (Optional) Write a unit test

If the hook logic can be tested outside a browser, add a test at
`tests/unit/<your-module>.test.js`.

---

## Checklist

- [ ] `src/inject/modules/<your-module>.js` created
- [ ] Import + registry line added to `src/inject/modules/index.js`
- [ ] `tests/pages/<your-module>/` test page added
- [ ] `docs/COVERAGE.md` row added (status ≤ 🔍 Detected until verified)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual test in Firefox confirms detection recorded in popup
