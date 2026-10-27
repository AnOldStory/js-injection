import test from "node:test";
import assert from "node:assert/strict";

import { migrateIfNeeded, replaceAll, appendAudit, saveRule, deleteRule, MAX_RULES, isNumericId } from "../public/rule-store.js";

/**
 * Minimal in-memory chrome.storage.local / .sync up to the surface rule-store
 * uses.  `failNextSet` lets a test prove that a failed write cannot destroy the
 * existing rules first.
 */
function installFakeChrome(localSeed = {}, syncSeed = {}) {
  const local = structuredClone(localSeed);
  const sync = structuredClone(syncSeed);
  let failNextSet = false;

  const getArea = (map) => ({
    async get(keys) {
      if (keys === null || keys === undefined) return structuredClone(map);
      if (typeof keys === "string") return { [keys]: structuredClone(map[keys]) };
      if (Array.isArray(keys)) {
        const out = {};
        for (const key of keys) out[key] = structuredClone(map[key]);
        return out;
      }
      return structuredClone(map);
    },
    async set(values) {
      if (failNextSet) {
        failNextSet = false;
        throw new Error("QUOTA_BYTES quota exceeded");
      }
      Object.assign(map, structuredClone(values));
    },
    async remove(keys) {
      for (const key of [].concat(keys)) delete map[key];
    },
  });

  const chrome = {
    storage: {
      local: getArea(local),
      sync: getArea(sync),
    },
  };

  globalThis.chrome = chrome;
  globalThis.chrome.__failNextLocalSet = () => {
    failNextSet = true;
  };
  globalThis.chrome.__state = { local, sync };
  return chrome;
}

const legacyRule = { url: "https://legacy.example/*", code: "legacy()" };

test("migration copies sync rules into local without deleting anything", async () => {
  const chrome = installFakeChrome(
    {},
    {
      version: "3.2.0",
      __globalEnabled: false,
      "https%3A%2F%2Flegacy.example%2F%2A": legacyRule,
      "2": { url: "https://keep.example/*", code: "keep()" },
    }
  );

  const { rules, prefs } = await migrateIfNeeded("3.5.0");

  assert.equal(prefs.version, "3.5.0");
  assert.equal(prefs.__globalEnabled, false);
  assert.deepEqual(Object.keys(rules).sort(), ["2", "3"]);
  assert.equal(rules["2"].code, "keep()");
  assert.equal(rules["3"].code, "legacy()");

  /* The old storage.sync data is still there (non-destructive). */
  assert.equal(chrome.__state.sync.version, "3.2.0");
  assert.ok(chrome.__state.sync["https%3A%2F%2Flegacy.example%2F%2A"]);

  /* Legacy key was replaced by the numeric id, not duplicated. */
  assert.equal(chrome.__state.local["https%3A%2F%2Flegacy.example%2F%2A"], undefined);
  assert.equal(chrome.__state.local["3"].url, "https://legacy.example/*");
  assert.equal(chrome.__state.local.__migratedFromSync, true);
});

test("migration never inherits MCP consent, token or audit from sync", async () => {
  const chrome = installFakeChrome(
    {},
    {
      version: "3.2.0",
      "1": { url: "https://legacy.example/*", code: "legacy()" },
      __mcpEnabled: true,
      __mcpAllowWrite: true,
      __mcpAllowRunScript: true,
      __mcpExposeCode: true,
      __mcpToken: "stale-synced-token",
      __mcpAudit: [{ action: "addRule", ok: true }],
    }
  );

  const { rules, prefs } = await migrateIfNeeded("3.5.0");

  assert.equal(rules["1"].code, "legacy()");
  for (const key of [
    "__mcpEnabled",
    "__mcpAllowWrite",
    "__mcpAllowRunScript",
    "__mcpExposeCode",
    "__mcpToken",
    "__mcpAudit",
  ]) {
    assert.equal(chrome.__state.local[key], undefined, `${key} must not be migrated`);
    assert.equal(prefs[key], undefined, `${key} must not be returned as a preference`);
  }

  /* Sync itself is left untouched (non-destructive migration). */
  assert.equal(chrome.__state.sync.__mcpAllowWrite, true);
  assert.equal(chrome.__state.sync.__mcpToken, "stale-synced-token");
});

test("migration is idempotent once the version matches", async () => {
  const chrome = installFakeChrome(
    {
      version: "3.5.0",
      __migratedFromSync: true,
      __globalEnabled: true,
      "1": { url: "https://a.example/*", code: "a()" },
    },
    {}
  );

  const { rules } = await migrateIfNeeded("3.5.0");

  assert.deepEqual(Object.keys(rules), ["1"]);
  assert.equal(rules["1"].code, "a()");
  assert.equal(chrome.__state.local.version, "3.5.0");
});

test("migration repairs legacy keys even when the version string is current", async () => {
  const chrome = installFakeChrome({
    version: "3.5.0",
    __migratedFromSync: true,
    "https%3A%2F%2Fold.example%2F%2A": {
      url: "https://old.example/*",
      code: "old()",
    },
  });

  const { rules } = await migrateIfNeeded("3.5.0");

  assert.deepEqual(Object.keys(rules), ["1"]);
  assert.equal(rules["1"].code, "old()");
  assert.equal(chrome.__state.local["https%3A%2F%2Fold.example%2F%2A"], undefined);
  assert.equal(chrome.__state.local["1"].url, "https://old.example/*");
});

test("an unavailable storage.sync does not block local migration", async () => {
  const chrome = installFakeChrome({ version: "3.2.0", __globalEnabled: false }, {});
  chrome.storage.sync.get = async () => {
    throw new Error("Sync is disabled by policy");
  };

  const { rules, prefs } = await migrateIfNeeded("3.5.0");

  assert.deepEqual(rules, {});
  assert.equal(prefs.version, "3.5.0");
  assert.equal(prefs.__globalEnabled, false);
  assert.equal(chrome.__state.local.version, "3.5.0");
  assert.equal(chrome.__state.local.__migratedFromSync, true);
});

test("audit entries are truncated so one failure cannot fill storage", async () => {
  const chrome = installFakeChrome({});

  await appendAudit({
    action: "x".repeat(500),
    id: "1".repeat(500),
    url: "https://example.com/" + "u".repeat(10000),
    error: "e".repeat(10000),
    ok: false,
  });

  const [entry] = chrome.__state.local.__mcpAudit;
  assert.equal(entry.action.length, 64);
  assert.equal(entry.id.length, 64);
  assert.equal(entry.url.length, 2048);
  assert.equal(entry.error.length, 500);
  assert.equal(entry.ok, false);
});

test("saveRule enforces the rule cap for new rules but still updates existing ones", async () => {
  const seed = { version: "3.5.0", __migratedFromSync: true };
  for (let i = 1; i <= MAX_RULES; i += 1) {
    seed[String(i)] = { url: `https://r${i}.example/*`, code: "x()" };
  }
  const chrome = installFakeChrome(seed);

  await assert.rejects(
    () => saveRule(String(MAX_RULES + 1), { url: "https://new.example/*", code: "x()" }),
    /too many rules/
  );
  assert.equal(chrome.__state.local[String(MAX_RULES + 1)], undefined);

  /* Updating an existing rule must not be blocked by the cap. */
  await saveRule("1", { url: "https://r1.example/*", code: "updated()" });
  assert.equal(chrome.__state.local["1"].code, "updated()");
});

test("saveRule and deleteRule reject legacy / non-numeric ids", async () => {
  const chrome = installFakeChrome({
    version: "3.5.0",
    __migratedFromSync: true,
    "https%3A%2F%2Fold.example%2F%2A": { url: "https://old.example/*", code: "old()" },
  });

  await assert.rejects(
    () => saveRule("https%3A%2F%2Fold.example%2F%2A", { url: "https://old.example/*", code: "x()" }),
    /invalid rule id/
  );
  await assert.rejects(() => deleteRule("https%3A%2F%2Fold.example%2F%2A"), /invalid rule id/);
  await assert.rejects(() => deleteRule("__mcpToken"), /invalid rule id/);
  assert.ok(chrome.__state.local["https%3A%2F%2Fold.example%2F%2A"]);
});

test("ids longer than the MCP limit are treated as legacy and renumbered", async () => {
  const longId = "1".repeat(20);
  assert.equal(isNumericId(longId), false);

  const chrome = installFakeChrome({
    version: "3.5.0",
    __migratedFromSync: true,
    [longId]: { url: "https://long.example/*", code: "long()" },
  });

  const { rules } = await migrateIfNeeded("3.5.0");
  assert.equal(Object.keys(rules).length, 1);
  assert.equal(isNumericId(Object.keys(rules)[0]), true);
  assert.equal(rules[Object.keys(rules)[0]].code, "long()");
  assert.equal(chrome.__state.local[longId], undefined);
});

test("a failed write during replaceAll leaves the old rules intact", async () => {
  const chrome = installFakeChrome({
    version: "3.4.0",
    "1": { url: "https://old.example/*", code: "old()" },
  });

  chrome.__failNextLocalSet();

  await assert.rejects(() => replaceAll({ "9": { url: "https://new.example/*" } }, { version: "3.5.0" }), /quota/i);

  assert.equal(chrome.__state.local["1"].code, "old()");
  assert.equal(chrome.__state.local["9"], undefined);
});
