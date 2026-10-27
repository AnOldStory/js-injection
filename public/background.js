/* Manifest V3 Service Worker: injection engine + MCP bridge. */

import { matchesRule, isInjectableUrl } from "./url-match.js";
import { getLibraryFile } from "./libraries.js";
import { executeUserCode } from "./execute.js";
import {
  MAX_RULES,
  PREF_KEYS,
  appendAudit,
  deleteRule,
  getPrefs,
  isNumericId,
  isRuleKey,
  loadRules,
  migrateIfNeeded,
  nextRuleId,
  saveRule,
} from "./rule-store.js";
import { DEFAULT_MCP_URL, normalizeLoopbackUrl } from "./mcp-url.js";

let storageList = {};
let prefs = { __globalEnabled: true };

/* ------------------------------------------------------------------ */
/* Startup / migration                                                 */
/* ------------------------------------------------------------------ */

const storageReady = initialize();

async function initialize() {
  try {
    await migrateIfNeeded(chrome.runtime.getManifest().version);
    storageList = await loadRules();
    prefs = await getPrefs();
    if (prefs.__mcpEnabled === true) await connectMcp();
  } catch (error) {
    console.error("[Js-Injection] startup failed:", error);
  }
}

/* ------------------------------------------------------------------ */
/* Offscreen MCP bridge                                                */
/* ------------------------------------------------------------------ */

async function ensureOffscreenDocument() {
  if (chrome.offscreen.hasDocument && (await chrome.offscreen.hasDocument())) return;
  try {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      /* WebSocket has no dedicated offscreen reason. BLOBS is a valid reason
         with no lifetime limit; MATCH_PATTERNS is not a valid enum value and
         makes createDocument() reject. */
      reasons: ["BLOBS"],
      justification: "Maintain the user-enabled local MCP WebSocket bridge (loopback only).",
    });
  } catch (error) {
    /* Another context may have created the document between the check and
       createDocument(). That is fine as long as it now exists. */
    const exists = chrome.offscreen.hasDocument && (await chrome.offscreen.hasDocument());
    if (!exists) throw error;
  }
}

/**
 * The offscreen module registers its listener asynchronously after the
 * document is created, so the first message can race its startup.
 */
async function sendToOffscreen(message, attempts = 4) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await chrome.runtime.sendMessage(message);
      return true;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError || new Error("Offscreen document is not responding.");
}

async function connectMcp(overrides = {}) {
  const current = overrides.prefs || (await getPrefs());
  const url = normalizeLoopbackUrl(overrides.url || current.__mcpUrl || DEFAULT_MCP_URL);
  if (!url) {
    console.warn("[Js-Injection] refusing non-loopback MCP URL");
    return { ok: false, error: "MCP URL must point at localhost / 127.0.0.1" };
  }

  const token = String(overrides.token !== undefined ? overrides.token : current.__mcpToken || "").trim();
  if (!token) {
    /* Without a token the server rejects every upgrade with 401 and the
       offscreen document would retry forever.  Fail fast instead. */
    return { ok: false, error: "MCP pairing token is required" };
  }

  try {
    await ensureOffscreenDocument();
    await sendToOffscreen({ type: "CONNECT_MCP", url, token });
    return { ok: true };
  } catch (error) {
    console.error("[Js-Injection] could not start MCP bridge:", error);
    return { ok: false, error: String(error?.message || error) };
  }
}

async function disconnectMcp() {
  try {
    await sendToOffscreen({ type: "DISCONNECT_MCP" }, 2);
  } catch {
    /* No offscreen document is fine: nothing is connected. */
  }
}

/* Watch storage: rules changed, MCP settings changed. */
chrome.storage.local.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const keys = Object.keys(changes);

  if (keys.some((key) => isRuleKey(key) || key === "version")) {
    loadRules()
      .then((rules) => {
        storageList = rules;
      })
      .catch((error) => console.error("[Js-Injection] rule reload failed:", error));
  }

  if (keys.some((key) => PREF_KEYS.includes(key))) {
    getPrefs()
      .then((next) => {
        prefs = next;
      })
      .catch((error) => console.error("[Js-Injection] preference reload failed:", error));
  }

  if (changes.__mcpEnabled) {
    if (changes.__mcpEnabled.newValue === true) {
      connectMcp().catch(() => {});
    } else {
      disconnectMcp();
    }
    return;
  }

  if (prefs.__mcpEnabled === true && keys.some((key) => key === "__mcpUrl" || key === "__mcpToken")) {
    connectMcp().catch(() => {});
  }
});

/* ------------------------------------------------------------------ */
/* Injection                                                           */
/* ------------------------------------------------------------------ */

function frameOf(sender) {
  return Number.isInteger(sender?.frameId) ? sender.frameId : 0;
}

async function injectMainFile(tabId, frameId, file, injectImmediately) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: "MAIN",
      files: [file],
      injectImmediately: !!injectImmediately,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

/**
 * Phase 1: match the frame URL, load bundled libraries / CSS / unlock code.
 * Returns the rule IDs grouped by the phase in which the page should run them.
 */
async function handleBeforeLoad(sender, sendResponse) {
  const empty = { start: [], end: [], idle: [] };
  try {
    if (prefs.__globalEnabled === false) return sendResponse(empty);

    const tabId = sender.tab?.id;
    const frameId = frameOf(sender);
    const url = sender.url || "";
    if (!Number.isInteger(tabId) || !isInjectableUrl(url)) return sendResponse(empty);

    const matched = [];
    for (const [id, rule] of Object.entries(storageList)) {
      if (!rule || rule.enabled === false) continue;
      if (!matchesRule(rule.url, url)) continue;
      matched.push({ id, rule });
    }
    if (!matched.length) return sendResponse(empty);

    if (matched.some(({ rule }) => rule.unlockRightClick)) {
      const unlock = await injectMainFile(tabId, frameId, "unlock-page.js", true);
      if (!unlock.ok) console.warn("[Js-Injection] unlock failed:", unlock.error);
    }

    /* Libraries must be injected *before* the rule's code, otherwise a rule
       that uses `$` runs while jQuery is still loading. */
    const libraries = [
      ...new Set(matched.map(({ rule }) => getLibraryFile(rule.jquery)).filter(Boolean)),
    ];
    for (const file of libraries) {
      const result = await injectMainFile(tabId, frameId, file, true);
      if (!result.ok) console.warn(`[Js-Injection] library ${file} failed:`, result.error);
    }

    for (const { rule } of matched) {
      if (!rule.cssCode) continue;
      try {
        await chrome.scripting.insertCSS({
          target: { tabId, frameIds: [frameId] },
          css: rule.cssCode,
        });
      } catch (error) {
        console.warn("[Js-Injection] CSS injection failed:", error);
      }
    }

    const groups = { start: [], end: [], idle: [] };
    for (const { id, rule } of matched) {
      if (!rule.code) continue;
      const phase =
        rule.runAt === "document_end" ? "end" : rule.runAt === "document_idle" ? "idle" : "start";
      groups[phase].push(id);
    }
    return sendResponse(groups);
  } catch (error) {
    console.error("[Js-Injection] beforeLoad failed:", error);
    return sendResponse(empty);
  }
}

/**
 * Phase 2: the content script reports DOM readiness and we execute only the
 * rules that matched *this frame*.  Never `allFrames` here: a rule scoped to
 * an iframe must not run in the top-level document.
 */
async function handleRunRules(sender, ruleIds, sendResponse) {
  const errors = [];
  try {
    if (prefs.__globalEnabled === false) return sendResponse({ errors });

    const tabId = sender.tab?.id;
    const frameId = frameOf(sender);
    const url = sender.url || "";
    if (!Number.isInteger(tabId) || !isInjectableUrl(url) || !Array.isArray(ruleIds)) {
      return sendResponse({ errors });
    }

    for (const id of ruleIds.slice(0, MAX_RULES)) {
      const key = String(id);
      const rule = storageList[key];
      if (!rule || rule.enabled === false || !rule.code) continue;
      if (!matchesRule(rule.url, url)) continue;

      const result = await executeUserCode({
        tabId,
        frameIds: [frameId],
        code: rule.code,
        injectImmediately: true,
      });
      if (!result.ok) {
        const message = `${rule.nickname || key}: ${result.error}`;
        errors.push({ id: key, error: result.error });
        console.warn("[Js-Injection] rule failed:", message);
      }
    }
  } catch (error) {
    errors.push({ id: "*", error: String(error?.message || error) });
  }
  return sendResponse({ errors });
}

/* ------------------------------------------------------------------ */
/* MCP tools                                                           */
/* ------------------------------------------------------------------ */

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function publicRule(rule, exposeCode) {
  return {
    nickname: rule.nickname,
    url: rule.url,
    enabled: rule.enabled,
    jquery: rule.jquery,
    runAt: rule.runAt,
    tags: rule.tags,
    unlockRightClick: rule.unlockRightClick,
    hasCode: !!rule.code,
    hasCss: !!rule.cssCode,
    codeBytes: new TextEncoder().encode(rule.code || "").length,
    ...(exposeCode ? { code: rule.code, cssCode: rule.cssCode } : {}),
  };
}

async function handleMcpCommand(payload) {
  const { action, params } = payload || {};
  const p = params && typeof params === "object" ? params : {};
  const current = await getPrefs();

  if (action === "listRules") {
    storageList = await loadRules();
    const expose = current.__mcpExposeCode === true;
    const rules = {};
    for (const [id, rule] of Object.entries(storageList)) {
      rules[id] = publicRule(rule, expose);
    }
    return {
      rules,
      settings: {
        allowWrite: current.__mcpAllowWrite === true,
        allowRunScript: current.__mcpAllowRunScript === true,
        exposeCode: expose,
      },
    };
  }

  if (action === "addRule") {
    if (current.__mcpAllowWrite !== true) {
      return { error: "MCP write access is disabled in the extension settings." };
    }

    const requested = p.id === undefined || p.id === null ? "" : String(p.id).trim();
    if (requested && !isNumericId(requested)) {
      /* A URL-shaped / path-like id would break the rule router exactly like
         the legacy keys migration fixes, so agents must use numeric ids. */
      return { error: "Rule id must be a numeric id returned by list_rules." };
    }

    const id = requested || nextRuleId(await loadRules());
    const candidate = {
      nickname: asString(p.nickname),
      url: asString(p.url),
      code: asString(p.code),
      cssCode: asString(p.cssCode),
      jquery: asString(p.jquery, "none") || "none",
      enabled: p.enabled !== false,
      unlockRightClick: !!p.unlockRightClick,
      runAt: asString(p.runAt, "document_start") || "document_start",
      tags: asString(p.tags),
    };

    const saved = await saveRule(id, candidate);
    storageList = await loadRules();
    prefs = await getPrefs();
    await appendAudit({ action, id: saved.id, url: saved.rule.url, ok: true });
    return {
      success: true,
      id: saved.id,
      rule: { ...publicRule(saved.rule, false) },
    };
  }

  if (action === "deleteRule") {
    if (current.__mcpAllowWrite !== true) {
      return { error: "MCP write access is disabled in the extension settings." };
    }
    const id = asString(p.id);
    /* Same id contract as addRule: only router-safe numeric ids. */
    if (!isNumericId(id)) return { error: "Invalid rule id." };

    await deleteRule(id);
    storageList = await loadRules();
    prefs = await getPrefs();
    await appendAudit({ action, id, ok: true });
    return { success: true, deletedId: id };
  }

  if (action === "injectScriptOnActiveTab") {
    if (current.__mcpAllowRunScript !== true) {
      return { error: "MCP code execution is disabled in the extension settings." };
    }
    const code = asString(p.code);
    if (!code) return { error: "code is required." };

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs?.[0]?.id;
    if (!Number.isInteger(tabId)) return { error: "No active tab found." };
    if (!isInjectableUrl(tabs?.[0]?.url || "")) {
      return { error: "The active tab is not an injectable http(s)/file page." };
    }

    const result = await executeUserCode({ tabId, allFrames: true, code, injectImmediately: true });
    await appendAudit({ action, tabId, ok: result.ok, error: result.error });
    return result.ok
      ? { success: true, tabId, via: result.via }
      : { error: result.error || "execution failed" };
  }

  return { error: `Unknown MCP action: ${action}` };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "MCP_COMMAND_RECEIVED") {
    handleMcpCommand(message.payload)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ error: String(error?.message || error) }));
    return true;
  }

  if (message?.state === "beforeLoad") {
    storageReady
      .then(() => handleBeforeLoad(sender, sendResponse))
      .catch((error) => {
        console.error("[Js-Injection] beforeLoad:", error);
        sendResponse({ start: [], end: [], idle: [] });
      });
    return true;
  }

  if (message?.state === "runRules") {
    storageReady
      .then(() => handleRunRules(sender, message.ruleIds, sendResponse))
      .catch((error) => sendResponse({ errors: [{ id: "*", error: String(error) }] }));
    return true;
  }

  return false;
});
