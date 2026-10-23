# client-hints

> File: `src/inject/modules/client-hints.js`
> Category shown in the popup: Browser Identity
> Mode: detect only
> Hooks: `navigator.userAgentData.getHighEntropyValues`

## What it does
Reports when a page asks for detailed browser/OS information through User-Agent Client Hints (architecture, bitness, platform version, model, full version list). Only exists in Chromium browsers.

## What it does NOT do
On Firefox it does nothing, because Firefox does not have this API. It does not change any answers.

## How to test it
Chromium only: call `navigator.userAgentData.getHighEntropyValues(["architecture"])` in a page and check the popup.

## Design notes
Kept so the project stays Chromium-friendly while Firefox is the priority.

## Known issues
- Detect only.
- No effect on Firefox.
