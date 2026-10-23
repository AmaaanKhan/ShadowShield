# webgl

> File: `src/inject/modules/webgl.js`
> Category shown in the popup: WebGL
> Mode: detect only
> Hooks: `HTMLCanvasElement.prototype.getContext`, then `getExtension` / `getParameter` on each WebGL context

## What it does
Reports when a page opens a WebGL (graphics) context and asks for graphics capabilities or hardware details. Those answers reveal the graphics card and driver, which is a strong fingerprint. The module records the access; it does not change the answers.

## What it does NOT do
It does not spoof the renderer or vendor strings. It misses contexts that are not created through a canvas element's `getContext`.

## How to test it
Open `tests/pages/fingerprint-test/`: expect "WebGL graphics access", "Graphics capability lookup" and "Graphics hardware information" in the popup.

## Design notes
Hooks are installed on each context object rather than on the shared prototype. That was kept from the original prototype on purpose and is a known weakness (a page can notice it).

## Known issues
- Per-instance patching is detectable and misses WebGL2/OffscreenCanvas coverage.
- Detect only.
