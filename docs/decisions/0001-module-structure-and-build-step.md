# 0001 — Module structure and a build step

- Status: Accepted
- Date: 2026-10

## Context
All protections lived in one 500-line file. Several people adding features would
constantly edit the same file and break each other.

## Decision
Each feature is its own file in `src/inject/modules/`, registered with one line in
`modules/index.js`. Modules never import each other; shared helpers live in
`inject/core/` and `shared/`. A small build step (esbuild) bundles everything into
`dist/`.

## Why
Content scripts cannot load separate modules at runtime, so without a bundler the
only options were one giant file or global variables leaking into every web page
(which pages could detect). esbuild is one small dev dependency.

## Consequences
- Adding a feature means adding a file plus one registry line.
- One module failing to install does not stop the others.
- Everyone must run `npm run build` and load `dist/`, not `src/`.
