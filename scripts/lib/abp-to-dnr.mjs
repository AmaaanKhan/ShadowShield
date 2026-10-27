// Converts an Adblock Plus style filter list (EasyPrivacy) into
// declarativeNetRequest (DNR) rules that Chrome and Firefox can enforce.
//
// Only network filters are converted. Cosmetic filters (##) and rules that
// need features DNR does not have (regex, redirect, removeparam, ...) are
// skipped and counted in the returned stats so nothing is lost silently.

export const BLOCK_PRIORITY = 1;
export const ALLOW_PRIORITY = 2;
export const IMPORTANT_PRIORITY = 3;

export const DEFAULT_MAX_RULES = 30000; // guaranteed per extension in Chrome
export const DEFAULT_BLOCK_ID_START = 1;
// Exception rules get ids from here up. src/blocking/settings.js relies on this
// to tell "blocked" matches from "allowed" ones when counting.
export const DEFAULT_ALLOW_ID_START = 100000;

// Resource types a rule may apply to. main_frame is deliberately left out:
// blocking top-level navigations would break browsing.
const ALL_SUBRESOURCE_TYPES = [
  "sub_frame", "stylesheet", "script", "image", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other"
];

const TYPE_ALIASES = {
  script: "script",
  image: "image",
  stylesheet: "stylesheet",
  css: "stylesheet",
  xmlhttprequest: "xmlhttprequest",
  xhr: "xmlhttprequest",
  subdocument: "sub_frame",
  frame: "sub_frame",
  ping: "ping",
  media: "media",
  font: "font",
  object: "object",
  websocket: "websocket",
  other: "other"
};

const DOCUMENT_OPTIONS = new Set(["document", "doc"]);

const IGNORED_FLAGS = new Set([]);

const HOSTNAME_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const OPTIONS_RE =
  /^~?[a-z0-9_-]+(?:=[^,]*)?(?:,~?[a-z0-9_-]+(?:=[^,]*)?)*$/i;

function skip(reason) {
  return { skip: reason };
}

function isAscii(s) {
  return /^[\x21-\x7e]+$/.test(s); // printable ASCII, no spaces
}

function parseDomainList(value) {
  const include = [];
  const exclude = [];
  for (const raw of value.split("|")) {
    const entry = raw.trim().toLowerCase();
    if (!entry) continue;
    const negated = entry.startsWith("~");
    const host = negated ? entry.slice(1) : entry;
    if (!HOSTNAME_RE.test(host)) return null; // entities (google.*), regex...
    (negated ? exclude : include).push(host);
  }
  return { include, exclude };
}

function parseOptions(optionText) {
  const out = {
    types: new Set(),
    excludedTypes: new Set(),
    document: false,
    domainType: null,
    include: [],
    exclude: [],
    caseSensitive: false,
    important: false
  };

  for (const token of optionText.split(",")) {
    const negated = token.startsWith("~");
    const body = negated ? token.slice(1) : token;
    const eq = body.indexOf("=");
    const name = (eq === -1 ? body : body.slice(0, eq)).toLowerCase();
    const value = eq === -1 ? "" : body.slice(eq + 1);

    if (name === "third-party" || name === "3p") {
      out.domainType = negated ? "firstParty" : "thirdParty";
    } else if (name === "first-party" || name === "1p") {
      out.domainType = negated ? "thirdParty" : "firstParty";
    } else if (name === "match-case") {
      out.caseSensitive = true;
    } else if (name === "important") {
      out.important = true;
    } else if (name === "domain") {
      const parsed = parseDomainList(value);
      if (!parsed) return { skip: "domain-entity-or-regex" };
      out.include.push(...parsed.include);
      out.exclude.push(...parsed.exclude);
    } else if (DOCUMENT_OPTIONS.has(name)) {
      if (negated) return { skip: "unsupported-option:~document" };
      out.document = true;
    } else if (TYPE_ALIASES[name]) {
      (negated ? out.excludedTypes : out.types).add(TYPE_ALIASES[name]);
    } else if (IGNORED_FLAGS.has(name)) {
      // nothing
    } else {
      return { skip: `unsupported-option:${name}` };
    }
  }
  return out;
}

function parseLine(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith("!") || line.startsWith("[")) {
    return skip("comment");
  }
  if (
    line.includes("##") || line.includes("#@#") || line.includes("#?#") ||
    line.includes("#$#") || line.includes("#%#")
  ) {
    return skip("cosmetic");
  }

  let text = line;
  const exception = text.startsWith("@@");
  if (exception) text = text.slice(2);

  let optionText = "";
  const dollar = text.lastIndexOf("$");
  if (dollar !== -1) {
    const candidate = text.slice(dollar + 1);
    if (OPTIONS_RE.test(candidate)) {
      optionText = candidate;
      text = text.slice(0, dollar);
    }
  }

  if (text.length > 2 && text.startsWith("/") && text.endsWith("/")) {
    return skip("regex");
  }
  if (!text) return skip("empty-pattern");
  if (!isAscii(text)) return skip("non-ascii");

  let opts = null;
  if (optionText) {
    opts = parseOptions(optionText);
    if (opts.skip) return opts;
  }

  return { exception, pattern: text, opts, optionText };
}

function normalizeUrlFilter(pattern) {
  let p = pattern;
  // Chrome rejects a urlFilter starting with "||*"; "*" after an anchor is
  // equivalent to a plain substring match.
  if (p.startsWith("||*")) p = p.replace(/^\|\|\*+/, "");
  else if (p.startsWith("|*")) p = p.replace(/^\|\*+/, "");
  // A trailing wildcard changes nothing.
  p = p.replace(/\*+$/, "");

  const body = p.replace(/^\|\|?/, "").replace(/\|$/, "");
  if (body.includes("|")) return null; // anchor in the middle
  if (p.startsWith("||") && p.slice(2).startsWith("^")) return null;
  const meaningful = body.replace(/[*^]/g, "");
  if (meaningful.length < 3) return null; // too generic, would over-block
  return p;
}

function typesToResourceTypes(opts) {
  if (!opts) return null;
  const { types, excludedTypes } = opts;
  if (types.size === 0 && excludedTypes.size === 0) return null;
  const base = types.size ? [...types] : ALL_SUBRESOURCE_TYPES;
  const result = base.filter((t) => !excludedTypes.has(t));
  return result.length ? result : undefined; // undefined = impossible rule
}

function optionKey(obj) {
  return JSON.stringify(obj);
}

export function convertList(text, options = {}) {
  const maxRules = options.maxRules ?? DEFAULT_MAX_RULES;
  const blockIdStart = options.blockIdStart ?? DEFAULT_BLOCK_ID_START;
  const allowIdStart = options.allowIdStart ?? DEFAULT_ALLOW_ID_START;

  const lines = text.split(/\r?\n/);
  const stats = {
    lines: lines.length,
    skipped: {},
    converted: 0,
    dedupedSubdomains: 0,
    droppedForBudget: 0
  };
  const countSkip = (reason) => {
    const key = reason.startsWith("unsupported-option")
      ? "unsupported-option" : reason;
    stats.skipped[key] = (stats.skipped[key] || 0) + 1;
    if (key === "unsupported-option") {
      stats.unsupportedDetail ??= {};
      stats.unsupportedDetail[reason] =
        (stats.unsupportedDetail[reason] || 0) + 1;
    }
  };

  // $badfilter cancels another rule with identical text.
  const badfilters = new Set();
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^(.*)\$(?:badfilter|(.+),badfilter)$/);
    if (m) {
      badfilters.add(m[2] ? `${m[1]}$${m[2]}` : m[1]);
    }
  }

  // Domain-only rules are merged into one rule per option set.
  const domainGroups = new Map(); // key -> { meta, hosts:Set }
  const urlRules = []; // { kind, exception, rule }

  for (const raw of lines) {
    const line = raw.trim();
    if (badfilters.has(line)) { countSkip("badfilter-cancelled"); continue; }
    if (/\$(?:.+,)?badfilter$/.test(line)) { countSkip("badfilter"); continue; }

    const parsed = parseLine(raw);
    if (parsed.skip) {
      if (parsed.skip !== "comment") countSkip(parsed.skip);
      continue;
    }
    const { exception, pattern, opts } = parsed;

    // $document: only meaningful as an exception, where it means
    // "do not block anything on pages of this site".
    let action = exception ? "allow" : "block";
    let priority = exception ? ALLOW_PRIORITY : BLOCK_PRIORITY;
    let resourceTypes = typesToResourceTypes(opts);
    if (resourceTypes === undefined) { countSkip("no-valid-types"); continue; }

    if (opts?.document) {
      if (!exception) { countSkip("block-document"); continue; }
      if (resourceTypes) { countSkip("document-combo"); continue; }
      action = "allowAllRequests";
      resourceTypes = ["main_frame"];
    } else if (!exception && opts?.important) {
      priority = IMPORTANT_PRIORITY;
    }

    const condition = {};
    if (opts?.domainType) condition.domainType = opts.domainType;
    if (opts?.include.length) condition.initiatorDomains = opts.include;
    if (opts?.exclude.length) condition.excludedInitiatorDomains = opts.exclude;
    if (resourceTypes) condition.resourceTypes = resourceTypes;

    const hostMatch = pattern.match(/^\|\|([a-z0-9.-]+)\^$/i);
    const host = hostMatch && HOSTNAME_RE.test(hostMatch[1].toLowerCase())
      ? hostMatch[1].toLowerCase() : null;

    if (host) {
      const meta = { action: { type: action }, priority, condition };
      const key = optionKey(meta);
      let group = domainGroups.get(key);
      if (!group) { group = { meta, hosts: new Set() }; domainGroups.set(key, group); }
      group.hosts.add(host);
      stats.converted++;
      continue;
    }

    const urlFilter = normalizeUrlFilter(pattern);
    if (!urlFilter) { countSkip("pattern-too-generic-or-invalid"); continue; }

    urlRules.push({
      anchored: urlFilter.startsWith("||"),
      exception,
      rule: {
        priority,
        action: { type: action },
        condition: {
          urlFilter,
          isUrlFilterCaseSensitive: !!opts?.caseSensitive,
          ...condition
        }
      }
    });
    stats.converted++;
  }

  // Build rules from domain groups (drop hosts already covered by a parent).
  const domainRules = [];
  const CHUNK = 500;
  for (const { meta, hosts } of domainGroups.values()) {
    const kept = [];
    for (const h of hosts) {
      let covered = false;
      const parts = h.split(".");
      for (let i = 1; i < parts.length - 1; i++) {
        if (hosts.has(parts.slice(i).join("."))) { covered = true; break; }
      }
      if (covered) stats.dedupedSubdomains++; else kept.push(h);
    }
    kept.sort();
    for (let i = 0; i < kept.length; i += CHUNK) {
      domainRules.push({
        exception: meta.action.type !== "block",
        rule: {
          priority: meta.priority,
          action: meta.action,
          condition: { requestDomains: kept.slice(i, i + CHUNK), ...meta.condition }
        }
      });
    }
  }

  // Assemble: exceptions are always kept, then domain rules, then URL rules
  // anchored to a domain, then the rest, until the budget is used up.
  const allows = [
    ...domainRules.filter((r) => r.exception),
    ...urlRules.filter((r) => r.exception)
  ];
  const blocksRanked = [
    ...domainRules.filter((r) => !r.exception),
    ...urlRules.filter((r) => !r.exception && r.anchored),
    ...urlRules.filter((r) => !r.exception && !r.anchored)
  ];
  const blockBudget = Math.max(0, maxRules - allows.length);
  const keptBlocks = blocksRanked.slice(0, blockBudget);
  stats.droppedForBudget = blocksRanked.length - keptBlocks.length;

  const rules = [];
  keptBlocks.forEach((r, i) => rules.push({ id: blockIdStart + i, ...r.rule }));
  allows.forEach((r, i) => rules.push({ id: allowIdStart + i, ...r.rule }));

  stats.rules = rules.length;
  stats.blockRules = keptBlocks.length;
  stats.allowRules = allows.length;
  stats.blockedDomains = keptBlocks.reduce(
    (n, r) => n + (r.rule.condition.requestDomains?.length ?? 0), 0);
  stats.urlFilterBlockRules = keptBlocks.filter(
    (r) => r.rule.condition.urlFilter).length;

  return { rules, stats };
}

const VALID_ACTIONS = new Set(["block", "allow", "allowAllRequests"]);
const VALID_TYPES = new Set([...ALL_SUBRESOURCE_TYPES, "main_frame"]);

// Returns a list of problems; empty means the rules look loadable.
export function validateRules(rules, { maxRules = DEFAULT_MAX_RULES } = {}) {
  const problems = [];
  const ids = new Set();
  if (rules.length > maxRules) {
    problems.push(`too many rules: ${rules.length} > ${maxRules}`);
  }
  for (const r of rules) {
    const where = `rule ${r.id}`;
    if (!Number.isInteger(r.id) || r.id < 1) problems.push(`${where}: bad id`);
    if (ids.has(r.id)) problems.push(`${where}: duplicate id`);
    ids.add(r.id);
    if (!Number.isInteger(r.priority) || r.priority < 1) {
      problems.push(`${where}: bad priority`);
    }
    if (!VALID_ACTIONS.has(r.action?.type)) problems.push(`${where}: bad action`);
    const c = r.condition;
    if (!c || (!c.urlFilter && !c.requestDomains?.length)) {
      problems.push(`${where}: needs urlFilter or requestDomains`);
      continue;
    }
    if (c.urlFilter) {
      if (!isAscii(c.urlFilter)) problems.push(`${where}: non-ASCII urlFilter`);
      if (c.urlFilter.startsWith("||*")) problems.push(`${where}: urlFilter starts with ||*`);
    }
    for (const list of [c.requestDomains, c.initiatorDomains, c.excludedInitiatorDomains]) {
      for (const d of list ?? []) {
        if (!HOSTNAME_RE.test(d)) problems.push(`${where}: bad domain ${d}`);
      }
    }
    for (const t of c.resourceTypes ?? []) {
      if (!VALID_TYPES.has(t)) problems.push(`${where}: bad resource type ${t}`);
    }
    if (r.action.type === "block" && c.resourceTypes?.includes("main_frame")) {
      problems.push(`${where}: block rule applies to main_frame`);
    }
  }
  return problems;
}

// Reads "! Version:" and "! Last modified:" style header lines.
export function readListHeader(text) {
  const header = {};
  for (const line of text.split(/\r?\n/).slice(0, 30)) {
    const m = line.match(/^!\s*(Title|Version|Last modified|Expires):\s*(.+)$/i);
    if (m) header[m[1].toLowerCase()] = m[2].trim();
  }
  return header;
}
