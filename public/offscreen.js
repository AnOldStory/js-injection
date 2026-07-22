/* Offscreen document for maintaining persistent MCP WebSocket connection */

let socket = null;
let reconnectTimer = null;
let mcpUrl = "ws://localhost:3000/mcp";

function connectWebSocket(url) {
  if (url) mcpUrl = url;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    socket = new WebSocket(mcpUrl);

    socket.onopen = () => {
      console.log("[Js-Injection MCP] WebSocket Connected to", mcpUrl);
      chrome.runtime.sendMessage({ type: "MCP_STATUS_CHANGE", connected: true, url: mcpUrl });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[Js-Injection MCP] Received command:", data);
        
        // Forward command to Background Service Worker
        chrome.runtime.sendMessage({ type: "MCP_COMMAND_RECEIVED", payload: data }, (response) => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ id: data.id, result: response }));
          }
        });
      } catch (e) {
        console.error("[Js-Injection MCP] Parse error:", e);
      }
    };

    socket.onclose = () => {
      console.log("[Js-Injection MCP] WebSocket Closed. Reconnecting in 5s...");
      chrome.runtime.sendMessage({ type: "MCP_STATUS_CHANGE", connected: false, url: mcpUrl });
      scheduleReconnect();
    };

    socket.onerror = (err) => {
      console.error("[Js-Injection MCP] WebSocket Error:", err);
    };
  } catch (e) {
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connectWebSocket(mcpUrl);
  }, 5000);
}

// Listen for control messages from Background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONNECT_MCP") {
    connectWebSocket(message.url);
    sendResponse({ status: "connecting" });
  } else if (message.type === "SEND_MCP_RESPONSE") {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message.payload));
    }
  }
});
