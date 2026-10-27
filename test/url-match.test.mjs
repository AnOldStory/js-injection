import test from "node:test";
import assert from "node:assert/strict";

import {
  compileRulePattern,
  isInjectableUrl,
  matchesRule,
} from "../public/url-match.js";

test("wildcard subdomain does not match a substring in the path or query", () => {
  assert.equal(
    matchesRule("https://*.bank.com/*", "https://evil.example/?next=https://x.bank.com/login"),
    false
  );
  assert.equal(matchesRule("https://*.bank.com/*", "https://evil.example/.bank.com/x"), false);
  assert.equal(matchesRule("https://*.bank.com/*", "https://bank.com.evil.example/"), false);
  assert.equal(matchesRule("https://*.bank.com/*", "https://www.bank.com/login"), true);
  assert.equal(matchesRule("https://*.bank.com/*", "https://bank.com/"), true);
  assert.equal(matchesRule("https://*.bank.com/*", "https://a.b.bank.com/x"), true);
});

test("path globs are anchored", () => {
  assert.equal(matchesRule("https://example.com/", "https://example.com/anything"), false);
  assert.equal(matchesRule("https://example.com/*", "https://example.com/anything"), true);
  assert.equal(matchesRule("https://example.com/app/*", "https://example.com/app/a/b"), true);
  assert.equal(matchesRule("https://example.com/app/*", "https://example.com/other/app/x"), false);
});

test("a pattern without a path matches every path", () => {
  assert.equal(matchesRule("https://example.com", "https://example.com/anything"), true);
  assert.equal(matchesRule("https://example.com", "https://example.com/a?b=c"), true);
});

test("scheme, port and IPv6 hosts are compared exactly", () => {
  assert.equal(matchesRule("https://*/*", "https://anything.example/"), true);
  assert.equal(matchesRule("*://*/*", "http://a.example/x"), true);
  assert.equal(matchesRule("https://example.com/*", "http://example.com/x"), false);
  assert.equal(matchesRule("https://example.com:8443/*", "https://example.com:8443/x"), true);
  assert.equal(matchesRule("https://example.com:8443/*", "https://example.com/x"), false);
  assert.equal(matchesRule("https://[::1]:3000/*", "https://[::1]:3000/x"), true);
});

test("file URLs work without an authority", () => {
  assert.equal(matchesRule("file:///*", "file:///home/user/page.html"), true);
  assert.equal(matchesRule("file:///home/*", "file:///home/user/page.html"), true);
  assert.equal(matchesRule("file:///home/*", "file:///tmp/page.html"), false);
});

test("query strings and fragments are part of the path match", () => {
  assert.equal(matchesRule("https://example.com/*?a=1", "https://example.com/x?a=1"), true);
  assert.equal(matchesRule("https://example.com/*?a=1", "https://example.com/x?a=2"), false);
});

test("invalid patterns are rejected at compile time", () => {
  assert.equal(compileRulePattern("not a pattern"), null);
  assert.equal(compileRulePattern("https://*foo.com/*"), null);
  assert.equal(compileRulePattern("javascript://example.com/*"), null);
  assert.equal(compileRulePattern(""), null);
});

test("unparseable URLs never match", () => {
  assert.equal(matchesRule("https://example.com/*", "not a url"), false);
  assert.equal(matchesRule("https://example.com/*", ""), false);
});

test("isInjectableUrl only allows http(s) and file", () => {
  assert.equal(isInjectableUrl("https://example.com/"), true);
  assert.equal(isInjectableUrl("http://example.com/"), true);
  assert.equal(isInjectableUrl("file:///tmp/a.html"), true);
  assert.equal(isInjectableUrl("chrome://extensions"), false);
  assert.equal(isInjectableUrl("about:blank"), false);
});
