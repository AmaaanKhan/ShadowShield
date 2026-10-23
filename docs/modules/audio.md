# audio

> File: `src/inject/modules/audio.js`
> Category shown in the popup: Audio
> Mode: detect only
> Hooks: `AudioContext.prototype.createAnalyser`

## What it does
Reports when a page creates an audio analyser, a building block of audio fingerprinting (processing a sound and reading tiny hardware-dependent differences). Detection only.

## What it does NOT do
It does not add noise to audio output. It only catches `createAnalyser`, not every audio fingerprinting route.

## How to test it
Open `tests/pages/fingerprint-test/`: an "Audio analysis access" entry should appear.

## Design notes
If audio is not ready at page start, the module retries every 100 ms for up to 5 seconds.

## Known issues
- Detect only; limited API coverage.
