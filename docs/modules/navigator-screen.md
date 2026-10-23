# navigator-screen

> File: `src/inject/modules/navigator-screen.js`
> Category shown in the popup: Device Information
> Mode: spoofs some values, detects the rest
> Hooks: `Navigator.prototype` and `Screen.prototype` getters

## What it does
Watches the "who is this computer" properties pages can read: browser identity (user agent, app version, platform, OS/CPU), language settings, CPU core count, device memory, screen size and colour depth, and a few more. For the values listed in `src/shared/profiles.js` it returns the profile's value instead of the real one.

## What it does NOT do
Spoofed today: user agent, app version, platform, OS/CPU, CPU cores, device memory, language and language list. Only detected, not changed: vendor, touch points, cookie support, automation flag, and all screen sizes/depths. The language list returned is a fixed array, which real browsers do not do.

## How to test it
Open https://browserleaks.com/javascript: it should show the profile values (currently a Linux Firefox identity, 6 cores, `ru-RU`). The popup's Protection Profile section shows the same values because both read `src/shared/profiles.js`.

## Design notes
Firefox has no `navigator.deviceMemory`, so this module adds one. A Firefox browser that reports device memory is itself unusual. Planned: make the profile coherent for the browser it pretends to be.

## Known issues
- One fixed profile for everyone; planned move to a pool of realistic profiles picked per site (decision 0005).
- Adds `deviceMemory` on Firefox (an anomaly).
- HTTP headers (User-Agent, Accept-Language) still carry the real values.
