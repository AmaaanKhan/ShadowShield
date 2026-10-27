// A small, approximate re-implementation of how browsers evaluate DNR rules.
// It exists so we can test the generated rules and answer "would this
// request be blocked?" without opening a browser. The real browser is the
// final authority; this is for tests and debugging only.

const TWO_LEVEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au",
  "co.in", "co.jp", "com.br", "com.cn", "co.nz", "co.za"
]);

function registrableDomain(host) {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join(".");
  return TWO_LEVEL_SUFFIXES.has(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
}

function hostMatches(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

const regexCache = new Map();

function urlFilterToRegExp(filter, caseSensitive) {
  const key = (caseSensitive ? "s:" : "i:") + filter;
  let re = regexCache.get(key);
  if (re) return re;

  let f = filter;
  let prefix = "";
  let suffix = "";
  if (f.startsWith("||")) { prefix = "^[a-z][a-z0-9+.-]*:\\/\\/(?:[^\\/?#]*\\.)?"; f = f.slice(2); }
  else if (f.startsWith("|")) { prefix = "^"; f = f.slice(1); }
  if (f.endsWith("|")) { suffix = "$"; f = f.slice(0, -1); }

  let body = "";
  for (const ch of f) {
    if (ch === "*") body += ".*";
    else if (ch === "^") body += "(?:[^a-zA-Z0-9_.%-]|$)";
    else body += ch.replace(/[.+?${}()|[\]\\\/]/g, "\\$&");
  }
  re = new RegExp(prefix + body + suffix, caseSensitive ? "" : "i");
  regexCache.set(key, re);
  return re;
}

const DEFAULT_TYPES = [
  "sub_frame", "stylesheet", "script", "image", "font",
  "object", "xmlhttprequest", "ping", "media", "websocket", "other"
];

function ruleMatches(rule, request) {
  const c = rule.condition;
  const reqHost = new URL(request.url).hostname.toLowerCase();
  const initiatorHost = request.initiator
    ? new URL(request.initiator).hostname.toLowerCase() : null;

  const types = c.resourceTypes ?? DEFAULT_TYPES;
  if (!types.includes(request.type)) return false;

  if (c.requestDomains && !c.requestDomains.some((d) => hostMatches(reqHost, d))) {
    return false;
  }
  if (c.domainType) {
    const third = initiatorHost
      ? registrableDomain(initiatorHost) !== registrableDomain(reqHost) : true;
    if (c.domainType === "thirdParty" && !third) return false;
    if (c.domainType === "firstParty" && third) return false;
  }
  if (c.initiatorDomains) {
    if (!initiatorHost || !c.initiatorDomains.some((d) => hostMatches(initiatorHost, d))) {
      return false;
    }
  }
  if (c.excludedInitiatorDomains && initiatorHost &&
      c.excludedInitiatorDomains.some((d) => hostMatches(initiatorHost, d))) {
    return false;
  }
  if (c.urlFilter) {
    if (!urlFilterToRegExp(c.urlFilter, !!c.isUrlFilterCaseSensitive).test(request.url)) {
      return false;
    }
  }
  return true;
}

const ACTION_RANK = { allow: 3, allowAllRequests: 3, block: 2 };

// request: { url, type, initiator }  ->  { action, rule } | null
export function evaluate(rules, request) {
  let best = null;
  for (const rule of rules) {
    if (!ruleMatches(rule, request)) continue;
    if (
      !best ||
      rule.priority > best.priority ||
      (rule.priority === best.priority &&
        ACTION_RANK[rule.action.type] > ACTION_RANK[best.action.type])
    ) {
      best = rule;
    }
  }
  return best ? { action: best.action.type, rule: best } : null;
}

export function isBlocked(rules, request) {
  return evaluate(rules, request)?.action === "block";
}
