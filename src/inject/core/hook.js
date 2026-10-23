/**
 * src/inject/core/hook.js
 *
 * Central registry for all browser-API overrides in the inject layer.
 *
 * Phase 0.2 goal: every Object.defineProperty call that intercepts a
 * browser API must go through hookMethod() or hookGetter() so that
 * future phases can add stealthiness, logging, and reversibility in
 * one place without touching each module.
 *
 * Current behaviour is intentionally identical to what each module did
 * inline before the refactor. Phase 1 will make these wrappers stealth
 * (e.g. preserving native toString, using a Proxy, etc.).
 *
 * Known issues (planned Phase 1 fixes):
 *   - Hooks are not stealth: wrapped functions fail the native-function
 *     toString check.
 *   - There is no central undo / teardown mechanism yet.
 */

import { warn } from "./debug.js";

/**
 * Replace a method on `target` with a new function produced by `makeWrapper`.
 *
 * @param {object}   target       - The prototype or object to patch.
 * @param {string}   name         - The property name to replace.
 * @param {Function} makeWrapper  - Called with the original function; must
 *                                  return the replacement function.
 *
 * The replacement is written with the same descriptor flags that were
 * already on the property (configurable + writable = true by default for
 * prototype methods).
 */
export function hookMethod(target, name, makeWrapper) {
    const original = target[name];

    if (typeof original !== "function") {
        warn("hookMethod: not a function —", name);
        return;
    }

    const replacement = makeWrapper(original);

    Object.defineProperty(target, name, {
        value: replacement,
        configurable: true,
        writable: true,
        enumerable: false
    });
}

/**
 * Replace a getter on `target` with a new getter produced by `makeWrapper`.
 *
 * @param {object}   target       - The prototype or object to patch.
 * @param {string}   prop         - The property name whose getter to replace.
 * @param {Function} makeWrapper  - Called with the original getter (or undefined
 *                                  if none); must return the replacement getter.
 *
 * Preserves the existing descriptor's set, enumerable, and configurable flags.
 * If the property is not configurable, logs a warning and skips.
 */
export function hookGetter(target, prop, makeWrapper) {
    const descriptor = Object.getOwnPropertyDescriptor(target, prop);

    if (descriptor && !descriptor.configurable) {
        warn("hookGetter: property is not configurable —", prop);
        return;
    }

    const originalGetter = descriptor && descriptor.get;
    const newDescriptor = {
        ...(descriptor || {}),
        get: makeWrapper(originalGetter),
        configurable: true,
        enumerable: descriptor ? descriptor.enumerable : false
    };

    // Remove value/writable if we're installing a getter.
    delete newDescriptor.value;
    delete newDescriptor.writable;

    Object.defineProperty(target, prop, newDescriptor);
}
