/**
 * Rule storage.
 *
 * All rules live in `chrome.storage.local`:
 *   - `storage.local` has a 10 MB quota (vs. 8 KB *per item* / 100 KB total for
 *     `storage.sync`), so a normal userscript cannot silently fail to save.
 *   - Rules are never synced to a Google account.  The MCP token stays on this
 *     device too.
 *
 * `storage.sync` is read once, for migration from older versions only.
 */

import { compileRulePattern } from "./url-match.js";
import { isLibraryId } from "./libraries.js";

export const MAX_RULES = 500;
export const MAX_RULE_BYTES = 1024 * 1024; // 1 MB of JS + CSS per rule
const MAX_URL_LENGTH = 2048;
const MAX_NICKNAME_LENGTH = 256;
const MAX_TAGS_LENGTH = 1024;

const RUN_AT = new Set(["document_start", "document_end", "document_idle"]);
export const PREF_KEYS = [
  "__globalEnabled",
  "__lang",
  "__mcpEnabled",
  "__mcpUrl",
  "__mcpToken",
  "__mcpAllowWrite",
  "__mcpAllowRunScript",
  "__mcpExposeCode",
  "__mcpAudit",
];

export function isRuleKey(key) {
  return typeof key === "string" && key !== "version" && !key.startsWith("__");
}

/**
 * Rule ids created by this version (and therefore router-safe).
 *
 * The length cap matches the MCP server's `validateRuleId`: a 17+ digit id
 * would be accepted by storage but rejected by the MCP tools, so it must be
 * treated as a legacy key and renumbered instead.
 */
export function isNumericId(key) {
  return /^[1-9]\d{0,15}$/.test(String(key));
}

function decodeId(id) {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asTags(value) {
  if (Array.isArray(value)) return value.filter((tag) => typeof tag === "string").join(",");
  return asString(value);
}

/**
 * Normalise a stored value (including v1/v2 legacy shapes) into a rule object.
 * Returns null when the value cannot be a rule at all.
 */
export function sanitizeRule(value, id) {
  const key = String(id ?? "");
  const decoded = decodeId(key);

  let source;
  if (Array.isArray(value)) {
    source = {
      nickname: decoded,
      url: decoded,
      code: asString(value[0]),
      cssCode: asString(value[1]),
    };
  } else if (typeof value === "string") {
    source = { nickname: decoded, url: decoded, code: value };
  } else if (value && typeof value === "object") {
    source = value;
  } else {
    return null;
  }

  /* v1 stored the URL as the key and the code as the value. */
  const url = asString(source.url) || (/^[a-z]+:\/\//i.test(decoded) ? decoded : "");
  if (!url || !compileRulePattern(url)) return null;

  let jquery = "none";
  if (source.jquery === true) jquery = "jquery3";
  else if (isLibraryId(source.jquery)) jquery = source.jquery;

  const runAt = RUN_AT.has(source.runAt) ? source.runAt : "document_start";

  return {
    nickname: asString(source.nickname) || url,
    url,
    code: asString(source.code),
    cssCode: asString(source.cssCode),
    jquery,
    enabled: source.enabled !== false,
    unlockRightClick: !!source.unlockRightClick,
    runAt,
    tags: asTags(source.tags),
  };
}

/**
 * Strict validation for newly saved / imported / MCP-created rules.
 * @returns {{ok: true, value: object} | {ok: false, error: string}}
 */
export function validateRule(rule) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    return { ok: false, error: "rule must be an object" };
  }

  const url = asString(rule.url).trim();
  if (!url) return { ok: false, error: "url is required" };
  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, error: `url is longer than ${MAX_URL_LENGTH} characters` };
  }
  if (!compileRulePattern(url)) {
    return { ok: false, error: "url must look like https://*.example.com/*" };
  }

  const nickname = asString(rule.nickname).trim() || url;
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, error: `nickname is longer than ${MAX_NICKNAME_LENGTH} characters` };
  }

  const code = asString(rule.code);
  const cssCode = asString(rule.cssCode);
  const tags = asTags(rule.tags);
  if (tags.length > MAX_TAGS_LENGTH) {
    return { ok: false, error: `tags are longer than ${MAX_TAGS_LENGTH} characters` };
  }

  if (new TextEncoder().encode(code + cssCode).length > MAX_RULE_BYTES) {
    return { ok: false, error: "rule is larger than 1 MB" };
  }

  if (rule.runAt !== undefined && !RUN_AT.has(rule.runAt)) {
    return { ok: false, error: "runAt must be document_start, document_end or document_idle" };
  }
  if (rule.jquery !== undefined && !isLibraryId(rule.jquery)) {
    return { ok: false, error: "unknown library preset" };
  }

  return {
    ok: true,
    value: {
      nickname,
      url,
      code,
      cssCode,
      jquery: rule.jquery || "none",
      enabled: rule.enabled !== false,
      unlockRightClick: !!rule.unlockRightClick,
      runAt: rule.runAt || "document_start",
      tags,
    },
  };
}

function pickPrefs(items) {
  const prefs = { __globalEnabled: items.__globalEnabled !== false };
  for (const key of PREF_KEYS) {
    if (key === "__globalEnabled") continue;
    if (items[key] !== undefined) prefs[key] = items[key];
  }
  return prefs;
}

function splitItems(items) {
  const rules = {};
  for (const [key, value] of Object.entries(items || {})) {
    if (!isRuleKey(key)) continue;
    const rule = sanitizeRule(value, key);
    if (rule) rules[key] = rule;
  }
  return { rules, prefs: pickPrefs(items || {}) };
}

/**
 * Give every non-numeric rule key a stable numeric id.
 *
 * Legacy versions used the URL(-encoded) as the storage key, and those keys do
 * not survive a round-trip through the router (`useParams` URL-decodes) or a
 * `Link to="../../x"`.  Existing numeric ids are kept untouched so nothing that
 * already works changes.
 *
 * @param {object} rules
 * @returns {object} rules keyed only by `/^[1-9]\d{0,15}$/`
 */
const MAX_RULE_ID = Number.MAX_SAFE_INTEGER; // 16 digits, same contract as isNumericId

function nextFreeId(taken, start) {
  let candidate = start;
  if (!Number.isInteger(candidate) || candidate < 1 || candidate > MAX_RULE_ID) {
    candidate = 1;
  }
  while (taken.has(String(candidate))) {
    candidate = candidate >= MAX_RULE_ID ? 1 : candidate + 1;
  }
  return candidate;
}

export function assignNumericIds(rules) {
  const entries = Object.entries(rules || {});
  const taken = new Set(entries.map(([id]) => id));
  const numeric = entries
    .filter(([id]) => isNumericId(id))
    .map(([id]) => Number(id));
  let next = numeric.length ? Math.max(...numeric) + 1 : 1;

  const out = {};
  for (const [id, rule] of entries) {
    if (isNumericId(id)) {
      out[id] = rule;
      continue;
    }
    next = nextFreeId(taken, next);
    out[String(next)] = rule;
    taken.add(String(next));
    next += 1;
  }
  return out;
}

export function migrateRules(items, version) {
  const { rules, prefs } = splitItems(items);

  /* A single legacy rule that no longer validates (for example a >1 MB code
     blob from an older build) must never abort the whole migration: that
     would leave `version` unchanged and make every later start fail, so no
     rule runs at all.  Drop only the offending rule. */
  const valid = {};
  let count = 0;
  for (const [id, rule] of Object.entries(rules)) {
    if (count >= MAX_RULES) {
      console.warn(`[Js-Injection] migration dropped rules beyond the ${MAX_RULES} limit`);
      break;
    }
    if (!validateRule(rule).ok) {
      console.warn(`[Js-Injection] migration dropped invalid legacy rule ${id}`);
      continue;
    }
    valid[id] = rule;
    count += 1;
  }

  prefs.version = version;
  return { rules: assignNumericIds(valid), prefs };
}

export async function loadAll() {
  const items = (await chrome.storage.local.get(null)) || {};
  return { ...splitItems(items), raw: items };
}

export async function loadRules() {
  return (await loadAll()).rules;
}

export async function getRule(id) {
  const key = String(id);
  const items = await chrome.storage.local.get(key);
  return items?.[key] ? sanitizeRule(items[key], key) : null;
}

export async function getPrefs() {
  const items = (await chrome.storage.local.get(null)) || {};
  return pickPrefs(items);
}

export async function setPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return;
  await chrome.storage.local.set(prefs);
}

export async function saveRule(id, rule) {
  const key = String(id);
  /* Only router-safe numeric ids.  A legacy URL-shaped key cannot be opened
     in the editor, so writing one would create an unreachable rule; migration
     renumbers those instead. */
  if (!isNumericId(key)) throw new Error("invalid rule id");
  const check = validateRule(rule);
  if (!check.ok) throw new Error(check.error);

  /* `replaceAll` already enforces the limit; single-rule saves (UI + MCP)
     must too, otherwise an agent could keep adding rules until the storage
     quota is exhausted. */
  const existing = (await chrome.storage.local.get(key)) || {};
  if (existing[key] === undefined) {
    const items = (await chrome.storage.local.get(null)) || {};
    const count = Object.keys(items).filter(isRuleKey).length;
    if (count >= MAX_RULES) throw new Error(`too many rules (max ${MAX_RULES})`);
  }

  await chrome.storage.local.set({ [key]: check.value });
  return { id: key, rule: check.value };
}

export async function deleteRule(id) {
  const key = String(id);
  if (!isNumericId(key)) throw new Error("invalid rule id");
  await chrome.storage.local.remove([key, `__draft_${key}`]);
}

/**
 * Replace the full rule set without clearing preferences or drafts.
 * Writes the new values first, then removes the stale rule keys — a failed
 * write never leaves the user with an empty list.
 */
export async function replaceAll(rules, prefs = {}) {
  const entries = Object.entries(rules || {});
  if (entries.length > MAX_RULES) {
    throw new Error(`too many rules (max ${MAX_RULES})`);
  }

  const clean = {};
  for (const [id, rule] of entries) {
    if (!isRuleKey(String(id))) continue;
    const check = validateRule(rule);
    if (!check.ok) throw new Error(`${id}: ${check.error}`);
    clean[String(id)] = check.value;
  }

  const current = (await chrome.storage.local.get(null)) || {};
  const stale = Object.keys(current).filter((key) => isRuleKey(key) && !(key in clean));

  await chrome.storage.local.set({ ...prefs, ...clean });
  if (stale.length) await chrome.storage.local.remove(stale);
}

/**
 * Preferences that are safe to round-trip through a backup file.
 *
 * The MCP token, MCP consent flags and the audit log are deliberately excluded:
 * importing a file must never silently grant an AI agent write/execute access,
 * and a backup must never carry the pairing secret off the device.
 */
const IMPORTABLE_PREFS = ["__globalEnabled", "__lang"];

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Serialise rules + safe preferences for a downloadable backup. */
export function buildBackup(rules, prefs) {
  const safeRules = {};
  for (const [id, rule] of Object.entries(rules || {})) {
    if (!isRuleKey(id)) continue;
    const check = validateRule(rule);
    if (check.ok) safeRules[id] = check.value;
  }

  const safePrefs = {};
  for (const key of IMPORTABLE_PREFS) {
    if (prefs?.[key] !== undefined) safePrefs[key] = prefs[key];
  }

  return JSON.stringify(
    {
      format: "js-injection-backup",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      rules: safeRules,
      prefs: safePrefs,
    },
    null,
    2
  );
}

/**
 * Validate a backup before anything is written.
 *
 * Both the current `{format, rules, prefs}` shape and the old flat
 * `{id: rule}` shape are accepted.  Any invalid rule aborts the whole import —
 * a partially imported rule set is worse than a clear error.
 *
 * @returns {{ok: true, rules: object, prefs: object, count: number} | {ok: false, error: string}}
 */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(String(text));
  } catch {
    return { ok: false, error: "not valid JSON" };
  }
  if (!isPlainObject(data)) return { ok: false, error: "backup must be a JSON object" };

  const wrapped = data.format === "js-injection-backup";
  const rawRules = wrapped ? data.rules : data;
  if (!isPlainObject(rawRules)) return { ok: false, error: "backup has no rules object" };

  const parsedRules = {};
  let count = 0;

  for (const [id, value] of Object.entries(rawRules)) {
    if (!isRuleKey(id)) continue;
    const sanitized = sanitizeRule(value, id);
    if (!sanitized) return { ok: false, error: `rule "${id}" is not a valid rule` };

    const check = validateRule(sanitized);
    if (!check.ok) return { ok: false, error: `rule "${id}": ${check.error}` };

    parsedRules[id] = check.value;
    count += 1;
    if (count > MAX_RULES) return { ok: false, error: `too many rules (max ${MAX_RULES})` };
  }

  /* Legacy URL-shaped keys are valid input but must not reach the router. */
  const rules = assignNumericIds(parsedRules);

  const prefs = {};
  const rawPrefs = wrapped && isPlainObject(data.prefs) ? data.prefs : isPlainObject(data) ? data : {};
  if (rawPrefs.__globalEnabled !== undefined) {
    prefs.__globalEnabled = rawPrefs.__globalEnabled !== false;
  }
  if (rawPrefs.__lang === "ko" || rawPrefs.__lang === "en") {
    prefs.__lang = rawPrefs.__lang;
  }

  return { ok: true, rules, prefs, count };
}

export function nextRuleId(rules) {
  const taken = new Set(Object.keys(rules || {}));
  let max = 0;
  for (const key of taken) {
    if (!isNumericId(key)) continue;
    max = Math.max(max, Number(key));
  }
  return String(nextFreeId(taken, max + 1));
}

/**
 * One-time migration:
 *   1. If local storage is empty, copy the old `storage.sync` rules across.
 *   2. Normalise every rule (v1 key/value shapes, old jquery flags, ...).
 *   3. Set `version` last, so a crash can be retried.
 */
export async function migrateIfNeeded(version) {
  const local = (await chrome.storage.local.get(null)) || {};
  if (local.version === version) {
    /* A build that ran before the id renumbering could already have written
       the current version string while keeping URL-shaped keys.  Repair those
       instead of returning early forever. */
    const hasLegacyKeys = Object.keys(local).some(
      (key) => isRuleKey(key) && !isNumericId(key)
    );
    if (!hasLegacyKeys) return loadAll();
  }

  let source = local;

  const localHasRules = Object.keys(local).some(isRuleKey);
  if (!localHasRules && local.__migratedFromSync !== true) {
    /* Sync can be unavailable (policy, disabled account, older build).  That
       must not stop local rules from being loaded/normalised. */
    let sync = {};
    try {
      sync = (await chrome.storage.sync.get(null)) || {};
    } catch {
      sync = {};
    }
    const syncHasData = Object.keys(sync).some((key) => isRuleKey(key) || key === "version");
    if (syncHasData) {
      /* MCP consent flags / token / audit log are device-local.  A stale value
         in sync must never grant write or script-execution permission (or
         replace the pairing secret) during migration. */
      const fromSync = {};
      for (const [key, value] of Object.entries(sync)) {
        if (key.startsWith("__mcp")) continue;
        fromSync[key] = value;
      }
      source = { ...fromSync, ...local };
      await chrome.storage.local.set(source);
    }
  }

  const { rules, prefs } = migrateRules(source, version);
  await replaceAll(rules, prefs);
  await chrome.storage.local.set({ __migratedFromSync: true });
  return { rules, prefs };
}

export async function appendAudit(entry) {
  const items = (await chrome.storage.local.get("__mcpAudit")) || {};
  const log = Array.isArray(items.__mcpAudit) ? items.__mcpAudit : [];
  /* A rule can throw an arbitrarily long error string; keeping it verbatim
     would let one failure fill the 10 MB storage quota. */
  const safe = { ...(isPlainObject(entry) ? entry : {}), at: Date.now() };
  if (typeof safe.error === "string") safe.error = safe.error.slice(0, 500);
  if (typeof safe.url === "string") safe.url = safe.url.slice(0, 2048);
  if (typeof safe.action === "string") safe.action = safe.action.slice(0, 64);
  if (typeof safe.id === "string") safe.id = safe.id.slice(0, 64);
  log.push(safe);
  await chrome.storage.local.set({ __mcpAudit: log.slice(-100) });
}
