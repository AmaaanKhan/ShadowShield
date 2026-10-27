import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertList, validateRules } from "../../scripts/lib/abp-to-dnr.mjs";
import { evaluate, isBlocked } from "../../scripts/lib/dnr-matcher.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(path.join(here, "fixtures/blocking-sample-list.txt"), "utf8");
const { rules, stats } = convertList(sample);

const req = (url, type = "script", initiator = "https://site.test") =>
    ({ url, type, initiator });

test("generated rules pass validation", () => {
    assert.deepEqual(validateRules(rules), []);
});

test("plain domain rules are merged into one rule", () => {
    const domainRules = rules.filter(
        (r) => r.action.type === "block" && r.condition.requestDomains &&
               !r.condition.domainType);
    assert.equal(domainRules.length, 1);
    assert.ok(domainRules[0].condition.requestDomains.includes("tracker-one.test"));
});

test("third-party domain rules are merged and subdomains deduplicated", () => {
    const merged = rules.find((r) => r.condition.domainType === "thirdParty" &&
                                     r.condition.requestDomains);
    assert.deepEqual(merged.condition.requestDomains,
        ["tracker-three.test", "tracker-two.test"]);
    assert.equal(stats.dedupedSubdomains, 1);
});

test("blocks trackers and their subdomains", () => {
    assert.ok(isBlocked(rules, req("https://tracker-one.test/a.js")));
    assert.ok(isBlocked(rules, req("https://cdn.tracker-one.test/a.js")));
    assert.ok(!isBlocked(rules, req("https://not-tracker-one.test/a.js")));
});

test("third-party only rules leave same-site requests alone", () => {
    assert.ok(isBlocked(rules, req("https://tracker-two.test/x", "script", "https://site.test")));
    assert.ok(!isBlocked(rules, req("https://tracker-two.test/x", "script", "https://tracker-two.test")));
});

test("resource types are respected", () => {
    const url = "https://analytics.test/collect.js";
    assert.ok(isBlocked(rules, req(url, "script")));
    assert.ok(!isBlocked(rules, req(url, "image")));
});

test("domain= option limits and excludes pages", () => {
    const url = "https://pixel.test/hit";
    assert.ok(isBlocked(rules, req(url, "image", "https://news.test")));
    assert.ok(!isBlocked(rules, req(url, "image", "https://safe.news.test")));
    assert.ok(!isBlocked(rules, req(url, "image", "https://other.test")));
});

test("URL patterns match anywhere", () => {
    assert.ok(isBlocked(rules, req("https://x.test/a/beacon.gif?id=1", "image")));
    assert.ok(isBlocked(rules, req("https://x.test/a?x=1&event=pageview&b=1", "xmlhttprequest")));
});

test("exception rules beat block rules", () => {
    assert.ok(isBlocked(rules, req("https://tracker-one.test/other.js")));
    assert.equal(evaluate(rules, req("https://tracker-one.test/allowed.js"))?.action, "allow");
});

test("$important rules handle exceptions correctly", () => {
    const importantBlock = convertList([
        "||tracker.test/path^$important",
        "@@||tracker.test/path^"
    ].join("\n")).rules;

    assert.equal(
        evaluate(importantBlock, req("https://tracker.test/path", "script"))?.action,
        "block"
    );

    const importantException = convertList([
        "||tracker.test/path^$important",
        "@@||tracker.test/path^$important"
    ].join("\n")).rules;

    assert.equal(
        evaluate(importantException, req("https://tracker.test/path", "script"))?.action,
        "allow"
    );
});

test("$document exceptions become allowAllRequests on main_frame", () => {
    const r = rules.find((x) => x.action.type === "allowAllRequests");
    assert.deepEqual(r.condition.resourceTypes, ["main_frame"]);
});

test("unsupported filters are skipped and counted, not mangled", () => {
    assert.equal(stats.skipped.cosmetic, 2);
    assert.equal(stats.skipped.regex, 1);
    assert.equal(stats.skipped["unsupported-option"], 1);
    assert.equal(stats.skipped["non-ascii"], 1);
    assert.ok(!isBlocked(rules, req("https://redirect.test/x.js")));
});

test("$badfilter cancels the matching rule", () => {
    assert.ok(!isBlocked(rules, req("https://gone.test/a.js")));
});

test("no block rule ever applies to top-level pages", () => {
    for (const r of rules.filter((x) => x.action.type === "block")) {
        assert.ok(!(r.condition.resourceTypes ?? []).includes("main_frame"));
    }
    assert.ok(!isBlocked(rules, req("https://tracker-one.test/", "main_frame", null)));
});

test("rule budget keeps exceptions and drops the least specific blocks", () => {
    const small = convertList(sample, { maxRules: 5 });
    assert.equal(small.rules.length, 5);
    assert.ok(small.rules.some((r) => r.action.type === "allowAllRequests"));
    assert.ok(small.stats.droppedForBudget > 0);
});

// Runs only when the real rules have been generated (npm run build:rules).
const builtPath = path.join(here, "../../src/blocking/rules/trackers.json");
test("built rules file: valid, and blocks well-known trackers only", { skip: !existsSync(builtPath) }, () => {
    const built = JSON.parse(readFileSync(builtPath, "utf8"));
    assert.deepEqual(validateRules(built), []);
    const page = "https://news.example.org";
    for (const url of [
        "https://www.google-analytics.com/analytics.js",
        "https://static.hotjar.com/c/hotjar-1.js",
        "https://bat.bing.com/bat.js"
    ]) {
        assert.ok(isBlocked(built, req(url, "script", page)), url);
    }
    for (const url of [
        "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js",
        "https://fonts.googleapis.com/css?family=Roboto",
        "https://www.example.org/app.js"
    ]) {
        assert.ok(!isBlocked(built, req(url, "script", page)), url);
    }
});

// Runs only when the ad rules have been generated (npm run build:rules).
const adsPath = path.join(here, "../../src/blocking/rules/ads.json");
test("built ads file: valid, blocks ad networks, leaves normal sites alone", { skip: !existsSync(adsPath) }, () => {
    const ads = JSON.parse(readFileSync(adsPath, "utf8"));
    assert.deepEqual(validateRules(ads, { maxRules: 14500 }), []);
    const page = "https://news.example.org";
    for (const url of [
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
        "https://c.amazon-adsystem.com/aax2/apstag.js"
    ]) {
        assert.ok(isBlocked(ads, req(url, "script", page)), url);
    }
    for (const url of [
        "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js",
        "https://fonts.googleapis.com/css?family=Roboto",
        "https://www.example.org/app.js"
    ]) {
        assert.ok(!isBlocked(ads, req(url, "script", page)), url);
    }
});

test("trackers and ads together stay inside the shared 30,000 rule limit", { skip: !existsSync(adsPath) || !existsSync(builtPath) }, () => {
    const trackers = JSON.parse(readFileSync(builtPath, "utf8"));
    const ads = JSON.parse(readFileSync(adsPath, "utf8"));
    assert.ok(trackers.length + ads.length <= 30000, `${trackers.length + ads.length} rules`);
});
