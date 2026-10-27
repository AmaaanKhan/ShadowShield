# Third-party notices

## EasyPrivacy and EasyList

`src/blocking/rules/trackers.json` is generated from the EasyPrivacy filter list
(https://easylist.to/easylist/easyprivacy.txt) and `src/blocking/rules/ads.json`
from the EasyList filter list (https://easylist.to/easylist/easylist.txt), both
by `scripts/build-rules.mjs`.

- Copyright: The EasyList authors (https://easylist.to/)
- License: dual-licensed under GPL-3.0-or-later and CC BY-SA 3.0 or later
  (see https://easylist.to/pages/licence.html)

The generated rules are a derivative of those lists. Re-run `npm run build:rules`
to update them. The rest of ShadowShield is MIT licensed.
