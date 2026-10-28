/**
 * Rule URL matching.
 *
 * Historically this was a hand-rolled `new RegExp(pattern.replace(...)).test(url)`
 * with no anchors, so `https://*.bank.com/*` also matched
 * `https://evil.example/?next=https://x.bank.com/`.  The matcher below parses
 * both the pattern and the URL and compares scheme / host / port / path
 * separately, so a rule can only ever run on the origin it names.
 *
 * Supported pattern shape (compatible with the UI examples):
 *   scheme://host[:port]/path
 *   scheme  : http, https, file, ws, wss, ftp, or * (http/https only, like
 *             Chrome match patterns — `*://` never covers file: URLs)
 *   host    : example.com, *.example.com, *
 *   path    : glob with `*` (matches any characters, including `/`)
 *
 * A pattern without a path (`https://example.com`) matches every path.
 */

const SUPPORTED_SCHEMES = new Set(["http", "https", "file", "ws", "wss", "ftp"]);
const DEFAULT_PORTS = { http: "80", https: "443", ws: "80", wss: "443", ftp: "21" };
const PATTERN_RE = /^([a-z*]+):\/\/([^/]*)(\/.*)?$/i;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Linear-time glob match for `*` (any run of characters, including `/`).
 *
 * The previous implementation turned the glob into `.*` groups; a rule with
 * many `*` characters made the RegExp backtrack exponentially on a long URL
 * (ReDoS).  Splitting on `*` and using `indexOf` is bounded by the URL length.
 */
function globMatch(glob, value) {
  const parts = glob.split("*");
  if (parts.length === 1) return value === glob;

  const first = parts[0];
  if (!value.startsWith(first)) return false;

  let pos = first.length;
  for (let i = 1; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!part) continue;
    const index = value.indexOf(part, pos);
    if (index === -1) return false;
    pos = index + part.length;
  }

  const last = parts[parts.length - 1];
  return value.endsWith(last) && value.length - last.length >= pos;
}

/**
 * Encode non-ASCII path characters the same way `URL#pathname` does, so a
 * rule written as `/한글/*` matches the browser's `/%ED%95%9C.../*`.  Existing
 * `%XX` escapes are left untouched and `*` stays a glob.
 */
function normalizePath(path) {
  try {
    return path.replace(/[^\u0020-\u007E]+/g, (chunk) => encodeURIComponent(chunk));
  } catch {
    return null;
  }
}

function splitAuthority(authority) {
  const ipv6 = /^\[([^\]]+)\](?::(\d+))?$/.exec(authority);
  if (ipv6) return { host: `[${ipv6[1]}]`, port: ipv6[2] || "" };

  const colon = authority.lastIndexOf(":");
  if (colon > -1 && /^\d+$/.test(authority.slice(colon + 1))) {
    return { host: authority.slice(0, colon), port: authority.slice(colon + 1) };
  }
  return { host: authority, port: "" };
}

function hostToRegExp(host) {
  if (host === "*") return /^.*$/;
  if (host.startsWith("*.")) {
    const base = host.slice(2).toLowerCase();
    if (!base || base.includes("*")) return null;
    /* `*.example.com` matches example.com and every subdomain, but never
       `badexample.com`. */
    return new RegExp("^(?:[^.]+\\.)*" + escapeRegExp(base) + "$");
  }
  if (host.includes("*")) return null;
  return new RegExp("^" + escapeRegExp(host.toLowerCase()) + "$");
}

/**
 * Convert a pattern host to the same ASCII/punycode form the URL parser
 * reports, so `https://*.한국.com/*` actually matches.  Returns null for
 * hosts that cannot be a real hostname (`**.example.com`, `exa*mple.com`).
 */
function normalizeHost(host) {
  if (host === "*") return "*";
  if (host.startsWith("*.")) {
    const base = host.slice(2);
    if (!base || base.includes("*")) return null;
    try {
      return "*." + new URL(`http://${base}`).hostname;
    } catch {
      return null;
    }
  }
  if (host.includes("*")) return null;
  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
}

/**
 * Compile a rule pattern once.  Returns null when the pattern is not a valid
 * rule pattern, so callers can reject it at save time.
 *
 * @param {string} pattern
 * @returns {{scheme: string, hostRe: RegExp, port: string, pathGlob: string}|null}
 */
export function compileRulePattern(pattern) {
  if (typeof pattern !== "string") return null;
  const raw = pattern.trim();
  if (!raw) return null;
  /* A URL pattern cannot contain raw whitespace; accepting it would create a
     rule that silently never matches. */
  if (/\s/.test(raw)) return null;

  const match = PATTERN_RE.exec(raw);
  if (!match) return null;

  const scheme = match[1].toLowerCase();
  if (scheme !== "*" && !SUPPORTED_SCHEMES.has(scheme)) return null;

  /* file:///path has an empty authority; file://server/share names a host.
     Match the host exactly so a rule written for a local path does not also
     run on a UNC/remote file (and vice versa). */
  if (scheme === "file") {
    const filePath = normalizePath(match[3] === undefined ? "/*" : match[3]);
    if (filePath === null) return null;
    if (/[\s%@#?\\]/.test(match[2])) return null;

    const fileHost = match[2].toLowerCase();
    const hostRe =
      fileHost === "*" ? /^.*$/ : new RegExp("^" + escapeRegExp(fileHost) + "$");

    return {
      scheme,
      hostRe,
      port: "",
      pathGlob: filePath,
    };
  }

  const { host, port } = splitAuthority(match[2]);
  if (!host) return null;

  /* Reject authority strings a URL can never produce (spaces, percent-encoded
     hosts, userinfo, out-of-range ports).  Accepting them would "save" a rule
     that can never match anything. */
  if (/[\s%@#?\\]/.test(match[2])) return null;
  if (port && (Number(port) < 1 || Number(port) > 65535)) return null;

  /* `:0443` is the same port as `:443`; the URL parser always reports the
     canonical form, so compare canonical forms too. */
  const normalizedPort = port ? String(Number(port)) : "";

  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return null;

  const hostRe = hostToRegExp(normalizedHost);
  if (!hostRe) return null;

  /* No path means "match every path" for backwards compatibility with the
     v1 rules whose key was just `https://example.com`. */
  const normalizedPath = normalizePath(match[3] === undefined ? "/*" : match[3]);
  if (normalizedPath === null) return null;

  return { scheme, hostRe, port: normalizedPort, pathGlob: normalizedPath };
}

/**
 * @param {string} pattern
 * @param {string} urlString
 * @returns {boolean}
 */
export function matchesRule(pattern, urlString) {
  const compiled = typeof pattern === "string" ? compileRulePattern(pattern) : pattern;
  if (!compiled || typeof urlString !== "string" || !urlString) return false;

  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  const scheme = url.protocol.replace(/:$/, "").toLowerCase();
  if (compiled.scheme === "*") {
    /* Like Chrome match patterns, `*://` means http(s) only — never file:. */
    if (scheme !== "http" && scheme !== "https") return false;
  } else if (compiled.scheme !== scheme) {
    return false;
  }

  const host = url.hostname.toLowerCase();
  if (!compiled.hostRe.test(host)) return false;

  if (compiled.port) {
    /* `https://example.com:443/*` must match `https://example.com/x`: the URL
       parser drops the default port, so compare against the effective port. */
    const actualPort = url.port || DEFAULT_PORTS[scheme] || "";
    if (actualPort !== compiled.port) return false;
  }

  const path = (url.pathname || "/") + (url.search || "") + (url.hash || "");
  if (typeof compiled.pathGlob === "string") return globMatch(compiled.pathGlob, path);
  /* Backwards compatibility for callers that pass an old compiled object. */
  return compiled.pathRe ? compiled.pathRe.test(path) : false;
}

/** URLs the extension is willing to touch at all. */
export function isInjectableUrl(urlString) {
  return /^(https?|file):\/\//i.test(String(urlString || ""));
}
