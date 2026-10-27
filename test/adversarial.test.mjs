/**
 * Adversarial regression tests: inputs an attacker (or a confused user) could
 * supply to the URL matcher, the loopback validator and the backup parser.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { compileRulePattern, matchesRule } from "../public/url-match.js";
import { isMissingUserScriptsApi } from "../public/execute.js";
import { normalizeLoopbackUrl } from "../public/mcp-url.js";
import { parseBackup } from "../public/rule-store.js";

const RULE = "https://*.bank.com/*";

test("URL matcher cannot be smuggled into another origin", () => {
  const attacks = [
    "https://evil.example/?next=https://x.bank.com/",
    "https://evil.example/.bank.com/x",
    "https://bank.com.evil.example/",
    "https://sub.bank.com.evil.example/",
    "https://bank.com@evil.example/",
    "https://bank.com%2eevil.example/",
    "https://bank.com%00.evil.example/",
    "https://evil.example\\@bank.com/",
    "javascript://bank.com/%0aalert(1)",
    "data:text/html,https://bank.com/",
    "blob:https://bank.com/1234",
    "not a url",
    "",
  ];
  for (const url of attacks) {
    assert.equal(matchesRule(RULE, url), false, `must not match ${url}`);
  }
});

test("URL matcher is case-insensitive for scheme and host only", () => {
  assert.equal(matchesRule(RULE, "https://BANK.COM/x"), true);
  assert.equal(matchesRule("HTTPS://*.Bank.COM/*", "https://www.bank.com/x"), true);
  assert.equal(matchesRule("https://example.com/Case/*", "https://example.com/case/x"), false);
});

test("`*` scheme means http(s) only, like Chrome match patterns", () => {
  assert.equal(matchesRule("*://*/*", "https://example.com/x"), true);
  assert.equal(matchesRule("*://*/*", "http://example.com/x"), true);
  assert.equal(matchesRule("*://*/*", "file:///etc/passwd"), false);
  assert.equal(matchesRule("*://*/*", "ftp://example.com/x"), false);
  assert.equal(matchesRule("*://*/*", "ws://localhost/socket"), false);
  assert.equal(matchesRule("file:///*", "file:///tmp/a.html"), true);
});

test("explicit default ports still match (URL parser drops them)", () => {
  assert.equal(matchesRule("https://example.com:443/*", "https://example.com/x"), true);
  assert.equal(matchesRule("http://example.com:80/*", "http://example.com/x"), true);
  assert.equal(matchesRule("wss://example.com:443/*", "wss://example.com/x"), true);
  assert.equal(matchesRule("https://example.com:8443/*", "https://example.com/x"), false);
  assert.equal(matchesRule("https://example.com:8443/*", "https://example.com:8443/x"), true);
  /* Leading zeros are a valid URL spelling of the same port. */
  assert.equal(matchesRule("https://example.com:0443/*", "https://example.com/x"), true);
  assert.equal(matchesRule("https://example.com:08443/*", "https://example.com:8443/x"), true);
});

test("only API-gate failures trigger the eval fallback, never user errors", () => {
  const unavailable = [
    "User scripts API is not available",
    "The 'userScripts' API is not available",
    "This extension does not have the 'userScripts' permission",
    "Developer mode is required to use user scripts",
    "Allow user scripts in the extension details page",
  ];
  for (const message of unavailable) {
    assert.equal(isMissingUserScriptsApi(new Error(message)), true, message);
  }

  const userErrors = [
    "permission denied",
    "Operation is not allowed",
    "Service not available",
    "TypeError: cannot read properties of undefined (reading 'foo')",
    "Error: the server replied with 403",
  ];
  for (const message of userErrors) {
    assert.equal(isMissingUserScriptsApi(new Error(message)), false, message);
  }
});

test("internationalised hostnames are matched in punycode form", () => {
  assert.equal(matchesRule("https://*.한국.com/*", "https://www.한국.com/x"), true);
  assert.equal(matchesRule("https://한국.com/*", "https://한국.com/x"), true);
  assert.equal(matchesRule("https://xn--3e0b707e.com/*", "https://한국.com/x"), true);
  assert.equal(matchesRule("https://*.한국.com/*", "https://xn--3e0b707e.com/x"), true);
  assert.equal(matchesRule("https://*.한국.com/*", "https://evil.example/x"), false);
});

test("internationalised paths are matched in percent-encoded form", () => {
  assert.equal(matchesRule("https://example.com/한글/*", "https://example.com/한글/x"), true);
  assert.equal(
    matchesRule("https://example.com/한글/*", "https://example.com/%ED%95%9C%EA%B8%80/x"),
    true
  );
  assert.equal(matchesRule("https://example.com/한글/*", "https://example.com/hangul/x"), false);
  assert.equal(matchesRule("file:///tmp/한글/*", "file:///tmp/한글/a.html"), true);
});

test("path globs with many wildcards stay linear", () => {
  const manyStars = "https://example.com/" + "*".repeat(2000);
  const longPath = "https://example.com/" + "a".repeat(2000);
  const started = Date.now();
  assert.equal(matchesRule(manyStars, longPath), true);
  assert.equal(matchesRule("https://example.com/" + "*a".repeat(500) + "*", longPath), true);
  assert.ok(Date.now() - started < 1000, "glob matching must not backtrack exponentially");
});

test("patterns that could never match are rejected at save time", () => {
  const invalid = [
    "https://exa mple.com/*",
    "https://exa\tmple.com/*",
    "https://example.com/a b/*",
    "https://example.com/한 글/*",
    "https://exa%6dple.com/*",
    "https://user@example.com/*",
    "https://example.com:0/*",
    "https://example.com:99999/*",
    "https://example.com:+443/*",
    "https://**.example.com/*",
    "https://exa*mple.com/*",
    "https://example.com#evil/*",
    "https://example.com?x/*",
    "https://evil.example\\@bank.com/*",
    "https://*foo.com/*",
    "not a pattern",
    "",
    undefined,
  ];
  for (const pattern of invalid) {
    assert.equal(compileRulePattern(pattern), null, `must reject ${String(pattern)}`);
  }
});

test("loopback validator rejects host-smuggling attempts", () => {
  const attacks = [
    "ws://localhost.evil.com/mcp",
    "ws://127.0.0.1.evil.com/mcp",
    "ws://127.0.0.1%2eevil.com/mcp",
    "ws://127.0.0.1@evil.com/mcp",
    "ws://user:pass@localhost/mcp",
    "ws://evil.com#@localhost/mcp",
    "ws://evil.com?@localhost/mcp",
    "ws://evil.com\\@localhost/mcp",
    "ws://127.0.0.2/mcp",
    "ws://10.0.0.1/mcp",
    "ws://[::1]/mcp",
    "ws://[::ffff:127.0.0.1]/mcp",
    "https://localhost/mcp",
    "ftp://localhost/mcp",
    "javascript:alert(1)",
    "",
    null,
  ];
  for (const url of attacks) {
    assert.equal(normalizeLoopbackUrl(url), null, `must reject ${String(url)}`);
  }
});

test("loopback aliases that the URL parser resolves to 127.0.0.1 stay loopback", () => {
  for (const url of ["ws://2130706433/mcp", "ws://0x7f.0.0.1/mcp", "ws://127.1/mcp"]) {
    assert.equal(normalizeLoopbackUrl(url), "ws://127.0.0.1/mcp");
  }
});

test("backup parser cannot pollute Object.prototype and renumbers unsafe ids", () => {
  /* Written as a raw string so `__proto__` is a real JSON key, not an object
     literal prototype assignment. */
  const payload = `{
    "format": "js-injection-backup",
    "rules": {
      "__proto__": { "url": "https://evil.example/*" },
      "../../etc/passwd": { "url": "https://a.example/*", "code": "a()" },
      "constructor": { "url": "https://b.example/*", "code": "b()" },
      "7": { "url": "https://c.example/*", "code": "c()" }
    },
    "prefs": { "__proto__": { "polluted": true }, "__mcpToken": "steal", "__mcpAllowWrite": true }
  }`;

  const parsed = parseBackup(payload);
  assert.equal(parsed.ok, true);
  assert.equal({}.polluted, undefined);
  assert.equal(parsed.prefs.__mcpToken, undefined);
  assert.equal(parsed.prefs.__mcpAllowWrite, undefined);

  /* Numeric id preserved; every other key renumbered into the numeric space. */
  assert.equal(parsed.rules["7"].url, "https://c.example/*");
  assert.ok(Object.keys(parsed.rules).every((id) => /^[1-9]\d*$/.test(id)));
  const urls = Object.values(parsed.rules).map((rule) => rule.url);
  assert.ok(urls.includes("https://a.example/*"));
  assert.ok(urls.includes("https://b.example/*"));
  assert.equal(urls.includes("https://evil.example/*"), false);
});

test("backup parser rejects oversized rules and malformed structures", () => {
  assert.equal(parseBackup(JSON.stringify({ "1": { url: "https://a.example/*", code: "x".repeat(1024 * 1024 + 1) } })).ok, false);
  assert.equal(parseBackup('{"format":"js-injection-backup"}').ok, false);
  assert.equal(parseBackup('{"1":[]}').ok, false);
});
