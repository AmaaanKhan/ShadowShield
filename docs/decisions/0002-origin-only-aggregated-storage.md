# 0002 — Store origins and counts only

- Status: Accepted
- Date: 2026-10

## Context
The prototype saved every event with the full page URL, forever. A privacy tool
should not keep a browsing history, and the list grew without limit.

## Decision
Store only the website origin (e.g. `https://example.com`) with a count per API,
plus the last 50 events. Caps: 200 origins, 64 APIs per origin. The background
derives the origin from the browser-provided sender URL, never from page data.

## Why
It still powers every popup view, but cannot leak paths, search terms or tokens
in links, and storage stays small.

## Consequences
- Anything needing exact URLs is deliberately impossible.
- The popup can only show aggregates and the recent list.
