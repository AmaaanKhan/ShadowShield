# 0006 — Attribute frame reads to the top-level site

- Status: Accepted
- Date: 2026-10-24

## Context
Fingerprinting often happens inside advertising, analytics, or embedded frames.
The browser sender identifies the frame that sent an event, but users generally
think of that activity as occurring while visiting the top-level site.

## Decision
Count frame events under the top-level tab origin and record a separate bounded
`frames` map containing the distinct cross-origin embedded origins that read
signals. Same-origin frames and opaque/about:blank-style frame origins do not
receive a separate actor entry.

## Why
This keeps the main dashboard useful as a site-level view while preserving the
most useful additional fact: which embedded origin performed the read. The
background remains the authority for both identities.

## Consequences
- The storage schema gains `frames` under each site.
- Background writes are coalesced because many frames can report together.
- Worker coverage remains separate work.
