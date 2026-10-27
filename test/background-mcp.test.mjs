/**
 * Adversarial tests for the service worker's MCP surface and injection scope.
 *
 * `background.js` is imported with a fake `chrome` so the real listener logic
 * runs: consent gates, id guards, URL scoping and frame targeting.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_RULES } from "../public/rule-store.js";

function readKeys(map, keys) {
  if (keys === null || keys === undefined) return structuredClone(map);
  if (typeof keys === "string") return { [keys]: structuredClone(map[keys]) };
  const out = {};
  for (const key of keys) out[key] = structuredClone(map[key]);
  return out;
}

function installChrome(seed) {
  const local = structuredClone(seed);
  const listeners = [];
  const changeListeners = [];
  const executed = [];
  const inserted = [];
  const messages = [];

  globalThis.chrome = {
    runtime: {
      getManifest: () => ({ version: "3.5.0" }),
      onMessage: { addListener: (fn) => listeners.push(fn) },
      sendMessage: async (message) => {
        messages.push(message);
        return undefined;
      },
    },
    storage: {
      local: {
        get: async (keys) => readKeys(local, keys),
        set: async (values) => void Object.assign(local, structuredClone(values)),
        remove: async (keys) => {
          for (const key of [].concat(keys)) delete local[key];
        },
        onChanged: { addListener: (fn) => changeListeners.push(fn) },
      },
      sync: { get: async () => ({}) },
    },
    offscreen: { hasDocument: async () => true, createDocument: async () => {} },
    tabs: { query: async () => [{ id: 1, url: "https://match.example/page" }] },
    scripting: {
      executeScript: async (arg) => {
        executed.push(arg);
        return [{ frameId: 0, result: null }];
      },
      insertCSS: async (arg) => {
        inserted.push(arg);
      },
    },
  };

  return {
    local,
    listeners,
    executed,
    inserted,
    messages,
    /* Fire the service worker's storage.local.onChanged handler. */
    emit(changes) {
      for (const fn of changeListeners) fn(changes, "local");
    },
  };
}

const baseRule = {
  nickname: "A",
  url: "https://match.example/*",
  code: "a()",
  cssCode: "",
  jquery: "none",
  enabled: true,
  unlockRightClick: false,
  runAt: "document_start",
  tags: "",
};

const env = installChrome({
  version: "3.5.0",
  __migratedFromSync: true,
  __globalEnabled: true,
  "1": baseRule,
  "2": { ...baseRule, nickname: "B", url: "https://other.example/*", code: "b()" },
});

await import("../public/background.js");
const handler = env.listeners[0];
assert.ok(handler, "background listener registered");
await new Promise((resolve) => setTimeout(resolve, 20));

const send = (message, sender = {}) =>
  new Promise((resolve) => {
    const keepOpen = handler(message, sender, resolve);
    if (keepOpen !== true) resolve(undefined);
  });

const mcp = (action, params = {}) => send({ type: "MCP_COMMAND_RECEIVED", payload: { action, params } });

test("list_rules hides code until the user allows exposing it", async () => {
  const basic = await mcp("listRules");
  assert.equal(basic.rules["1"].hasCode, true);
  assert.equal("code" in basic.rules["1"], false);
  assert.equal(basic.settings.allowWrite, false);
  assert.equal(basic.settings.allowRunScript, false);

  env.local.__mcpExposeCode = true;
  const exposed = await mcp("listRules");
  assert.equal(exposed.rules["1"].code, "a()");
  env.local.__mcpExposeCode = false;
});

test("write tools are denied by default", async () => {
  const before = JSON.stringify(env.local);
  const add = await mcp("addRule", { url: "https://evil.example/*", code: "alert(1)" });
  assert.match(add.error, /disabled/i);
  const del = await mcp("deleteRule", { id: "1" });
  assert.match(del.error, /disabled/i);
  const injected = await mcp("injectScriptOnActiveTab", { code: "alert(1)" });
  assert.match(injected.error, /disabled/i);
  assert.equal(JSON.stringify(env.local), before);
  assert.equal(env.executed.length, 0);
});

test("a rule cannot overwrite preferences or the version marker", async () => {
  env.local.__mcpAllowWrite = true;

  const viaPref = await mcp("addRule", {
    id: "__mcpAllowWrite",
    url: "https://match.example/*",
    code: "alert(1)",
  });
  assert.match(viaPref.error, /numeric id/i);
  assert.equal(env.local.__mcpAllowWrite, true);

  const viaVersion = await mcp("addRule", {
    id: "version",
    url: "https://match.example/*",
    code: "alert(1)",
  });
  assert.match(viaVersion.error, /numeric id/i);
  assert.equal(env.local.version, "3.5.0");

  const delVersion = await mcp("deleteRule", { id: "version" });
  assert.match(delVersion.error, /invalid rule id/i);
  assert.equal(env.local.version, "3.5.0");

  /* Legacy URL-shaped keys must not be deletable through the MCP surface. */
  env.local["https%3A%2F%2Fold.example%2F%2A"] = {
    ...baseRule,
    url: "https://old.example/*",
  };
  const delLegacy = await mcp("deleteRule", { id: "https%3A%2F%2Fold.example%2F%2A" });
  assert.match(delLegacy.error, /invalid rule id/i);
  assert.ok(env.local["https%3A%2F%2Fold.example%2F%2A"]);
  delete env.local["https%3A%2F%2Fold.example%2F%2A"];

  /* A URL-shaped id would break the router exactly like legacy keys did. */
  const urlId = await mcp("addRule", {
    id: "https%3A%2F%2Flegacy.example%2F%2A",
    url: "https://match.example/*",
    code: "alert(1)",
  });
  assert.match(urlId.error, /numeric id/i);
  assert.equal(env.local["https%3A%2F%2Flegacy.example%2F%2A"], undefined);

  env.local.__mcpAllowWrite = false;
});

test("add_rule refuses to grow past the rule cap", async () => {
  env.local.__mcpAllowWrite = true;
  const before = new Set(Object.keys(env.local));
  for (let i = 1000; i < 1000 + MAX_RULES; i += 1) {
    env.local[String(i)] = { ...baseRule, url: `https://cap${i}.example/*` };
  }

  const overflow = await mcp("addRule", {
    url: "https://overflow.example/*",
    code: "x()",
  });
  assert.match(overflow.error, /too many rules/i);

  for (const key of Object.keys(env.local)) {
    if (!before.has(key)) delete env.local[key];
  }
  env.local.__mcpAllowWrite = false;
});

test("a consented rule change is stored, audited and removable", async () => {
  env.local.__mcpAllowWrite = true;
  const added = await mcp("addRule", {
    nickname: "AI",
    url: "https://ai.example/*",
    code: "console.log(1)",
    jquery: "jquery3",
  });

  assert.equal(added.success, true);
  assert.match(added.id, /^[1-9]\d*$/);
  assert.equal(env.local[added.id].code, "console.log(1)");
  assert.ok(Array.isArray(env.local.__mcpAudit));
  assert.ok(env.local.__mcpAudit.some((entry) => entry.action === "addRule" && entry.ok));

  const deleted = await mcp("deleteRule", { id: added.id });
  assert.equal(deleted.success, true);
  assert.equal(env.local[added.id], undefined);
  env.local.__mcpAllowWrite = false;
});

test("run-script refuses non-injectable tabs and executes only with consent", async () => {
  env.local.__mcpAllowRunScript = true;

  const originalQuery = globalThis.chrome.tabs.query;
  globalThis.chrome.tabs.query = async () => [{ id: 7, url: "chrome://extensions" }];
  const blocked = await mcp("injectScriptOnActiveTab", { code: "alert(1)" });
  assert.match(blocked.error, /not an injectable/i);
  globalThis.chrome.tabs.query = originalQuery;

  const before = env.executed.length;
  const ran = await mcp("injectScriptOnActiveTab", { code: "console.log(2)" });
  assert.equal(ran.success, true);
  assert.equal(env.executed.length, before + 1);
  assert.equal(env.executed.at(-1).target.allFrames, true);
  env.local.__mcpAllowRunScript = false;
});

test("content-script rules only run for their own frame and matching URL", async () => {
  const before = env.executed.length;

  /* about:blank iframes, extension pages and non-matching frames get nothing. */
  assert.deepEqual(await send({ state: "beforeLoad" }, { url: "about:blank", tab: { id: 1 }, frameId: 4 }), {
    start: [],
    end: [],
    idle: [],
  });
  assert.deepEqual(
    await send({ state: "beforeLoad" }, { url: "https://unrelated.example/", tab: { id: 1 }, frameId: 0 }),
    { start: [], end: [], idle: [] }
  );
  assert.equal(env.executed.length, before);

  const groups = await send(
    { state: "beforeLoad" },
    { url: "https://match.example/x", tab: { id: 1 }, frameId: 3 }
  );
  assert.deepEqual(groups.start, ["1"]);
  assert.deepEqual(groups.end, []);
  assert.deepEqual(groups.idle, []);

  /* Rule 1 is scoped to match.example — asking for it in another frame's URL
     must not execute it there. */
  await send({ state: "runRules", ruleIds: ["1"] }, {
    url: "https://other.example/x",
    tab: { id: 1 },
    frameId: 9,
  });
  assert.equal(env.executed.length, before);

  await send({ state: "runRules", ruleIds: ["1"] }, {
    url: "https://match.example/x",
    tab: { id: 1 },
    frameId: 3,
  });
  assert.equal(env.executed.length, before + 1);
  assert.deepEqual(env.executed.at(-1).target, { tabId: 1, frameIds: [3] });
});

test("master switch off stops injection entirely", async () => {
  env.local.__globalEnabled = false;
  env.emit({ __globalEnabled: { oldValue: true, newValue: false } });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const before = env.executed.length;

  assert.deepEqual(
    await send({ state: "beforeLoad" }, { url: "https://match.example/x", tab: { id: 1 }, frameId: 0 }),
    { start: [], end: [], idle: [] }
  );
  await send({ state: "runRules", ruleIds: ["1"] }, {
    url: "https://match.example/x",
    tab: { id: 1 },
    frameId: 0,
  });
  assert.equal(env.executed.length, before);
  env.local.__globalEnabled = true;
});

test("unknown MCP actions are rejected", async () => {
  const result = await mcp("rm -rf /", {});
  assert.match(result.error, /unknown mcp action/i);
});

test("enabling MCP without a pairing token never starts a socket loop", async () => {
  delete env.local.__mcpToken;
  env.local.__mcpEnabled = true;
  const before = env.messages.filter((m) => m?.type === "CONNECT_MCP").length;

  env.emit({ __mcpEnabled: { oldValue: false, newValue: true } });
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(env.messages.filter((m) => m?.type === "CONNECT_MCP").length, before);
  env.local.__mcpEnabled = false;
});
