# canvas

> File: `src/inject/modules/canvas.js`
> Category shown in the popup: Canvas
> Mode: detect only
> Hooks: `HTMLCanvasElement.prototype.toDataURL`

## What it does
Reports when a page reads a canvas back as an image (`toDataURL`). Fingerprinting scripts draw hidden text and shapes, read the result, and hash it: tiny rendering differences between computers make that hash nearly unique. The module records the access; it does not change the image.

## What it does NOT do
It does not add noise or block anything. It does not cover other ways to read a canvas: `toBlob`, `getImageData`, or `OffscreenCanvas`.

## How to test it
Open `tests/pages/fingerprint-test/`, then the popup: a "Canvas image extraction" entry should appear.

## Design notes
Adding randomized noise to the returned image is a planned feature. Any noise should be consistent for a given site and differ across sites (see decision 0005).

## Known issues
- Detect only; `toBlob`, `getImageData` and `OffscreenCanvas` are not hooked.
