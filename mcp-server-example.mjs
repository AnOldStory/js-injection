/**
 * Js-Injection MCP WebSocket Bridge Server Example
 * Run: node mcp-server-example.mjs
 */
import { WebSocketServer } from 'ws';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT, path: '/mcp' });

console.log(`🚀 MCP Bridge Server running on ws://localhost:${PORT}/mcp`);

wss.on('connection', (ws) => {
  console.log('✅ Chrome Extension (Js-Injection) connected via MCP Bridge!');

  // Example 1: Command Extension to list rules after 2 seconds
  setTimeout(() => {
    console.log('📤 Sending Command: listRules');
    ws.send(JSON.stringify({
      id: "req-1",
      action: "listRules",
      params: {}
    }));
  }, 2000);

  // Example 2: Command Extension to add an AI darkmode rule after 5 seconds
  setTimeout(() => {
    console.log('📤 Sending Command: addRule (AI Darkmode)');
    ws.send(JSON.stringify({
      id: "req-2",
      action: "addRule",
      params: {
        nickname: "AI Generated Darkmode",
        url: "https://*.google.com/*",
        cssCode: "body { background: #121212 !important; color: #fff !important; }",
        tags: "AI, Darkmode"
      }
    }));
  }, 5000);

  ws.on('message', (message) => {
    const response = JSON.parse(message.toString());
    console.log('📥 Received Response from Extension:', JSON.stringify(response, null, 2));
  });

  ws.on('close', () => {
    console.log('❌ Chrome Extension disconnected.');
  });
});
