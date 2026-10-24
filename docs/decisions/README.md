# Decision notes

A decision note is a short record of a choice that would be hard to understand
later from the code alone: what we chose, why, and what we gave up. Write one
when a decision affects more than one file, or when someone might ask "why on
earth did we do it this way?" in six months.

Rules of thumb:
- One decision per file, numbered in order: `0006-short-name.md`.
- Keep it to about a page. Copy [`0000-template.md`](0000-template.md).
- Do not edit an old decision to change history. If we change our mind, add a
  new note and mark the old one "Superseded by 000X".

| # | Decision | Status |
|---|---|---|
| 0001 | [Module structure and a build step](0001-module-structure-and-build-step.md) | Accepted |
| 0002 | [Store origins and counts only](0002-origin-only-aggregated-storage.md) | Accepted |
| 0003 | [Validate and rate-limit instead of a private channel](0003-validate-instead-of-handshake.md) | Accepted |
| 0004 | [Firefox first](0004-firefox-first.md) | Accepted |
| 0005 | [Per-site consistent randomization](0005-per-site-randomization.md) | Proposed |
| 0006 | [Attribute frame reads to the top-level site](0006-attribute-to-top-site.md) | Accepted |
