# ShadowShield — Coverage

> Tracks which browser APIs are monitored/spoofed and the verification status
> of each. **Never mark Status = ✅ Verified until confirmed on a live
> fingerprinting test site or a dedicated test page.**

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ Verified | Confirmed spoofed on browserleaks.com or equivalent |
| 🔍 Detected | API is hooked and reported; spoof value not yet verified |
| ⚠️ Partial | Hook installed but known gaps exist |
| ❌ Missing | API known to leak; no hook yet |
| — | Not applicable |

---

## API Coverage Table

| API / Property | Category | Hooked | Spoofed | Status | Test Page | Unit Test |
|---|---|---|---|---|---|---|
| `Canvas.toDataURL` | Canvas | ✅ | — | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Canvas.getContext(webgl)` | WebGL | ✅ | — | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `WebGL.getExtension` | WebGL | ✅ | — | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `WebGL.getParameter` | WebGL | ✅ | — | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Canvas.measureText` | Font | ✅ | — | 🔍 Detected | — | — |
| `Navigator.userAgent` | Device Info | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Navigator.appVersion` | Device Info | ✅ | ✅ | 🔍 Detected | — | — |
| `Navigator.platform` | Device Info | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Navigator.vendor` | Device Info | ✅ | — | 🔍 Detected | — | — |
| `Navigator.language` | Device Info | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Navigator.languages` | Device Info | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Navigator.hardwareConcurrency` | Device Info | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Navigator.deviceMemory` | Device Info | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Navigator.maxTouchPoints` | Device Info | ✅ | — | 🔍 Detected | — | — |
| `Navigator.cookieEnabled` | Device Info | ✅ | — | 🔍 Detected | — | — |
| `Navigator.webdriver` | Device Info | ✅ | — | 🔍 Detected | — | — |
| `Navigator.oscpu` | Device Info | ✅ | ✅ | 🔍 Detected | — | — |
| `Screen.width/height` | Device Info | ✅ | — | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Screen.availWidth/availHeight` | Device Info | ✅ | — | 🔍 Detected | — | — |
| `Screen.colorDepth/pixelDepth` | Device Info | ✅ | — | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Window.devicePixelRatio` | Display | ✅ | — | 🔍 Detected | — | — |
| `Intl.DateTimeFormat` | System | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Date.getTimezoneOffset` | System | ✅ | ✅ | 🔍 Detected | `tests/pages/fingerprint-test/` | — |
| `Date.toString` | System | ✅ | ✅ | 🔍 Detected | — | — |
| `Date.toLocaleString` | System | ✅ | ✅ | 🔍 Detected | — | — |
| `Navigator.userAgentData` | Browser ID | ✅ | — | 🔍 Detected | — | — |
| `AudioContext.createAnalyser` | Audio | ✅ | — | 🔍 Detected | — | — |

---

## Notes

- All spoof values in Phase 0.1 target a fictional **Linux x86\_64 / Firefox 158 /
  Europe/Moscow** identity defined in `src/inject/index.js`.
- Verification against live sites is planned for Phase 1.
