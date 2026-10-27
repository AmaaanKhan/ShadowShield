/**
 * src/blocking/background.js
 *
 * Tracker and ad blocking, background side.
 *
 * The browser does the blocking itself, using the rules in rules/trackers.json
 * (EasyPrivacy) and rules/ads.json (EasyList) through declarativeNetRequest.
 * This script only applies what the user chose in the popup:
 *   - trackers on/off  -> enable or disable the "trackers" ruleset
 *   - ads on/off       -> enable or disable the "ads" ruleset
 *   - site switched off -> a dynamic rule that lets everything through there
 *
 * It keeps nothing in memory between wake-ups: settings live in storage.local,
 * and every change goes through one queue so changes never interleave.
 *
 * Trust rule: settings change only on messages from this extension's own pages
 * (the popup), never from a content script or a web page.
 */

import {
    STORAGE_KEY,
    applyChange,
    normalizeSettings,
    rulesetChanges,
    siteAllowRules
} from "./settings.js";

const extensionAPI =
    typeof browser !== "undefined" ? browser : chrome;
const dnr = extensionAPI.declarativeNetRequest;

const MESSAGE_TO_CHANGE = {
    "blocking:set-trackers": "set-trackers",
    "blocking:set-ads": "set-ads",
    "blocking:set-site-protected": "set-site-protected"
};

let queue = Promise.resolve();

/** Run `task` after all earlier tasks. The caller sees its result or error. */
function enqueue(task) {
    const run = queue.then(task);
    queue = run.catch(() => {});
    return run;
}

async function loadSettings() {
    const stored = await extensionAPI.storage.local.get({ [STORAGE_KEY]: null });
    return normalizeSettings(stored[STORAGE_KEY]);
}

async function applyRulesets(settings) {
    const enabled = await dnr.getEnabledRulesets();
    const { enable, disable } = rulesetChanges(settings, enabled);
    if (enable.length || disable.length) {
        await dnr.updateEnabledRulesets({
            enableRulesetIds: enable,
            disableRulesetIds: disable
        });
    }
}

async function applySiteRules(settings) {
    const existing = await dnr.getDynamicRules();
    await dnr.updateDynamicRules({
        removeRuleIds: existing.map((rule) => rule.id),
        addRules: siteAllowRules(settings.allowedSites)
    });
}

async function reconcile() {
    const settings = await loadSettings();
    await applyRulesets(settings);
    await applySiteRules(settings);
}

async function showCountOnToolbarIcon() {
    // Chromium can show the number of blocked requests on the toolbar icon.
    // Firefox does not offer this, so a missing function is fine.
    if (typeof dnr.setExtensionActionOptions !== "function") return;
    try {
        await dnr.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
    } catch {
        // not supported here
    }
}

async function handle(message) {
    const settings = await loadSettings();
    if (message.type === "blocking:get-state") return settings;

    const result = applyChange(settings, {
        type: MESSAGE_TO_CHANGE[message.type],
        value: message.value,
        host: message.host
    });
    if (result.error) throw new Error(result.error);

    // Apply first, save second: if the browser refuses, storage still matches it.
    await applyRulesets(result.settings);
    await applySiteRules(result.settings);
    await extensionAPI.storage.local.set({ [STORAGE_KEY]: result.settings });
    return result.settings;
}

function isExtensionPage(sender) {
    return sender.id === extensionAPI.runtime.id &&
        typeof sender.url === "string" &&
        sender.url.startsWith(extensionAPI.runtime.getURL(""));
}

extensionAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") return false;
    const known = message.type === "blocking:get-state" ||
        Object.prototype.hasOwnProperty.call(MESSAGE_TO_CHANGE, message.type);
    if (!known || !isExtensionPage(sender)) return false;

    enqueue(() => handle(message)).then(
        (settings) => sendResponse({ ok: true, settings }),
        (error) => sendResponse({
            ok: false,
            error: error && error.message ? error.message : "Could not apply that change."
        })
    );
    return true; // the response is sent asynchronously
});

extensionAPI.runtime.onInstalled.addListener(() => {
    enqueue(reconcile).catch((error) =>
        console.error("ShadowShield blocking: setup failed.", error));
    showCountOnToolbarIcon();
});

extensionAPI.runtime.onStartup.addListener(() => {
    enqueue(reconcile).catch((error) =>
        console.error("ShadowShield blocking: startup failed.", error));
    showCountOnToolbarIcon();
});
