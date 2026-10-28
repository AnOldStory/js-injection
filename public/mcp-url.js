/**
 * The MCP bridge may only talk to the machine it runs on.
 *
 * `__mcpUrl` is user-editable (and lives in extension storage), so it must not
 * be possible to point the extension at a public WebSocket server: that would
 * turn the extension into a remote-controlled code execution client.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

/* The server caps the pairing token at 4 KB; a larger value would only make
   the WebSocket URL unusable. */
export const MAX_MCP_TOKEN_LENGTH = 4096;

export const DEFAULT_MCP_URL = "ws://127.0.0.1:3000/mcp";

/**
 * Validate and normalise a loopback WebSocket URL.
 *
 * @param {string} raw
 * @returns {string|null} canonical URL, or null when it is not loopback
 */
export function normalizeLoopbackUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "ws:" && url.protocol !== "wss:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) return null;

  /* Port 0 is not dialable; the URL parser already rejects > 65535. */
  if (url.port && Number(url.port) < 1) return null;

  /* A query string may carry a stale token; the caller appends the current one. */
  url.search = "";
  url.hash = "";
  return url.toString();
}

/** Build the URL the offscreen document actually dials. */
export function withMcpToken(url, token) {
  const normalized = normalizeLoopbackUrl(url);
  if (!normalized) return null;
  if (typeof token === "string" && token.length > MAX_MCP_TOKEN_LENGTH) return null;
  const parsed = new URL(normalized);
  if (typeof token === "string" && token) parsed.searchParams.set("token", token);
  return parsed.toString();
}
