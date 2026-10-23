# timezone

> File: `src/inject/modules/timezone.js`
> Category shown in the popup: System Settings
> Mode: spoofs (partially)
> Hooks: `Intl.DateTimeFormat`, `Date.prototype.getTimezoneOffset`, `toString`, `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString`

## What it does
Makes the browser appear to be in the profile's timezone (currently Europe/Moscow, locale ru-RU). Covers the timezone name pages ask for, the UTC offset, the long date string, and the locale-formatted date/time methods.

## What it does NOT do
It is not complete. Other date methods (`getHours` and friends, `toDateString`, `toTimeString`, `toUTCString`) still use your real timezone, so a careful page can spot the mismatch. The offset and the "Moscow Standard Time" text are hardcoded. A Russian locale can still print a 12-hour clock.

## How to test it
Open https://browserleaks.com/javascript: the Date/Time section should say Moscow time and `ru-RU`.

## Design notes
Making this fully consistent is the largest open item in the spoofing work. Inconsistent time values are easier to detect than not spoofing at all.

## Known issues
- Other `Date` getters unprotected.
- Hardcoded offset and timezone name.
- 12-hour clock with `ru-RU` locale.
- `Intl.DateTimeFormat` replacement is detectable by careful pages.
