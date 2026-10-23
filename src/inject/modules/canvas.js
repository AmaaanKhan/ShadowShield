/**
 * src/inject/modules/canvas.js
 *
 * Hooks Canvas.toDataURL (§1 of the original injection.js).
 * Reports detection; does not alter the returned value.
 */

import { hookMethod } from "../core/hook.js";

/** @type {import("../index.js").Module} */
export const canvas = {
    id: "canvas",
    category: "Canvas",
    description: "Hooks HTMLCanvasElement.prototype.toDataURL to detect canvas fingerprinting.",

    install(ctx) {
        hookMethod(
            HTMLCanvasElement.prototype,
            "toDataURL",
            (original) => function (...args) {
                ctx.report("Canvas.toDataURL", "Canvas");
                return original.apply(this, args);
            }
        );
    }
};
