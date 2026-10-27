import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MCP_URL,
  normalizeLoopbackUrl,
  withMcpToken,
} from "../public/mcp-url.js";

test("loopback WebSocket URLs are accepted and canonicalised", () => {
  assert.equal(DEFAULT_MCP_URL, "ws://127.0.0.1:3000/mcp");
  assert.equal(normalizeLoopbackUrl("ws://localhost:3000/mcp"), "ws://localhost:3000/mcp");
  assert.equal(normalizeLoopbackUrl("ws://127.0.0.1:3000/mcp"), "ws://127.0.0.1:3000/mcp");
  assert.equal(normalizeLoopbackUrl("wss://localhost/mcp"), "wss://localhost/mcp");
});

test("non-loopback hosts, schemes and credentials are rejected", () => {
  assert.equal(normalizeLoopbackUrl("ws://example.com/mcp"), null);
  assert.equal(normalizeLoopbackUrl("wss://10.0.0.5/mcp"), null);
  assert.equal(normalizeLoopbackUrl("ws://[::1]:3000/mcp"), null);
  assert.equal(normalizeLoopbackUrl("https://localhost/mcp"), null);
  assert.equal(normalizeLoopbackUrl("ws://user:pass@localhost/mcp"), null);
  assert.equal(normalizeLoopbackUrl("server.local"), null);
  assert.equal(normalizeLoopbackUrl(""), null);
  assert.equal(normalizeLoopbackUrl(null), null);
});

test("query strings and fragments are dropped before the token is applied", () => {
  assert.equal(
    normalizeLoopbackUrl("ws://localhost:3000/mcp?token=old#frag"),
    "ws://localhost:3000/mcp"
  );
});

test("withMcpToken appends the token without leaking it into the path", () => {
  const url = withMcpToken("ws://127.0.0.1:3000/mcp", "abc123");
  assert.equal(url, "ws://127.0.0.1:3000/mcp?token=abc123");

  const parsed = new URL(url);
  assert.equal(parsed.pathname, "/mcp");
  assert.equal(parsed.searchParams.get("token"), "abc123");
});

test("withMcpToken refuses a remote host", () => {
  assert.equal(withMcpToken("ws://evil.example/mcp", "abc123"), null);
});
