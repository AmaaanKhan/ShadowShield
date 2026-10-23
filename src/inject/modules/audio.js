/**
 * src/inject/modules/audio.js
 *
 * Hooks AudioContext.prototype.createAnalyser to detect audio
 * fingerprinting (§9 of the original injection.js).
 *
 * Uses the same retry interval as the original in case AudioContext is
 * not yet available at document_start.
 */

import { hookMethod } from "../core/hook.js";

/** @type {import("../index.js").Module} */
export const audio = {
    id: "audio",
    category: "Audio",
    description: "Hooks AudioContext.prototype.createAnalyser to detect audio fingerprinting.",

    install(ctx) {
        function installAudioHook() {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass || !AudioContextClass.prototype) {
                return false;
            }

            const proto = AudioContextClass.prototype;

            if (
                proto.createAnalyser &&
                proto.createAnalyser.__shadowShieldHooked
            ) {
                return true; // already installed
            }

            hookMethod(proto, "createAnalyser", (original) => {
                const hooked = function (...args) {
                    ctx.report("AudioContext.createAnalyser", "Audio");
                    return original.apply(this, args);
                };
                hooked.__shadowShieldHooked = true;
                return hooked;
            });

            ctx.debug.log("audio: audio hook installed.");
            return true;
        }

        if (!installAudioHook()) {
            let attempts = 0;

            const interval = setInterval(() => {
                attempts++;

                if (installAudioHook() || attempts >= 50) {
                    clearInterval(interval);

                    if (attempts >= 50) {
                        ctx.debug.warn(
                            "audio: AudioContext hook could not be installed."
                        );
                    }
                }
            }, 100);
        }
    }
};
