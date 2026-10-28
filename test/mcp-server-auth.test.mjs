/**
 * Auth/lifecycle tests for the local MCP WebSocket bridge.
 *
 * These spawn the real `mcp-server.js` on a free loopback port and speak the
 * actual WebSocket handshake, so a regression in the Origin allow-list, the
 * token check, the path check or socket replacement fails here.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync, chmodSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXTENSION_ORIGIN = `chrome-extension://${"a".repeat(32)}`;

let child = null;
let port = 0;
let token = "";
let tokenFile = "";
let stderr = "";
const stdoutMessages = [];
let stdoutBuffer = "";

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port: p } = srv.address();
      srv.close(() => resolve(p));
    });
  });
}

function waitFor(predicate, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeout) {
        clearInterval(timer);
        reject(new Error("timed out waiting for the MCP server"));
      }
    }, 25);
  });
}

/** Resolve with the outcome of a WebSocket handshake. */
function handshake(url, options = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, options);
    ws.on("open", () => resolve({ kind: "open", ws }));
    ws.on("unexpected-response", (_req, res) => resolve({ kind: "status", code: res.statusCode }));
    ws.on("error", () => resolve({ kind: "error" }));
  });
}

before(async () => {
  port = await freePort();
  const dir = mkdtempSync(join(tmpdir(), "js-injection-mcp-test-"));
  tokenFile = join(dir, "token");

  child = spawn(process.execPath, ["mcp-server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      JS_INJECTION_MCP_PORT: String(port),
      JS_INJECTION_MCP_TOKEN_FILE: tokenFile,
      JS_INJECTION_MCP_TOKEN: "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk.toString();
    let index = stdoutBuffer.indexOf("\n");
    while (index !== -1) {
      const line = stdoutBuffer.slice(0, index).trim();
      stdoutBuffer = stdoutBuffer.slice(index + 1);
      if (line) {
        try {
          stdoutMessages.push(JSON.parse(line));
        } catch {
          /* ignore non-JSON output */
        }
      }
      index = stdoutBuffer.indexOf("\n");
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  await waitFor(() => stderr.includes("listening") || child.exitCode !== null);
  assert.equal(child.exitCode, null, `server exited early: ${stderr}`);
  token = readFileSync(tokenFile, "utf8").trim();
  child.__dir = dir;
});

after(() => {
  if (child && child.exitCode === null) child.kill("SIGTERM");
  if (child?.__dir) rmSync(child.__dir, { recursive: true, force: true });
});

const url = (path = "/mcp", q = "") =>
  `ws://127.0.0.1:${port}${path}${q ? `?${q}` : ""}`;

/** Send one JSON-RPC line to the server's stdin and wait for its response. */
function rpc(message, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no response for ${message.id}`)), timeout);
    const poll = setInterval(() => {
      const found = stdoutMessages.find((entry) => entry.id === message.id);
      if (!found) return;
      clearInterval(poll);
      clearTimeout(timer);
      resolve(found);
    }, 10);
    child.stdin.write(`${JSON.stringify(message)}\n`);
  });
}

test("token file is created private and long enough", () => {
  assert.equal(token.length >= 40, true);
  const mode = statSync(tokenFile).mode & 0o777;
  assert.equal(mode.toString(8), "600");
});

test("handshake rejects a missing token, a wrong path and a web Origin", async () => {
  assert.equal((await handshake(url("/mcp"))).code, 401);
  assert.equal((await handshake(url("/mcp", "token=wrong"))).code, 401);
  /* `ws` aborts non-matching paths with 400 before verifyClient can answer 404;
     either way the upgrade is refused. */
  const wrongPath = await handshake(url("/other", `token=${token}`));
  assert.ok([400, 404].includes(wrongPath.code), `unexpected status ${wrongPath.code}`);
  assert.equal(
    (await handshake(url("/mcp", `token=${token}`), { origin: "https://evil.example" })).code,
    403
  );
  assert.equal(
    (await handshake(url("/mcp", `token=${token}`), { origin: "null" })).code,
    403
  );
  assert.equal((await handshake(url("/mcp", `token=${token}`))).kind, "open");
});

test("a second socket replaces the first (single active socket)", async () => {
  const first = await handshake(url("/mcp", `token=${token}`), { origin: EXTENSION_ORIGIN });
  assert.equal(first.kind, "open");

  const closed = new Promise((resolve) => first.ws.on("close", (code) => resolve(code)));

  const second = await handshake(url("/mcp", `token=${token}`), { origin: EXTENSION_ORIGIN });
  assert.equal(second.kind, "open");
  assert.equal(await closed, 4000);

  second.ws.close();
});

test("a large list_rules response survives the bridge", async () => {
  const ws = new WebSocket(url("/mcp", `token=${token}`), { origin: EXTENSION_ORIGIN });
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  /* 3 MB is well under storage.local's 10 MB, so this is a legitimate
     response when the user enables "Expose code".  A 2 MB socket limit used
     to terminate the connection here. */
  const big = "x".repeat(3 * 1024 * 1024);
  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message?.id) {
      ws.send(JSON.stringify({ id: message.id, result: { rules: { 1: { code: big } } } }));
    }
  });

  try {
    const reply = await rpc(
      {
        jsonrpc: "2.0",
        id: "large-list",
        method: "tools/call",
        params: { name: "list_rules", arguments: {} },
      },
      8000
    );
    assert.equal(reply.result.isError, undefined);
    const text = reply.result.content[0].text;
    assert.ok(text.length > 3 * 1024 * 1024);
  } finally {
    ws.close();
  }
});

test("initialize only echoes a protocol version the server implements", async () => {
  const unknown = await rpc({
    jsonrpc: "2.0",
    id: "proto-unknown",
    method: "initialize",
    params: { protocolVersion: "9999-99-99" },
  });
  assert.equal(unknown.result.protocolVersion, "2024-11-05");

  const known = await rpc({
    jsonrpc: "2.0",
    id: "proto-known",
    method: "initialize",
    params: { protocolVersion: "2025-06-18" },
  });
  assert.equal(known.result.protocolVersion, "2025-06-18");
});

test("the pairing token never appears in server logs", () => {
  assert.equal(stderr.includes(token), false);
});

test("an oversized token file is refused instead of trusted", async () => {
  const dir = mkdtempSync(join(tmpdir(), "js-injection-mcp-token-"));
  const file = join(dir, "token");
  writeFileSync(file, "x".repeat(5000), { mode: 0o600 });

  const proc = spawn(process.execPath, ["mcp-server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      JS_INJECTION_MCP_PORT: String(await freePort()),
      JS_INJECTION_MCP_TOKEN_FILE: file,
      JS_INJECTION_MCP_TOKEN: "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.stdout.resume();
  let log = "";
  proc.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });

  try {
    await waitFor(() => proc.exitCode !== null || log.includes("listening"));
    assert.equal(proc.exitCode, 1, "an oversized token file must not start the server");
    assert.match(log, /Could not create the pairing token/);
  } finally {
    if (proc.exitCode === null) proc.kill("SIGTERM");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a symlinked token file is refused", async () => {
  const dir = mkdtempSync(join(tmpdir(), "js-injection-mcp-token-"));
  const real = join(dir, "real-token");
  const link = join(dir, "token");
  writeFileSync(real, "c".repeat(48) + "\n", { mode: 0o600 });
  symlinkSync(real, link);

  const proc = spawn(process.execPath, ["mcp-server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      JS_INJECTION_MCP_PORT: String(await freePort()),
      JS_INJECTION_MCP_TOKEN_FILE: link,
      JS_INJECTION_MCP_TOKEN: "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.stdout.resume();
  let log = "";
  proc.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });

  try {
    await waitFor(() => proc.exitCode !== null || log.includes("listening"));
    assert.equal(proc.exitCode, 1, "a symlinked token file must not be trusted");
    assert.match(log, /symlink/);
  } finally {
    if (proc.exitCode === null) proc.kill("SIGTERM");
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an invalid port fails fast with a clear message", async () => {
  const proc = spawn(process.execPath, ["mcp-server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      JS_INJECTION_MCP_PORT: "not-a-port",
      JS_INJECTION_MCP_TOKEN: "d".repeat(48),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.stdout.resume();
  let log = "";
  proc.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });

  try {
    await waitFor(() => proc.exitCode !== null || log.includes("listening"));
    assert.equal(proc.exitCode, 1);
    assert.match(log, /must be a port between 1 and 65535/);
  } finally {
    if (proc.exitCode === null) proc.kill("SIGTERM");
  }
});
test("an existing world-readable token file is reused and tightened to 0600", async () => {
  const dir = mkdtempSync(join(tmpdir(), "js-injection-mcp-token-"));
  const file = join(dir, "token");
  const preset = "b".repeat(48);
  writeFileSync(file, preset + "\n", { mode: 0o644 });
  chmodSync(file, 0o644);

  const otherPort = await freePort();
  const proc = spawn(process.execPath, ["mcp-server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      JS_INJECTION_MCP_PORT: String(otherPort),
      JS_INJECTION_MCP_TOKEN_FILE: file,
      JS_INJECTION_MCP_TOKEN: "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  proc.stdout.resume();
  let log = "";
  proc.stderr.on("data", (chunk) => {
    log += chunk.toString();
  });

  try {
    await waitFor(() => log.includes("listening") || proc.exitCode !== null);
    assert.equal(proc.exitCode, null, `server exited early: ${log}`);
    assert.equal(readFileSync(file, "utf8").trim(), preset);
    assert.equal((statSync(file).mode & 0o777).toString(8), "600");
  } finally {
    if (proc.exitCode === null) proc.kill("SIGTERM");
    rmSync(dir, { recursive: true, force: true });
  }
});
