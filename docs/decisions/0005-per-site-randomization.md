# 0005 — Per-site consistent randomization

- Status: Proposed
- Date: 2026-10

## Context
One fixed profile is easy to recognize: everyone using the extension looks the
same, and in a small user base that sameness is itself a fingerprint. Fully
random values on every read are worse, because real computers do not change
their specs between calls and pages can compare repeated reads.

## Proposed decision
Keep a pool of realistic, internally consistent profiles (never mixed parts, e.g.
a Linux platform with a Windows user agent). Choose one per website using a
secret that stays the same for that site and differs between sites. For canvas
and audio, add small noise generated from the same per-site secret.

## Open questions
- Where the per-site secret is stored (fresh per page load is simplest; remembered
  per site needs the background to hand it to the page).
- How often to rotate it.
- Which profiles are realistic enough to include, and keeping them up to date.

## Consequences if accepted
- `shared/profiles.js` becomes a pool plus a chooser.
- New helper `inject/core/random.js`.
- The popup shows which profile is active for the current site.
