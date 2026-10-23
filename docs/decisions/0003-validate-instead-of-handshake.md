# 0003 — Validate and rate-limit instead of a private channel

- Status: Accepted (may be revisited)
- Date: 2026-10

## Context
The page-side code reports detections with `window.postMessage`, which the web
page can also see and forge.

## Decision
Keep `postMessage`, but treat every message as untrusted: validate its shape,
count per API, send at most one batch per second (100 keys), and take the site
identity from the browser, not the message.

## Why
A private `MessageChannel` handshake would stop forgery completely but adds
real complexity. Validation and limits remove the damaging cases (URL injection,
storage flooding, popup spam) for a fraction of the work.

## Consequences
- A page can still make a fake well-formed event get counted.
- If that ever matters, add the handshake as a separate, small task.
