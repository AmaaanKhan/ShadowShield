/**
 * src/inject/index.js  — ShadowShield inject bootstrap
 *
 * Entry point compiled into dist/injection.js (IIFE, MAIN world).
 *
 * Responsibilities:
 *   1. Import core utilities and the shared profile.
 *   2. Build the module context (ctx) passed to every module.
 *   3. Iterate the ordered module registry and call install(ctx) for each
 *      one inside an individual try/catch so a failing module cannot stop
 *      the others from loading.
 *
 * AGENTS.md rules applied here:
 *   - All console.* gated behind debug helpers (rule 3).
 *   - Every hook goes through core/hook.js (rule 2).
 *   - No imports from other module boundaries (rule 1).
 */

"use strict";

import { hookMethod, hookGetter } from "./core/hook.js";
import { reportDetection }        from "./core/report.js";
import * as debug                 from "./core/debug.js";
import { shadowShieldProfile }    from "../shared/profiles.js";
import { registry }               from "./modules/index.js";

/**
 * @typedef {{
 *   hook:    { hookMethod: typeof hookMethod, hookGetter: typeof hookGetter },
 *   report:  typeof reportDetection,
 *   profile: typeof shadowShieldProfile,
 *   debug:   typeof debug
 * }} ModuleContext
 *
 * @typedef {{
 *   id:          string,
 *   category:    string,
 *   description: string,
 *   install:     (ctx: ModuleContext) => void
 * }} Module
 */

debug.log("ShadowShield injection layer active.");

/** @type {ModuleContext} */
const ctx = {
    hook:    { hookMethod, hookGetter },
    report:  reportDetection,
    profile: shadowShieldProfile,
    debug
};

for (const mod of registry) {
    try {
        mod.install(ctx);
        debug.log(`module "${mod.id}" installed.`);
    } catch (err) {
        debug.warn(`module "${mod.id}" failed to install:`, err);
    }
}