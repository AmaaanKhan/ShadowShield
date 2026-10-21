#!/usr/bin/env node
// Builds extension/rules/trackers.json from the EasyPrivacy filter list.
//
//   npm run build:rules                       download the latest list
//   npm run build:rules -- --input file.txt   use a list you already have
//   npm run build:rules -- --max-rules 20000  use a smaller rule budget

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  convertList, validateRules, readListHeader, DEFAULT_MAX_RULES
} from "./lib/abp-to-dnr.mjs";

const SOURCE_URL = "https://easylist.to/easylist/easyprivacy.txt";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "extension", "rules");
const cacheFile = path.join(root, "tools", "lists", "easyprivacy.txt");

function parseArgs(argv) {
  const args = { input: null, maxRules: DEFAULT_MAX_RULES };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input") args.input = argv[++i];
    else if (argv[i] === "--max-rules") args.maxRules = Number(argv[++i]);
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(1);
    }
  }
  if (!Number.isInteger(args.maxRules) || args.maxRules < 1000) {
    console.error("--max-rules must be a whole number of at least 1000");
    process.exit(1);
  }
  return args;
}

async function loadList(input) {
  if (input) {
    console.log(`Reading ${input}`);
    return readFile(input, "utf8");
  }
  console.log(`Downloading ${SOURCE_URL}`);
  let response;
  try {
    response = await fetch(SOURCE_URL);
  } catch (err) {
    console.error(`Download failed: ${err.message}`);
    console.error("Check your internet connection, or download the file in a " +
      "browser and pass it with --input path/to/easyprivacy.txt");
    process.exit(1);
  }
  if (!response.ok) {
    console.error(`Download failed: HTTP ${response.status}`);
    process.exit(1);
  }
  const text = await response.text();
  await mkdir(path.dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, text);
  return text;
}

const args = parseArgs(process.argv.slice(2));
const text = await loadList(args.input);
const header = readListHeader(text);

if (!/EasyPrivacy/i.test(header.title ?? "")) {
  console.error("This does not look like the EasyPrivacy list " +
    "(missing '! Title: EasyPrivacy' header). Nothing was written.");
  process.exit(1);
}

const { rules, stats } = convertList(text, { maxRules: args.maxRules });
const problems = validateRules(rules, { maxRules: args.maxRules });
if (problems.length) {
  console.error(`Generated rules are invalid (${problems.length} problems):`);
  problems.slice(0, 20).forEach((p) => console.error("  " + p));
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "trackers.json"), JSON.stringify(rules));

const meta = {
  name: header.title,
  listVersion: header.version ?? null,
  listLastModified: header["last modified"] ?? null,
  source: SOURCE_URL,
  license: "GPL-3.0-or-later OR CC-BY-SA-3.0-or-later",
  attribution: "The EasyList authors (https://easylist.to/)",
  builtAt: new Date().toISOString(),
  rules: stats.rules,
  blockRules: stats.blockRules,
  allowRules: stats.allowRules,
  blockedDomains: stats.blockedDomains
};
await writeFile(
  path.join(outDir, "trackers.meta.json"), JSON.stringify(meta, null, 2) + "\n");

const skippedTotal = Object.values(stats.skipped).reduce((a, b) => a + b, 0);
console.log(`
List:            ${header.title} ${header.version ?? ""}
Lines read:      ${stats.lines}
Rules written:   ${stats.rules} (${stats.blockRules} block, ${stats.allowRules} allow) of ${args.maxRules} allowed
Domains blocked: ${stats.blockedDomains} (merged into ${stats.blockRules - stats.urlFilterBlockRules} rules)
URL patterns:    ${stats.urlFilterBlockRules}
Not converted:   ${skippedTotal} (cosmetic filters are expected; see below)
Dropped (over budget): ${stats.droppedForBudget}
Skipped by reason: ${JSON.stringify(stats.skipped)}
`);
console.log("Wrote extension/rules/trackers.json and trackers.meta.json");
