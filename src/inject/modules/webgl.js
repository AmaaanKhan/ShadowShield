/**
 * src/inject/modules/webgl.js
 *
 * Hooks Canvas.getContext for WebGL variants and installs per-instance
 * getExtension / getParameter hooks on each returned context (§2 of the
 * original injection.js).
 *
 * Known issue (planned Phase 1 fix): hooks are installed on every new
 * WebGL context instance rather than on the shared prototype, because the
 * original code used a WeakSet guard. Phase 1 should migrate to
 * WebGLRenderingContext.prototype once the stealth story is clear.
 */

import { hookMethod } from "../core/hook.js";
import { reportDetection } from "../core/report.js";

/** @type {import("../index.js").Module} */
export const webgl = {
    id: "webgl",
    category: "WebGL",
    description: "Hooks getContext (WebGL variants) and per-instance getExtension/getParameter.",

    install(ctx) {
        // Per-instance WebGL hooks — same WeakSet guard as original.
        const hookedWebGLContexts = new WeakSet();

        function installWebGLHooks(gl) {
            if (hookedWebGLContexts.has(gl)) return;
            hookedWebGLContexts.add(gl);

            hookMethod(gl, "getExtension", (orig) => function (...args) {
                ctx.report("WebGL.getExtension", "WebGL");
                return orig.apply(this, args);
            });

            hookMethod(gl, "getParameter", (orig) => function (...args) {
                ctx.report("WebGL.getParameter", "WebGL");
                return orig.apply(this, args);
            });
        }

        // Wrap getContext on the prototype.
        hookMethod(
            HTMLCanvasElement.prototype,
            "getContext",
            (original) => function (...args) {
                const context = original.apply(this, args);

                if (
                    context &&
                    (
                        args[0] === "webgl" ||
                        args[0] === "webgl2" ||
                        args[0] === "experimental-webgl"
                    )
                ) {
                    ctx.report(`Canvas.getContext(${args[0]})`, "WebGL");
                    installWebGLHooks(context);
                }

                return context;
            }
        );
    }
};
