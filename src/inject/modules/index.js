/**
 * src/inject/modules/index.js
 *
 * Ordered module registry.
 *
 * Install order matters: canvas must come before webgl because webgl
 * wraps getContext which was already patched by canvas's toDataURL hook.
 * (Actually they are independent; keep the original §1–§9 order.)
 *
 * To disable a module: comment out its import and its entry in the array.
 * The bootstrap will continue with the remaining modules unaffected.
 */

import { canvas }          from "./canvas.js";
import { webgl }           from "./webgl.js";
import { fonts }           from "./fonts.js";
import { navigatorScreen } from "./navigator-screen.js";
import { display }         from "./display.js";
import { timezone }        from "./timezone.js";
import { clientHints }     from "./client-hints.js";
import { audio }           from "./audio.js";

/**
 * @type {Array<import("../index.js").Module>}
 */
export const registry = [
    canvas,          // §1  Canvas.toDataURL
    webgl,           // §2  Canvas.getContext + WebGL per-instance hooks
    fonts,           // §3  Canvas.measureText
    navigatorScreen, // §§4-5 Navigator + Screen properties + deviceMemory fallback
    display,         // §6  Window.devicePixelRatio
    timezone,        // §7  Intl.DateTimeFormat + Date timezone/locale methods
    clientHints,     // §8  navigator.userAgentData (Chromium only)
    audio            // §9  AudioContext.createAnalyser (with retry)
];
