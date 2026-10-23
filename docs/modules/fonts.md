# fonts

> File: `src/inject/modules/fonts.js`
> Category shown in the popup: Font
> Mode: detect only
> Hooks: `CanvasRenderingContext2D.prototype.measureText`

## What it does
Reports text-measurement calls. Pages measure the same text in many fonts to learn which fonts are installed, which is a fingerprint. The module records the access only.

## What it does NOT do
It does not limit or randomize font detection. It does not cover the other common trick, measuring page elements (`offsetWidth`).

## How to test it
Open `tests/pages/fingerprint-test/`: a "Font measurement" entry should appear.

## Design notes
Uses a marker on the wrapped function so installing twice does not double-hook.

## Known issues
- Detect only; element-size font probing is not covered.
