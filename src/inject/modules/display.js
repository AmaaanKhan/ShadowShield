/**
 * src/inject/modules/display.js
 *
 * Hooks Window.prototype.devicePixelRatio to detect display-DPI
 * fingerprinting (§6 of the original injection.js).
 *
 * No spoofing — detection only.
 */

import { hookGetter } from "../core/hook.js";

/** @type {import("../index.js").Module} */
export const display = {
    id: "display",
    category: "Display",
    description: "Hooks Window.prototype.devicePixelRatio (detection only).",

    install(ctx) {
        const descriptor = Object.getOwnPropertyDescriptor(
            Window.prototype,
            "devicePixelRatio"
        );

        if (!descriptor || !descriptor.get || !descriptor.configurable) {
            ctx.debug.warn("display: Cannot hook devicePixelRatio.");
            return;
        }

        const originalGetter = descriptor.get;

        hookGetter(Window.prototype, "devicePixelRatio", () => function () {
            ctx.report("Display pixel ratio", "Display");
            return originalGetter.call(this);
        });
    }
};
