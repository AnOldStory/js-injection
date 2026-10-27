/**
 * Js-Injection MCP WebSocket bridge — minimal example client/server.
 *
 * Run: node mcp-server-example.mjs
 *
 * ⚠️  This example is for local protocol testing only. Unlike the real
 *     `mcp-server.js`, it does NOT verify a pairing token or browser Origin.
 *     Never expose it on a non-loopback interface, and disconnect it when you
 *     are done. The extension's own consent switches still apply.
 *
 * The server binds 127.0.0.1 explicitly so the bridge cannot be reached from
 * another machine on the network.
 */
import { WebSocketServer } from "ws";

const PORT = 3000;
const HOST = "127.0.0.1";
const wss = new WebSocketServer({ host: HOST, port: PORT, path: "/mcp" });

console.log(`🚀 MCP Bridge example listening on ws://${HOST}:${PORT}/mcp`);
console.log("⚠️  No token/Origin checks in this example — local testing only.");

wss.on("connection", (ws) => {
  console.log("✅ Chrome Extension (Js-Injection) connected via the example bridge.");

  /* Example 1: list rules after 2 seconds */
  setTimeout(() => {
    console.log("📤 Sending command: listRules");
    ws.send(
      JSON.stringify({
        id: "req-1",
        action: "listRules",
        params: {},
      })
    );
  }, 2000);

  /* Example 2: add a CSS rule after 5 seconds. This only succeeds when the
     user has enabled "Allow rule changes" in the extension's MCP panel. */
  setTimeout(() => {
    console.log("📤 Sending command: addRule (AI Darkmode)");
    ws.send(
      JSON.stringify({
        id: "req-2",
        action: "addRule",
        params: {
          nickname: "AI Generated Darkmode",
          url: "https://*.google.com/*",
          cssCode: "body { background: #121212 !important; color: #fff !important; }",
          tags: "AI, Darkmode",
        },
      })
    );
  }, 5000);

  ws.on("message", (message) => {
    try {
      const response = JSON.parse(message.toString());
      console.log("📥 Received response from extension:", JSON.stringify(response, null, 2));
    } catch {
      console.error("📥 Received a malformed response from the extension.");
    }
  });

  ws.on("close", () => {
    console.log("❌ Chrome Extension disconnected.");
  });
});

wss.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use — is the real mcp-server.js running?`);
  } else {
    console.error("Example bridge error:", error?.message || error);
  }
  process.exit(1);
});
