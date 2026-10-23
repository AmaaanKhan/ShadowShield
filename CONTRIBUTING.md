# Contributing to ShadowShield

Thanks for helping. This page is the short version; the rules every change must
follow are in [`AGENTS.md`](AGENTS.md).

## Setup
```
npm install
npm run build       # then load dist/manifest.json in Firefox (about:debugging)
npm run dev         # rebuilds on change, with debug logging
npm run lint
```

## Which lane is your change in?

| Lane | Examples | Folders you will touch |
|---|---|---|
| Page protections | new or improved spoofing/detection | `src/inject/modules/`, `src/shared/profiles.js` |
| Interface | popup layout, charts, settings screens | `src/popup/` |
| Network | tracker blocking | `src/blocking/` (new), `src/manifest.json`, `scripts/build.mjs` |

Pick one lane per pull request. Lanes rarely touch the same files, which is what
keeps parallel work safe.

## Workflow
1. Branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
2. Make a small change. Follow [`docs/ADDING_A_MODULE.md`](docs/ADDING_A_MODULE.md)
   for new protections.
3. Check it: `npm run build`, `npm run lint`, then try it in Firefox.
4. Update the docs (the pull request template lists them).
5. Open a pull request and fill in the checklist. Ask for one review.

## Where things are written down
| What | Where |
|---|---|
| How a feature works, and its limits | `docs/modules/<name>.md` |
| Why we chose something big | `docs/decisions/` |
| What changed, for humans | `CHANGELOG.md` |
| Which APIs are covered and verified | `docs/COVERAGE.md` |
| Where the project stands right now | `docs/STATUS.md` |
| Fine-grained history of a file | `git log <file>` |
