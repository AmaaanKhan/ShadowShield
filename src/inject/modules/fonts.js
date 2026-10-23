/**
 * src/inject/modules/fonts.js
 *
 * Hooks CanvasRenderingContext2D.prototype.measureText to detect font
 * fingerprinting (§3 of the original injection.js).
 *
 * Uses the same __shadowShieldHooked sentinel on the function so that
 * repeated calls to install() are idempotent.
 */

import { hookMethod } from "../core/hook.js";

/** @type {import("../index.js").Module} */
export const fonts = {
    id: "fonts",
    category: "Font",
    description: "Hooks CanvasRenderingContext2D.prototype.measureText to detect font fingerprinting.",

    install(ctx) {
        const proto =
            window.CanvasRenderingContext2D &&
            window.CanvasRenderingContext2D.prototype;

        if (!proto) {
            ctx.debug.warn("fonts: CanvasRenderingContext2D prototype not available");
            return;
        }

        if (proto.measureText && proto.measureText.__shadowShieldHooked) {
            return; // already installed
        }

        hookMethod(proto, "measureText", (original) => {
            const hooked = function (...args) {
                ctx.report("Canvas.measureText", "Font");
                return original.apply(this, args);
            };
            hooked.__shadowShieldHooked = true;
            return hooked;
        });

        ctx.debug.log("fonts: font hook installed.");
    }
};
