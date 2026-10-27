import test from "node:test";
import assert from "node:assert/strict";

import {
    ALLOW_RULE_ID_START,
    MAX_ALLOWED_SITES,
    applyChange,
    countBlocked,
    hostFromUrl,
    normalizeHost,
    normalizeSettings,
    rulesetChanges,
    siteAllowRules
} from "../../src/blocking/settings.js";

test("blocking defaults to on for missing or corrupt storage", () => {
    const expected = { trackers: true, ads: true, allowedSites: [] };
    assert.deepEqual(normalizeSettings(undefined), expected);
    assert.deepEqual(normalizeSettings(null), expected);
    assert.deepEqual(normalizeSettings("yes"), expected);
    assert.deepEqual(normalizeSettings({ trackers: "no", allowedSites: 5 }), expected);
    assert.equal(normalizeSettings({ ads: false }).ads, false);
});

test("hosts are normalised and junk is rejected", () => {
    assert.equal(normalizeHost("WWW.Example.COM"), "example.com");
    assert.equal(normalizeHost("localhost"), "localhost");
    assert.equal(normalizeHost("127.0.0.1"), "127.0.0.1");
    for (const bad of ["", " ", "a b.com", "exa/mple.com", "-bad.com", "[::1]", 42, null]) {
        assert.equal(normalizeHost(bad), null, String(bad));
    }
});

test("only http and https pages have a host", () => {
    assert.equal(hostFromUrl("https://www.news.example/path?q=1"), "news.example");
    assert.equal(hostFromUrl("http://127.0.0.1:8000/"), "127.0.0.1");
    assert.equal(hostFromUrl("about:debugging"), null);
    assert.equal(hostFromUrl("moz-extension://abc/popup.html"), null);
    assert.equal(hostFromUrl("not a url"), null);
});

test("stored site lists are cleaned, sorted, deduplicated and capped", () => {
    const messy = ["B.com", "a.com", "www.a.com", "bad host", 7];
    assert.deepEqual(normalizeSettings({ allowedSites: messy }).allowedSites, ["a.com", "b.com"]);

    const many = Array.from({ length: MAX_ALLOWED_SITES + 20 }, (_, i) => `site${i}.test`);
    assert.equal(normalizeSettings({ allowedSites: many }).allowedSites.length, MAX_ALLOWED_SITES);
});

test("switches change one thing at a time and never edit the input", () => {
    const start = Object.freeze({ trackers: true, ads: true, allowedSites: Object.freeze([]) });

    const noAds = applyChange(start, { type: "set-ads", value: false });
    assert.deepEqual(noAds.settings, { trackers: true, ads: false, allowedSites: [] });
    assert.equal(noAds.error, null);

    const noTrackers = applyChange(noAds.settings, { type: "set-trackers", value: false });
    assert.deepEqual(noTrackers.settings, { trackers: false, ads: false, allowedSites: [] });

    // a non-boolean must not accidentally turn blocking on or off
    assert.equal(applyChange(start, { type: "set-ads", value: "false" }).settings.ads, false);
});

test("switching a site off and on again", () => {
    const off = applyChange(undefined, {
        type: "set-site-protected", host: "www.News.test", value: false
    });
    assert.deepEqual(off.settings.allowedSites, ["news.test"]);

    const on = applyChange(off.settings, {
        type: "set-site-protected", host: "news.test", value: true
    });
    assert.deepEqual(on.settings.allowedSites, []);
});

test("bad changes are reported, not applied", () => {
    assert.ok(applyChange(undefined, { type: "set-site-protected", host: "", value: false }).error);
    assert.ok(applyChange(undefined, { type: "nonsense" }).error);
    assert.ok(applyChange(undefined, null).error);

    const full = {
        allowedSites: Array.from({ length: MAX_ALLOWED_SITES }, (_, i) => `site${i}.test`)
    };
    const result = applyChange(full, { type: "set-site-protected", host: "extra.test", value: false });
    assert.ok(result.error);
    assert.ok(!result.settings.allowedSites.includes("extra.test"));
});

test("rulesets are switched only when they differ from the settings", () => {
    const bothOn = normalizeSettings(undefined);
    assert.deepEqual(rulesetChanges(bothOn, ["trackers", "ads"]), { enable: [], disable: [] });
    assert.deepEqual(rulesetChanges(bothOn, []), { enable: ["trackers", "ads"], disable: [] });

    const adsOff = normalizeSettings({ ads: false });
    assert.deepEqual(rulesetChanges(adsOff, ["trackers", "ads"]), { enable: [], disable: ["ads"] });
});

test("a switched-off site becomes one allow-everything rule", () => {
    const rules = siteAllowRules(["a.test", "b.test"]);
    assert.equal(rules.length, 2);
    assert.deepEqual(rules[0], {
        id: 1,
        priority: 100,
        action: { type: "allowAllRequests" },
        condition: { requestDomains: ["a.test"], resourceTypes: ["main_frame"] }
    });
    assert.equal(rules[1].id, 2);
    assert.deepEqual(siteAllowRules([]), []);
});

test("blocked counts ignore exception rules and unknown lists", () => {
    const matches = [
        { rule: { rulesetId: "trackers", ruleId: 5 } },
        { rule: { rulesetId: "trackers", ruleId: 6 } },
        { rule: { rulesetId: "ads", ruleId: 9 } },
        { rule: { rulesetId: "ads", ruleId: ALLOW_RULE_ID_START + 1 } },
        { rule: { rulesetId: "_dynamic", ruleId: 1 } },
        null
    ];
    assert.deepEqual(countBlocked(matches), { trackers: 2, ads: 1 });
    assert.deepEqual(countBlocked(undefined), { trackers: 0, ads: 0 });
});
