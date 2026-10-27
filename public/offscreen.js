/* Offscreen document that owns the optional local MCP WebSocket.
 *
 * The socket URL always comes from `mcp-url.js`, which only accepts loopback
 * hosts, and the pairing token is appended here — never written to a status
 * message or a log line.  Reconnects use exponential backoff and every
 * callback checks its own generation so a stale socket can never overwrite the
 * state of a newer connection.
 */

import { DEFAULT_MCP_URL, normalizeLoopbackUrl, withMcpToken } from "./mcp-url.js";

const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

let socket = null;
let socketKey = "";
let reconnectTimer = null;
let reconnectDelay = BASE_RECONNECT_MS;
let generation = 0;
let desired = false;
let currentUrl = "";
let currentToken = "";

/** The URL shown in the UI/status messages — token and query string removed. */
function publicUrl() {
  if (!currentUrl) return "";
  try {
    const parsed = new URL(currentUrl);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function postStatus(connected, error = "") {
  try {
    chrome.runtime.sendMessage(
      {
        type: "MCP_STATUS_CHANGE",
        connected: !!connected,
        url: publicUrl(),
        error: String(error || "").slice(0, 200),
      },
      () => void chrome.runtime.lastError
    );
  } catch {
    /* The service worker may be restarting; the next status will catch up. */
  }
}

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Discard the current socket without scheduling a reconnect.
 * Handlers are detached first so the close event cannot race the new socket.
 */
function teardown() {
  generation += 1;
  clearReconnectTimer();
  socketKey = "";

  const previous = socket;
  socket = null;
  if (!previous) return;

  previous.onopen = null;
  previous.onmessage = null;
  previous.onclose = null;
  previous.onerror = null;
  try {
    previous.close(4001, "superseded");
  } catch {
    /* Already closed. */
  }
}

function send(payload) {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function openSocket() {
  const target = withMcpToken(currentUrl, currentToken);
  if (!target) {
    desired = false;
    postStatus(false, "MCP URL must point at localhost / 127.0.0.1.");
    return;
  }

  const thisGeneration = ++generation;

  let ws;
  try {
    ws = new WebSocket(target);
  } catch {
    postStatus(false, "Could not open the MCP WebSocket.");
    scheduleReconnect(thisGeneration);
    return;
  }

  socket = ws;

  ws.onopen = () => {
    if (thisGeneration !== generation) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      return;
    }
    reconnectDelay = BASE_RECONNECT_MS;
    postStatus(true);
  };

  ws.onmessage = (event) => {
    if (thisGeneration !== generation) return;

    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;

    /* Server heartbeat: answer without bothering the service worker. */
    if (data.type === "ping") {
      send({ type: "pong", id: data.id });
      return;
    }

    /* Only commands with an id expect a response. */
    if (data.id === undefined || data.id === null) return;

    chrome.runtime.sendMessage({ type: "MCP_COMMAND_RECEIVED", payload: data }, (response) => {
      void chrome.runtime.lastError;
      if (thisGeneration !== generation || socket !== ws || ws.readyState !== WebSocket.OPEN) return;

      const result =
        response === undefined
          ? { error: "No response from the extension background." }
          : response;
      try {
        ws.send(JSON.stringify({ id: data.id, result }));
      } catch {
        /* The socket closed between the check and the send. */
      }
    });
  };

  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    if (thisGeneration !== generation) return;

    postStatus(false);
    scheduleReconnect(thisGeneration);
  };

  ws.onerror = () => {
    /* `error` is always followed by `close`; logging the URL would leak the
       token, so there is nothing useful to print here. */
  };
}

function scheduleReconnect(thisGeneration) {
  if (!desired || thisGeneration !== generation) return;

  clearReconnectTimer();
  const delay = reconnectDelay + Math.floor(Math.random() * 250);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_MS);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (desired && thisGeneration === generation) openSocket();
  }, delay);
}

function connect(rawUrl, token) {
  const normalized = normalizeLoopbackUrl(rawUrl);
  if (!normalized) {
    desired = false;
    teardown();
    postStatus(false, "MCP URL must point at localhost / 127.0.0.1.");
    return { ok: false, error: "invalid MCP URL" };
  }

  const nextToken = typeof token === "string" ? token.trim() : "";
  if (!nextToken) {
    /* An empty token can only produce 401 responses; retrying forever would
       just hammer the local server. */
    desired = false;
    teardown();
    postStatus(false, "MCP pairing token is required.");
    return { ok: false, error: "MCP pairing token is required" };
  }
  const key = `${normalized}\n${nextToken}`;

  currentUrl = normalized;
  currentToken = nextToken;

  if (desired && socket && socketKey === key) {
    const state = socket.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
      return { ok: true, status: "already " + (state === WebSocket.OPEN ? "connected" : "connecting") };
    }
  }

  desired = true;
  reconnectDelay = BASE_RECONNECT_MS;
  teardown();
  socketKey = key;
  openSocket();
  return { ok: true, status: "connecting" };
}

function disconnect() {
  desired = false;
  teardown();
  postStatus(false);
  return { ok: true, status: "disconnected" };
}

/* If the worker created this document while the user already had the bridge
 * enabled, connect immediately instead of waiting for another command. */
(async () => {
  try {
    const items = await chrome.storage.local.get(["__mcpEnabled", "__mcpUrl", "__mcpToken"]);
    if (items.__mcpEnabled === true && String(items.__mcpToken || "").trim()) {
      connect(items.__mcpUrl || DEFAULT_MCP_URL, items.__mcpToken);
    }
  } catch {
    /* Storage may be unavailable while the extension is reloading. */
  }
})();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CONNECT_MCP") {
    sendResponse(connect(message.url, message.token));
    return false;
  }

  if (message?.type === "DISCONNECT_MCP") {
    sendResponse(disconnect());
    return false;
  }

  if (message?.type === "MCP_GET_STATUS") {
    sendResponse({
      connected: socket?.readyState === WebSocket.OPEN,
      url: publicUrl(),
    });
    return false;
  }

  return false;
});
