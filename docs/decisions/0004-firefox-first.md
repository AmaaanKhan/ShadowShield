# 0004 — Firefox first

- Status: Accepted
- Date: 2026-10

## Decision
Firefox is the target browser. Chromium compatibility is kept only where it is
cheap (for example the build targets both, and `client-hints` exists).

## Why
Concentrating on one browser lets the team verify real behaviour instead of
guessing across two. Some choices follow from it, such as the manifest using
`background.scripts` and a Firefox extension ID.

## Consequences
- Chromium-specific work (service worker manifest, Client Hints spoofing) waits.
- A Chromium port later will need a per-browser manifest.
