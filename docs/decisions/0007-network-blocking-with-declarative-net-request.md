# 0007 — Network blocking with declarativeNetRequest

- Status: Accepted
- Date: 2026-10

## Context
We want to block trackers and ads. Firefox still lets an extension inspect and
block each request in code (blocking `webRequest`), which is what uBlock Origin
uses. Chromium no longer does. We also have the rule that the extension makes no
network requests and reads no page traffic (AGENTS.md rule 4), and Firefox is the
primary target (decision 0004).

## Decision
Use `declarativeNetRequest`: the browser gets a list of rules and enforces them
itself. The rules are generated at build time from two public lists, EasyPrivacy
(trackers) and EasyList (ads), by `scripts/build-rules.mjs`, and committed to
`src/blocking/rules/`.

## Why
- The extension never sees which pages or URLs a person visits, which fits our
  privacy rules and needs no host permissions.
- The same rules work in Chromium, so the Chromium port in decision 0004 stays cheap.
- Blocking in code would need permission to read every site, a matching engine we
  would have to write and keep fast, and is Firefox-only.
- Rejected: writing our own short list (not useful in practice), downloading lists
  at run time (breaks the no-network rule).

## Consequences
- Less powerful than uBlock Origin on Firefox: no cosmetic hiding, no scripts that
  change page behaviour (so no YouTube ad blocking), no regex rules.
- Rule budget: browsers guarantee 30,000 static rules per extension in total.
  Both lists share it; the build script enforces this.
- The lists go stale. Someone must run `npm run build:rules` and commit the result
  from time to time.
- The generated rules are derived from lists under GPL-3.0 / CC BY-SA 3.0; see
  `THIRD_PARTY_NOTICES.md`. The rest of the project is MIT.
- Later, a Firefox-only mode using blocking `webRequest` could add the missing
  power on top of this. That would be a new decision note.
