# ShadowShield

A browser fingerprint resistance framework for enhanced online privacy.

## About

ShadowShield is a privacy project focused on detecting and reducing browser fingerprinting across Firefox and Chromium browsers.

The project aims to monitor information exposed through browser APIs, identify fingerprinting attempts, and apply privacy protections where possible.

It will also provide users with visibility into what websites can access and how effective the applied protections are.

## Planned Features

- Tracker protection (available now, see below)
- Fingerprinting detection
- Browser API monitoring
- Fingerprint resistance and attribute normalization
- Custom browser identity profiles
- Privacy and fingerprint analysis
- Per-site privacy information
- VPN-aware consistency checks
- Fingerprint before/after comparison
- Privacy dashboard

## Tracker protection

ShadowShield blocks requests to known trackers using the EasyPrivacy list. The
browser enforces the rules itself (`declarativeNetRequest`), so no page content
is read or sent anywhere. It works in Firefox 128+ and Chrome 111+.

- Global on/off and per-site on/off in the toolbar popup
- Blocked count for the current page (Chrome shows it on the toolbar icon too)
- Rules live in `extension/rules/trackers.json`, generated from the list

### Update the blocklist

```
npm run build:rules                      # downloads the latest EasyPrivacy
npm run build:rules -- --input file.txt  # or use a file you already have
```

Needs Node.js 18 or newer. The script prints how many rules were written and
which filters could not be converted.

### Check why a URL is (not) blocked

```
npm run check-url -- https://www.google-analytics.com/analytics.js
```

### Run the tests

```
npm test
```

### Try the extension

- **Chrome:** open `chrome://extensions`, turn on Developer mode, click
  "Load unpacked" and choose the `extension` folder.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, click
  "Load Temporary Add-on" and choose `extension/manifest.json`.

Then serve `tests/tracker-test` (`python -m http.server 8000` inside it), open
`http://localhost:8000`, and every tracker row should say "blocked".

The blocked count in the popup relies on browser features that Firefox only
enables for developers: set `extensions.dnr.feedback` to `true` in
`about:config` to see it there. Blocking works either way.

## Technology

- Firefox and Chrome WebExtensions (Manifest V3)
- JavaScript / TypeScript
- React / Next.js
- Node.js
- PostgreSQL

## Status

Currently under development.

## License

MIT. The generated blocklist is derived from EasyPrivacy and carries its own
license, see `THIRD_PARTY_NOTICES.md`.
