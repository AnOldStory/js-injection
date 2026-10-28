#!/usr/bin/env node
/**
 * Official Model Context Protocol (MCP) server for the Js-Injection extension.
 *
 * Transport: stdio (JSON-RPC 2.0) for the AI client.
 * Browser transport: a loopback-only WebSocket that the extension connects to.
 *
 * Security model
 *   - The WebSocket listener binds 127.0.0.1 only.
 *   - Every connection must present the pairing token from
 *     ~/.js-injection-mcp-token (or JS_INJECTION_MCP_TOKEN).
 *   - Browser origins other than chrome-extension://<id> are rejected, so a
 *     random website cannot drive the extension through localhost.
 *   - Only one extension socket is active at a time.
 *
 * The extension itself enforces the user's consent flags (write, run script,
 * expose code); this server cannot bypass them.
 */

import { WebSocketServer } from "ws";
import readline from "node:readline";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(process.env.JS_INJECTION_MCP_PORT || 3000);
const WS_PATH = "/mcp";
/* Versions this server understands; anything else falls back to the default. */
const SUPPORTED_PROTOCOL_VERSIONS = new Set(["2024-11-05", "2025-03-26", "2025-06-18"]);
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";
const REQUEST_TIMEOUT_MS = 15000;
const HEARTBEAT_MS = 30000;
const MAX_TOKEN_BYTES = 4096;
/* One stdio JSON-RPC line.  Tool arguments are capped at 1 MB, so anything
   larger is malformed or an attempt to make the server buffer garbage. */
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
/* Extension responses can be large: `list_rules` with "Expose code" enabled
   returns every stored rule, and storage.local allows up to ~10 MB.  The old
   2 MB limit killed the bridge on a legitimate response. */
const MAX_SOCKET_PAYLOAD = 16 * 1024 * 1024;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(
    `[Js-Injection MCP] JS_INJECTION_MCP_PORT must be a port between 1 and 65535 (got "${process.env.JS_INJECTION_MCP_PORT}").`
  );
  process.exit(1);
}

const TOKEN_FILE =
  process.env.JS_INJECTION_MCP_TOKEN_FILE || join(homedir(), ".js-injection-mcp-token");

/* ------------------------------------------------------------------ */
/* Pairing token                                                       */
/* ------------------------------------------------------------------ */

function readTokenFile() {
  try {
    const stat = lstatSync(TOKEN_FILE);
    /* Refuse symlinks and non-regular files: a planted symlink must not decide
       which token this server trusts. */
    if (stat.isSymbolicLink() || !stat.isFile()) return "";

    /* A token is ~43 chars; a multi-megabyte file is corruption or an attempt
       to exhaust memory, not a pairing secret. */
    if (stat.size > MAX_TOKEN_BYTES) return "";

    /* Older versions (or a different umask) may have left the secret readable
       by other local users; tighten it whenever we read it. */
    if ((stat.mode & 0o077) !== 0) {
      try {
        chmodSync(TOKEN_FILE, 0o600);
      } catch {
        /* Windows / filesystems without POSIX modes. */
      }
    }

    const token = readFileSync(TOKEN_FILE, "utf8").trim();
    return token.length > MAX_TOKEN_BYTES ? "" : token;
  } catch {
    return "";
  }
}

function createTokenFile() {
  /* Never write through a pre-created symlink: another local user could point
     it at a file they cannot otherwise modify. */
  try {
    if (lstatSync(TOKEN_FILE).isSymbolicLink()) {
      throw new Error(`${TOKEN_FILE} is a symlink; refusing to write through it`);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const token = randomBytes(32).toString("base64url");
  try {
    /* `wx` also makes the create atomic if two servers start at once. */
    writeFileSync(TOKEN_FILE, token + "\n", { mode: 0o600, flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") {
      const existing = readTokenFile();
      if (existing) return existing;
    }
    throw error;
  }

  try {
    chmodSync(TOKEN_FILE, 0o600);
  } catch {
    /* Windows / filesystems without POSIX modes. */
  }
  return token;
}

function resolveToken() {
  const fromEnv = (process.env.JS_INJECTION_MCP_TOKEN || "").trim();
  if (fromEnv) {
    if (fromEnv.length > MAX_TOKEN_BYTES) {
      console.error(
        `[Js-Injection MCP] JS_INJECTION_MCP_TOKEN is longer than ${MAX_TOKEN_BYTES} bytes.`
      );
      process.exit(1);
    }
    return fromEnv;
  }

  const existing = readTokenFile();
  if (existing) return existing;

  try {
    return createTokenFile();
  } catch (error) {
    console.error(
      `[Js-Injection MCP] Could not create the pairing token at ${TOKEN_FILE}: ${error?.message || error}`
    );
    process.exit(1);
  }
}

const TOKEN = resolveToken();

if (TOKEN.length < 16) {
  console.error("[Js-Injection MCP] Warning: the pairing token is shorter than 16 characters.");
}

function safeEqual(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    /* Still perform a comparison so the failure path is not trivially shorter. */
    try {
      timingSafeEqual(a, Buffer.alloc(a.length));
    } catch {
      /* ignore */
    }
    return false;
  }
  return timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Origin allow-list                                                   */
/* ------------------------------------------------------------------ */

const EXTRA_ORIGINS = new Set(
  (process.env.JS_INJECTION_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

function originAllowed(origin) {
  /* No Origin header means a local CLI / MCP client. It still needs the token. */
  if (!origin) return true;
  if (EXTRA_ORIGINS.has(origin)) return true;

  /* chrome-extension://<32 chars a-p> is how Chrome identifies an extension. */
  return /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
}

function verifyClient(info, done) {
  try {
    if (!originAllowed(info.origin)) {
      done(false, 403, "Forbidden origin");
      return;
    }

    let url;
    try {
      url = new URL(info.req.url || "", `http://${HOST}:${PORT}`);
    } catch {
      done(false, 400, "Bad request");
      return;
    }

    if (url.pathname !== WS_PATH) {
      done(false, 404, "Not found");
      return;
    }

    if (!safeEqual(url.searchParams.get("token") || "", TOKEN)) {
      done(false, 401, "Invalid pairing token");
      return;
    }

    done(true);
  } catch {
    done(false, 400, "Bad request");
  }
}

/* ------------------------------------------------------------------ */
/* WebSocket server                                                    */
/* ------------------------------------------------------------------ */

let activeExtensionSocket = null;
const pendingRequests = new Map();
let reqIdCounter = 1;

const wss = new WebSocketServer({
  host: HOST,
  port: PORT,
  path: WS_PATH,
  verifyClient,
  maxPayload: MAX_SOCKET_PAYLOAD,
  perMessageDeflate: false,
});

wss.on("listening", () => {
  console.error(`[Js-Injection MCP] WebSocket listening on ws://${HOST}:${PORT}${WS_PATH}`);
  console.error(`[Js-Injection MCP] Pairing token file: ${TOKEN_FILE}`);
  console.error("[Js-Injection MCP] Paste that token into the extension's MCP panel.");
});

wss.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `[Js-Injection MCP] Port ${PORT} is already in use. Stop the other server or set JS_INJECTION_MCP_PORT.`
    );
  } else {
    console.error("[Js-Injection MCP] Server error:", error?.message || error);
  }
  process.exit(1);
});

function rejectAllPending(reason) {
  for (const pending of pendingRequests.values()) {
    clearTimeout(pending.timer);
    pending.reject(new Error(reason));
  }
  pendingRequests.clear();
}

function handleExtensionMessage(raw) {
  let response;
  try {
    response = JSON.parse(raw.toString());
  } catch {
    console.error("[Js-Injection MCP] Ignoring malformed extension response.");
    return;
  }

  if (!response || typeof response !== "object") return;

  const pending = pendingRequests.get(response.id);
  if (!pending) return;

  pendingRequests.delete(response.id);
  clearTimeout(pending.timer);

  const result = response.result;
  if (result && typeof result === "object" && typeof result.error === "string") {
    pending.reject(new Error(result.error));
  } else {
    pending.resolve(result);
  }
}

wss.on("connection", (ws) => {
  /* Single active socket: a reconnect must not leave a half-dead old socket
     receiving commands.  The old close handler is identity-checked below so it
     cannot clear the new socket. */
  if (activeExtensionSocket) {
    const previous = activeExtensionSocket;
    activeExtensionSocket = null;
    rejectAllPending("Extension reconnected");
    try {
      previous.close(4000, "Replaced by a newer connection");
    } catch {
      /* Already closing. */
    }
  }

  activeExtensionSocket = ws;
  ws.isAlive = true;
  console.error("✅ Chrome/Whale extension connected to the MCP bridge.");

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (data, isBinary) => {
    /* A replaced socket must never answer requests for the active one. */
    if (activeExtensionSocket !== ws) return;
    handleExtensionMessage(data, isBinary);
  });

  ws.on("close", () => {
    /* Close ownership: only the socket that is still active may clear state. */
    if (activeExtensionSocket !== ws) return;
    activeExtensionSocket = null;
    rejectAllPending("The extension disconnected.");
    console.error("❌ Extension disconnected from the MCP bridge.");
  });

  ws.on("error", (error) => {
    console.error("[Js-Injection MCP] Socket error:", error?.message || error);
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* The socket is already gone. */
    }
  }
}, HEARTBEAT_MS);
heartbeat.unref();

/* ------------------------------------------------------------------ */
/* Extension RPC                                                       */
/* ------------------------------------------------------------------ */

function sendToExtension(action, params) {
  return new Promise((resolve, reject) => {
    if (!activeExtensionSocket || activeExtensionSocket.readyState !== 1) {
      reject(
        new Error(
          "The Js-Injection Chrome extension is not connected. Open the extension and connect the MCP bridge."
        )
      );
      return;
    }

    const id = `req-${reqIdCounter++}`;
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error("The extension did not respond in time."));
    }, REQUEST_TIMEOUT_MS);
    timer.unref?.();

    pendingRequests.set(id, { resolve, reject, timer });

    try {
      activeExtensionSocket.send(JSON.stringify({ id, action, params }));
    } catch (error) {
      pendingRequests.delete(id);
      clearTimeout(timer);
      reject(new Error(`Could not send to the extension: ${error?.message || error}`));
    }
  });
}

/* ------------------------------------------------------------------ */
/* MCP stdio protocol                                                  */
/* ------------------------------------------------------------------ */

function sendJsonRpc(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function result(id, value) {
  if (id === undefined || id === null) return;
  sendJsonRpc({ jsonrpc: "2.0", id, result: value });
}

function error(id, code, message) {
  sendJsonRpc({
    jsonrpc: "2.0",
    id: id === undefined ? null : id,
    error: { code, message },
  });
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const TOOLS = [
  {
    name: "list_rules",
    description:
      "List the user's JavaScript/CSS injection rules. Rule code and CSS are omitted unless the user enabled 'Expose code' in the extension's MCP settings.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "add_rule",
    description:
      "Create or update an injection rule. Requires the user to enable 'Allow rule changes' in the extension. Library presets are bundled with the extension (none, jquery3, lodash, axios, dayjs); remote CDN URLs are not supported.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Existing rule id to update; omit to create a new rule" },
        nickname: { type: "string", description: "Human-readable rule name" },
        url: {
          type: "string",
          description: "Anchored URL pattern, e.g. https://*.example.com/*",
        },
        code: { type: "string", description: "JavaScript to inject (max 1 MB with CSS)" },
        cssCode: { type: "string", description: "CSS to inject (max 1 MB with JS)" },
        jquery: {
          type: "string",
          enum: ["none", "jquery3", "lodash", "axios", "dayjs"],
          description: "Bundled library to load before the rule's code",
        },
        enabled: { type: "boolean", description: "Whether the rule is active" },
        unlockRightClick: {
          type: "boolean",
          description: "Relax right-click / selection / drag blocking on matching pages",
        },
        runAt: {
          type: "string",
          enum: ["document_start", "document_end", "document_idle"],
          description: "When to run the rule",
        },
        tags: { type: "string", description: "Comma-separated tags" },
      },
      required: ["url"],
    },
  },
  {
    name: "delete_rule",
    description:
      "Delete an injection rule by id. Requires the user to enable 'Allow rule changes' in the extension.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Rule id from list_rules" },
      },
      required: ["id"],
    },
  },
  {
    name: "run_script_on_active_tab",
    description:
      "Execute JavaScript once in the active tab, including its iframes. Requires the user to enable 'Allow one-off script execution' in the extension; the extension enforces this even if the tool is called.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript to execute once" },
      },
      required: ["code"],
    },
  },
];

function requireString(args, key, { max = 1024 * 1024 } = {}) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} must be a non-empty string`);
  }
  if (value.length > max) throw new Error(`${key} is too long`);
  return value;
}

function validateRuleId(value) {
  const id = String(value ?? "").trim();
  /* Rule ids are numeric so they survive the UI router unchanged. */
  if (!/^[1-9]\d{0,15}$/.test(id)) {
    throw new Error("id must be a numeric rule id returned by list_rules");
  }
  return id;
}

function validateToolArguments(name, args) {
  if (!isPlainObject(args)) throw new Error("arguments must be an object");

  if (name === "list_rules") return {};

  if (name === "add_rule") {
    const url = requireString(args, "url", { max: 2048 });
    if (!/^[a-z*]+:\/\/[^/\s]+/i.test(url)) {
      throw new Error("url must look like https://*.example.com/*");
    }
    /* Reject oversized fields before they cross the bridge; the extension
       validates again, but failing here gives the agent a clear error. */
    for (const key of ["code", "cssCode"]) {
      if (args[key] !== undefined) {
        if (typeof args[key] !== "string") throw new Error(`${key} must be a string`);
        if (Buffer.byteLength(args[key], "utf8") > 1024 * 1024) {
          throw new Error(`${key} is too long`);
        }
      }
    }
    for (const [key, max] of [["nickname", 256], ["tags", 1024]]) {
      if (args[key] !== undefined) {
        if (typeof args[key] !== "string") throw new Error(`${key} must be a string`);
        if (args[key].length > max) throw new Error(`${key} is too long`);
      }
    }
    for (const key of ["enabled", "unlockRightClick"]) {
      if (args[key] !== undefined && typeof args[key] !== "boolean") {
        throw new Error(`${key} must be a boolean`);
      }
    }
    const id = args.id === undefined || args.id === null ? undefined : validateRuleId(args.id);
    const runAt = args.runAt === undefined ? "document_start" : String(args.runAt);
    if (!["document_start", "document_end", "document_idle"].includes(runAt)) {
      throw new Error("runAt must be document_start, document_end or document_idle");
    }
    const jquery = args.jquery === undefined ? "none" : String(args.jquery);
    if (!["none", "jquery3", "lodash", "axios", "dayjs"].includes(jquery)) {
      throw new Error("jquery must be one of none, jquery3, lodash, axios, dayjs");
    }
    return { ...args, id, url, runAt, jquery };
  }

  if (name === "delete_rule") {
    return { id: validateRuleId(args.id) };
  }

  if (name === "run_script_on_active_tab") {
    const code = requireString(args, "code");
    if (Buffer.byteLength(code, "utf8") > 1024 * 1024) {
      throw new Error("code is too long");
    }
    return { code };
  }

  throw new Error(`Unknown tool: ${name}`);
}

function toToolResult(value) {
  /* A malformed extension response must still produce a valid MCP result. */
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2);
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

async function handleToolCall(id, params) {
  if (!isPlainObject(params) || typeof params.name !== "string") {
    error(id, -32602, "tools/call requires a tool name");
    return;
  }

  const args = params.arguments === undefined ? {} : params.arguments;

  try {
    const validated = validateToolArguments(params.name, args);

    let action;
    if (params.name === "list_rules") action = "listRules";
    else if (params.name === "add_rule") action = "addRule";
    else if (params.name === "delete_rule") action = "deleteRule";
    else action = "injectScriptOnActiveTab";

    const value = await sendToExtension(action, validated);
    result(id, toToolResult(value));
  } catch (err) {
    result(id, {
      isError: true,
      content: [{ type: "text", text: err?.message || String(err) }],
    });
  }
}

function handleInitialize(id, params) {
  const requested = isPlainObject(params) ? params.protocolVersion : undefined;
  /* Echo only a version we actually implement; echoing an arbitrary client
     string would claim support for a protocol we do not speak. */
  const protocolVersion =
    typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.has(requested)
      ? requested
      : DEFAULT_PROTOCOL_VERSION;

  result(id, {
    protocolVersion,
    capabilities: { tools: {} },
    serverInfo: { name: 'js-injection-mcp-server', version: '3.5.0' },
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  if (!line.trim()) return;
  if (Buffer.byteLength(line, "utf8") > MAX_REQUEST_BYTES) {
    error(null, -32700, "Request too large");
    return;
  }

  let request;
  try {
    request = JSON.parse(line);
  } catch {
    error(null, -32700, "Parse error");
    return;
  }

  if (!isPlainObject(request) || typeof request.method !== "string") {
    error(request?.id, -32600, "Invalid Request");
    return;
  }

  const { id, method, params } = request;
  const isNotification = id === undefined || id === null;

  if (method === "initialize") {
    handleInitialize(id, params);
    return;
  }

  /* MCP notifications never receive a response. */
  if (isNotification) return;

  if (method === "ping") {
    result(id, {});
    return;
  }

  if (method === "tools/list") {
    result(id, { tools: TOOLS });
    return;
  }

  if (method === "tools/call") {
    handleToolCall(id, params).catch((err) => {
      result(id, {
        isError: true,
        content: [{ type: "text", text: err?.message || String(err) }],
      });
    });
    return;
  }

  error(id, -32601, `Method not found: ${method}`);
});

/* ------------------------------------------------------------------ */
/* Shutdown                                                            */
/* ------------------------------------------------------------------ */

let shuttingDown = false;

function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(heartbeat);
  rejectAllPending("The MCP server is shutting down.");

  for (const ws of wss.clients) {
    try {
      ws.close(1001, "server shutdown");
    } catch {
      /* ignore */
    }
  }

  wss.close(() => process.exit(0));
  /* Do not hang forever on a stuck socket. */
  setTimeout(() => process.exit(0), 1000).unref();
  if (reason === "stdin") process.exit(0);
}

rl.on("close", () => shutdown("stdin"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
  console.error("[Js-Injection MCP] Uncaught exception:", err?.message || err);
  shutdown("exception");
});
