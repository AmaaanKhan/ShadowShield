# display

> File: `src/inject/modules/display.js`
> Category shown in the popup: Display
> Mode: detect only
> Hooks: `Window.prototype.devicePixelRatio`

## What it does
Reports when a page reads the display pixel ratio (screen sharpness), which helps identify a device. Detection only.

## What it does NOT do
It does not change the value.

## How to test it
Open `tests/pages/fingerprint-test/`: a "Display pixel ratio" entry should appear.

## Design notes
Kept as its own module because screen protection will likely grow here.

## Known issues
- Detect only.
