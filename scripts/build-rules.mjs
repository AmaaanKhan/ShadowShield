#!/usr/bin/env node
// Builds the blocking rules from the EasyPrivacy and EasyList filter lists.
//
//   npm run build:rules                              both lists, downloaded
//   npm run build:rules -- --only ads                just EasyList
//   npm run build:rules -- --only ads --input f.txt  use a file you already have
//   npm run build:rules -- --max-rules 10000         smaller budget per list
//
// Output (in src/blocking/rules/):
//   trackers.json + trackers.meta.json   from EasyPrivacy
//   ads.json      + ads.meta.json        from EasyList

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertList, validateRules, readListHeader } from "./lib/abp-to-dnr.mjs";

// Chrome and Firefox only guarantee 30,000 static rules per extension in
// total, across every list. Two lists share that, so each gets half
// (minus a little headroom).
const SHARED_RULE_LIMIT = 30000;
const DEFAULT_MAX_RULES_PER_LIST = 14500;

const LISTS = {
  trackers: {
    name: "EasyPrivacy",
    url: "https://easylist.to/easylist/easyprivacy.txt",
    titlePattern: /^EasyPrivacy$/i,
    cacheFile: "easyprivacy.txt"
  },
  ads: {
    name: "EasyList",
    url: "https://easylist.to/easylist/easylist.txt",
    titlePattern: /^EasyList$/i,
    cacheFile: "easylist.txt"
  }
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "src", "blocking", "rules");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { only: null, input: null, maxRules: DEFAULT_MAX_RULES_PER_LIST };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--only") args.only = argv[++i];
    else if (argv[i] === "--input") args.input = argv[++i];
    else if (argv[i] === "--max-rules") args.maxRules = Number(argv[++i]);
    else fail(`Unknown argument: ${argv[i]}`);
  }
  if (args.only && !LISTS[args.only]) {
    fail(`--only must be one of: ${Object.keys(LISTS).join(", ")}`);
  }
  if (args.input && !args.only) {
    fail("--input needs --only trackers or --only ads, so we know which list the file is.");
  }
  if (!Number.isInteger(args.maxRules) || args.maxRules < 1000) {
    fail("--max-rules must be a whole number of at least 1000");
  }
  return args;
}

async function loadList(id, input) {
  const list = LISTS[id];
  if (input) {
    console.log(`[${id}] Reading ${input}`);
    return readFile(input, "utf8");
  }
  console.log(`[${id}] Downloading ${list.url}`);
  let response;
  try {
    response = await fetch(list.url);
  } catch (err) {
    fail(`Download failed: ${err.message}\n` +
      "Check your internet connection, or download the file in a browser and " +
      `pass it with --only ${id} --input path/to/${list.cacheFile}`);
  }
  if (!response.ok) fail(`Download failed: HTTP ${response.status}`);
  const text = await response.text();
  const cache = path.join(root, "scripts", "lists", list.cacheFile);
  await mkdir(path.dirname(cache), { recursive: true });
  await writeFile(cache, text);
  return text;
}

async function buildOne(id, args) {
  const list = LISTS[id];
  const text = await loadList(id, args.input);
  const header = readListHeader(text);

  if (!list.titlePattern.test(header.title ?? "")) {
    fail(`[${id}] This does not look like the ${list.name} list ` +
      `(its '! Title:' line says "${header.title ?? "missing"}"). Nothing was written.`);
  }

  const { rules, stats } = convertList(text, { maxRules: args.maxRules });
  const problems = validateRules(rules, { maxRules: args.maxRules });
  if (problems.length) {
    console.error(`[${id}] Generated rules are invalid (${problems.length} problems):`);
    problems.slice(0, 20).forEach((p) => console.error("  " + p));
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, `${id}.json`), JSON.stringify(rules));

  const meta = {
    name: header.title,
    ruleset: id,
    listVersion: header.version ?? null,
    listLastModified: header["last modified"] ?? null,
    source: list.url,
    license: "GPL-3.0-or-later OR CC-BY-SA-3.0-or-later",
    attribution: "The EasyList authors (https://easylist.to/)",
    builtAt: new Date().toISOString(),
    rules: stats.rules,
    blockRules: stats.blockRules,
    allowRules: stats.allowRules,
    blockedDomains: stats.blockedDomains
  };
  await writeFile(path.join(outDir, `${id}.meta.json`), JSON.stringify(meta, null, 2) + "\n");

  const skippedTotal = Object.values(stats.skipped).reduce((a, b) => a + b, 0);
  console.log(`
[${id}] ${header.title} ${header.version ?? ""}
  Lines read:      ${stats.lines}
  Rules written:   ${stats.rules} (${stats.blockRules} block, ${stats.allowRules} allow) of ${args.maxRules} allowed
  Domains blocked: ${stats.blockedDomains} (merged into ${stats.blockRules - stats.urlFilterBlockRules} rules)
  URL patterns:    ${stats.urlFilterBlockRules}
  Not converted:   ${skippedTotal} (cosmetic filters are expected)
  Dropped (over budget): ${stats.droppedForBudget}
  Skipped by reason: ${JSON.stringify(stats.skipped)}
  Wrote src/blocking/rules/${id}.json and ${id}.meta.json`);
}

async function checkSharedBudget() {
  let total = 0;
  const parts = [];
  for (const id of Object.keys(LISTS)) {
    try {
      const meta = JSON.parse(await readFile(path.join(outDir, `${id}.meta.json`), "utf8"));
      total += meta.rules;
      parts.push(`${id} ${meta.rules}`);
    } catch (e) {
      // list not built yet
    }
  }
  console.log(`\nStatic rules in the extension: ${total} (${parts.join(" + ")}) of ${SHARED_RULE_LIMIT} guaranteed.`);
  if (total > SHARED_RULE_LIMIT) {
    fail("Over the limit: Chrome may refuse to enable a list. Re-run with a lower --max-rules.");
  }
}

const args = parseArgs(process.argv.slice(2));
for (const id of args.only ? [args.only] : Object.keys(LISTS)) {
  await buildOne(id, args);
}
await checkSharedBudget();
