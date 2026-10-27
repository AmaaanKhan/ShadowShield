# blocking

> Files: `src/blocking/` (background, popup card, settings) and `scripts/build-rules.mjs`
> Category shown in the popup: Trackers and ads
> Mode: blocks network requests (does not touch page JavaScript)

## What it does
Stops the browser from sending requests to known tracking and advertising
servers. Two lists are used: **EasyPrivacy** (trackers) and **EasyList** (ads).
They are converted at build time into browser rules (`declarativeNetRequest`)
that Firefox enforces itself, so the extension never sees the pages' traffic.

The popup card has a switch for trackers, a switch for ads, and a switch for the
current site (turns both off there). It shows how many requests were blocked on
the current page.

## What it does NOT do
- It does not hide the empty space a blocked ad leaves behind (cosmetic
  filtering is not implemented).
- It cannot remove ads that come from the same server as the page's own content,
  such as YouTube video ads. Rules can only allow or block a URL.
- It skips the filters that need features rules do not have: pop-up blocking,
  regular expressions, redirects, and about 580 `$document` block rules (blocking
  whole pages is deliberately not done). `npm run build:rules` prints what was
  skipped.
- New ad and tracker servers appear all the time; the lists must be rebuilt now
  and then.
- It does not block anything in a site's own first-party requests unless a list
  rule matches them.

## How to test it
1. `npm run build`, then `npm run test:pages`. Load `dist/manifest.json` in Firefox
   (`about:debugging`) or the `dist` folder in Chrome (`chrome://extensions`, Load unpacked).
2. Open `http://127.0.0.1:8000/tracker-test/` and `http://127.0.0.1:8000/ad-test/`
   (needs internet). Every tracker or ad row should say "blocked" and the control
   rows "loaded".
3. In the popup, switch trackers or ads off, reload the test page, and those rows
   should say "loaded". Switch "Block on this site" off and both lists let
   everything through on that site.
4. Open a normal news site and check the popup's count and that the page still works.
5. `npm test` covers the list converter and the settings logic.
6. `npm run check-url -- <url> --type script --from https://some.site` says which
   rule would block a URL, without a browser.

## Design notes
- Decision: [0007](../decisions/0007-network-blocking-with-declarative-net-request.md).
- Rules live in `src/blocking/rules/*.json` and are committed. They are generated
  by `npm run build:rules` and copied to `dist/rules/` by the build.
- The two lists share the 30,000 static rules the browsers guarantee per
  extension. Each list is capped at 14,500 and the build script stops if the total
  goes over.
- Exceptions from the lists (rules that let a URL through) have rule ids from
  100000 up. The popup uses that to count only real blocks.
- Settings are one object under the storage key `blocking`. Only host names the
  user switched off are stored, never page addresses or history.
- The popup list dates come from the generated `*.meta.json` files at build time,
  because the extension makes no network requests (AGENTS.md rule 4).
- Settings change only on messages from the extension's own pages.

## Known issues
- **Blocked count in Firefox:** the browser only gives the matched-rule list to
  everyone when `extensions.dnr.feedback` is `true` in `about:config`. Without it
  the popup says the count is not available. Blocking works either way.
- **Blocked count in Chrome:** it relies on the `activeTab` permission that clicking
  the toolbar icon grants. If the popup says the count is not available in Chrome,
  that needs a follow-up (adding `declarativeNetRequestFeedback` would fix it but
  asks Chrome users for a broader permission).
- Blocking was checked with the test pages in Firefox and Chromium. The popup
  switches were checked in Chromium. See [COVERAGE.md](../COVERAGE.md).
- `npm run lint` skips `dist/rules/*.json` (`--ignore-files` in `package.json`):
  Mozilla's add-on checker mistakes the names of crypto-miner domains in
  EasyPrivacy, which we block, for a miner and fails the build. The rule files
  are checked by `npm run build:rules` and the unit tests instead.
- Rule matching is the browser's own and can differ slightly from uBlock Origin.
  Some sites may break; switch blocking off for that site from the popup.
