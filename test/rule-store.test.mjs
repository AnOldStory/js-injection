import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_RULE_BYTES,
  assignNumericIds,
  buildBackup,
  isNumericId,
  isRuleKey,
  migrateRules,
  nextRuleId,
  parseBackup,
  sanitizeRule,
  validateRule,
} from "../public/rule-store.js";

const validRule = {
  nickname: "Example",
  url: "https://*.example.com/*",
  code: "console.log(1)",
  cssCode: "body { color: red; }",
  jquery: "none",
  enabled: true,
  unlockRightClick: false,
  runAt: "document_start",
  tags: "a,b",
};

test("validateRule accepts a normal rule and normalises defaults", () => {
  const check = validateRule(validRule);
  assert.equal(check.ok, true);
  assert.equal(check.value.runAt, "document_start");
  assert.equal(check.value.jquery, "none");
  assert.equal(check.value.tags, "a,b");
});

test("validateRule rejects missing / invalid URLs and bad options", () => {
  assert.equal(validateRule({ ...validRule, url: "" }).ok, false);
  assert.equal(validateRule({ ...validRule, url: "not a url" }).ok, false);
  assert.equal(validateRule({ ...validRule, runAt: "document_now" }).ok, false);
  assert.equal(validateRule({ ...validRule, jquery: "tailwind" }).ok, false);
  assert.equal(validateRule({ ...validRule, code: "x".repeat(MAX_RULE_BYTES + 1) }).ok, false);
  assert.equal(validateRule({ ...validRule, url: `https://example.com/${"a".repeat(2048)}/*` }).ok, false);
  assert.equal(validateRule({ ...validRule, nickname: "n".repeat(257) }).ok, false);
  assert.equal(validateRule({ ...validRule, tags: "t".repeat(1025) }).ok, false);
  assert.equal(validateRule(null).ok, false);
  assert.equal(validateRule([]).ok, false);
});

test("sanitizeRule understands v1 arrays, strings and jquery booleans", () => {
  const fromArray = sanitizeRule(["console.log(1)", "body{}"], "https%3A%2F%2Fexample.com%2F%2A");
  assert.equal(fromArray.url, "https://example.com/*");
  assert.equal(fromArray.code, "console.log(1)");
  assert.equal(fromArray.cssCode, "body{}");

  const fromString = sanitizeRule("alert(1)", "https%3A%2F%2Fexample.com%2F");
  assert.equal(fromString.url, "https://example.com/");
  assert.equal(fromString.code, "alert(1)");

  const oldJquery = sanitizeRule({ url: "https://example.com/*", jquery: true }, "1");
  assert.equal(oldJquery.jquery, "jquery3");

  assert.equal(sanitizeRule({ url: "garbage" }, "1"), null);
  assert.equal(sanitizeRule(null, "1"), null);
});

test("migrateRules keeps preferences out of the rule map", () => {
  const { rules, prefs } = migrateRules(
    {
      version: "3.4.0",
      __globalEnabled: false,
      __lang: "en",
      __draft_1: { url: "https://draft.example/*" },
      "1": validRule,
    },
    "3.5.0"
  );

  assert.deepEqual(Object.keys(rules), ["1"]);
  assert.equal(prefs.version, "3.5.0");
  assert.equal(prefs.__globalEnabled, false);
  assert.equal(prefs.__lang, "en");
});

test("migrateRules renumbers legacy URL keys so the router can open them", () => {
  const { rules } = migrateRules(
    {
      version: "3.2.0",
      "5": validRule,
      "https%3A%2F%2Flegacy.example%2F%2A": {
        url: "https://legacy.example/*",
        code: "legacy()",
      },
    },
    "3.5.0"
  );

  assert.deepEqual(Object.keys(rules).sort(), ["5", "6"]);
  assert.equal(rules["5"].url, validRule.url);
  assert.equal(rules["6"].url, "https://legacy.example/*");
  assert.equal(rules["6"].code, "legacy()");
  assert.ok(Object.keys(rules).every((key) => /^[1-9]\d*$/.test(key)));
});

test("nextRuleId ignores preferences and picks the next numeric id", () => {
  assert.equal(nextRuleId({ "1": {}, "9": {}, __globalEnabled: true, x: {} }), "10");
  assert.equal(nextRuleId({}), "1");
});

test("isRuleKey rejects preferences, drafts and the schema version", () => {
  assert.equal(isRuleKey("12"), true);
  assert.equal(isRuleKey("__mcpToken"), false);
  assert.equal(isRuleKey("__draft_12"), false);
  assert.equal(isRuleKey("version"), false);
});

test("isNumericId matches the MCP server's id contract", () => {
  assert.equal(isNumericId("1"), true);
  assert.equal(isNumericId(String(Date.now())), true);
  assert.equal(isNumericId("0"), false);
  assert.equal(isNumericId("01"), false);
  assert.equal(isNumericId("1".repeat(17)), false);
  assert.equal(isNumericId("https%3A%2F%2Fexample.com%2F%2A"), false);
  assert.equal(isNumericId("__proto__"), false);
});

test("id allocation never emits a 17-digit id", () => {
  const taken = {
    "1": validRule,
    "9999999999999999": validRule,
  };
  const next = nextRuleId(taken);
  assert.equal(isNumericId(next), true);
  assert.equal(next, "2");

  const rules = assignNumericIds({
    "9999999999999999": validRule,
    legacy: validRule,
  });
  for (const id of Object.keys(rules)) {
    assert.equal(isNumericId(id), true, `${id} must be a valid id`);
  }
  assert.equal(rules["1"].url, validRule.url);
});

test("backup round-trips rules but never carries the MCP token or consent", () => {
  const json = buildBackup(
    { "1": validRule },
    {
      __globalEnabled: false,
      __lang: "en",
      __mcpToken: "secret",
      __mcpAllowWrite: true,
      __mcpAllowRunScript: true,
      __mcpAudit: [{ action: "addRule" }],
    }
  );

  assert.equal(json.includes("secret"), false);
  assert.equal(json.includes("__mcpAllowWrite"), false);

  const parsed = parseBackup(json);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.count, 1);
  assert.equal(parsed.prefs.__globalEnabled, false);
  assert.equal(parsed.prefs.__lang, "en");
  assert.equal(parsed.prefs.__mcpAllowWrite, undefined);
  assert.deepEqual(parsed.rules["1"].url, validRule.url);
});

test("parseBackup accepts the old flat shape", () => {
  const parsed = parseBackup(JSON.stringify({ "1": validRule, version: "3.4.0" }));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.count, 1);
});

test("parseBackup rejects the whole file when one rule is invalid", () => {
  const parsed = parseBackup(
    JSON.stringify({
      format: "js-injection-backup",
      rules: { "1": validRule, "2": { url: "garbage" } },
    })
  );
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /rule "2"/);
});

test("parseBackup rejects malformed input", () => {
  assert.equal(parseBackup("not json").ok, false);
  assert.equal(parseBackup("[]").ok, false);
  assert.equal(parseBackup('{"rules": []}').ok, false);
});

test("parseBackup never imports MCP consent flags", () => {
  const parsed = parseBackup(
    JSON.stringify({
      format: "js-injection-backup",
      rules: { "1": validRule },
      prefs: { __globalEnabled: true, __mcpAllowWrite: true, __mcpToken: "x" },
    })
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.prefs.__mcpAllowWrite, undefined);
  assert.equal(parsed.prefs.__mcpToken, undefined);
});
