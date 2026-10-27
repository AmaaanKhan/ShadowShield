#!/usr/bin/env node
// Ask "would ShadowShield block this request?" using the generated rules.
//   npm run check-url -- https://www.google-analytics.com/analytics.js
//   npm run check-url -- <url> --type script --from https://news.example.com

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "./lib/dnr-matcher.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

if (!url) {
  console.error("Usage: npm run check-url -- <url> [--type script] [--from https://page.example]");
  process.exit(1);
}

const rules = [];
for (const name of ["trackers", "ads"]) {
  const list = JSON.parse(
    await readFile(path.join(root, "src", "blocking", "rules", `${name}.json`), "utf8"));
  // The two lists are separate rulesets in the browser; tag each rule so we can say which.
  for (const rule of list) rules.push({ ...rule, ruleset: name });
}
const request = {
  url,
  type: flag("--type", "script"),
  initiator: flag("--from", "https://example-news-site.test")
};
const result = evaluate(rules, request);

console.log(`${request.type} request to ${url}`);
console.log(`from page ${request.initiator}`);
if (!result) console.log("=> not matched by any rule (allowed)");
else {
  console.log(`=> ${result.action.toUpperCase()} by ${result.rule.ruleset} rule ${result.rule.id}`);
  const c = result.rule.condition;
  console.log(c.urlFilter ? `   pattern: ${c.urlFilter}`
    : `   domain list rule (${c.requestDomains.length} domains)`);
}
console.log("(Approximate check. The browser is the final authority.)");
