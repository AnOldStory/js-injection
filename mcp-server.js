/**
 * Official Model Context Protocol (MCP) Server for Js-Injection Extension
 * Exposes Tool Definitions to Claude Desktop / Antigravity / Cursor via Stdio
 */

const { WebSocketServer } = require('ws');
const readline = require('readline');

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT, path: '/mcp' });

let activeExtensionSocket = null;
let pendingRequests = new Map();
let reqIdCounter = 1;

console.error(`[Js-Injection MCP] WebSocket Server listening on ws://localhost:${PORT}/mcp`);

wss.on('connection', (ws) => {
  console.error('✅ Chrome/Whale Extension (Js-Injection) connected via MCP Bridge!');
  activeExtensionSocket = ws;

  ws.on('message', (message) => {
    try {
      const response = JSON.parse(message.toString());
      const resolver = pendingRequests.get(response.id);
      if (resolver) {
        resolver(response.result);
        pendingRequests.delete(response.id);
      }
    } catch (e) {
      console.error('[Js-Injection MCP] Failed to parse extension response:', e);
    }
  });

  ws.on('close', () => {
    console.error('❌ Extension disconnected');
    activeExtensionSocket = null;
  });
});

/* Helper to send JSON-RPC command to Extension */
function sendToExtension(action, params) {
  return new Promise((resolve, reject) => {
    if (!activeExtensionSocket || activeExtensionSocket.readyState !== 1) {
      return reject(new Error('Js-Injection Chrome extension is not connected. Please open Chrome and connect the MCP Bridge.'));
    }
    const id = `req-${reqIdCounter++}`;
    pendingRequests.set(id, resolve);

    activeExtensionSocket.send(JSON.stringify({ id, action, params }));

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Extension response timeout'));
      }
    }, 10000);
  });
}

/* Standard MCP Protocol over Stdio (JSON-RPC 2.0) */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendJsonRpc(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    const { id, method, params } = request;

    // 1. MCP Protocol Handshake
    if (method === 'initialize') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'js-injection-mcp-server', version: '3.3.0' }
        }
      });
      return;
    }

    if (method === 'notifications/initialized') {
      return; // No response required
    }

    // 2. List Available Tools for AI
    if (method === 'tools/list') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'list_rules',
              description: 'List all custom JavaScript and CSS injection rules in Js-Injection Chrome extension.',
              inputSchema: { type: 'object', properties: {} }
            },
            {
              name: 'add_rule',
              description: 'Create and save a new JavaScript or CSS injection rule into the browser.',
              inputSchema: {
                type: 'object',
                properties: {
                  nickname: { type: 'string', description: 'Name of the rule (e.g. Google Dark Mode)' },
                  url: { type: 'string', description: 'Target URL wildcard pattern (e.g. https://*.google.com/*)' },
                  code: { type: 'string', description: 'JavaScript code to inject' },
                  cssCode: { type: 'string', description: 'CSS code to inject' },
                  jquery: { type: 'string', description: 'Library preset: none, jquery3, lodash, axios, tailwind, etc.' },
                  unlockRightClick: { type: 'boolean', description: 'Unlock right click and text copy restrictions' },
                  tags: { type: 'string', description: 'Comma separated tags' }
                },
                required: ['nickname', 'url']
              }
            },
            {
              name: 'delete_rule',
              description: 'Delete an existing injection rule by ID.',
              inputSchema: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'ID of the rule to delete' }
                },
                required: ['id']
              }
            },
            {
              name: 'run_script_on_active_tab',
              description: 'Execute one-time JavaScript code immediately on the user active browser tab.',
              inputSchema: {
                type: 'object',
                properties: {
                  code: { type: 'string', description: 'JavaScript code to execute' }
                },
                required: ['code']
              }
            }
          ]
        }
      });
      return;
    }

    // 3. Execute Tool Call requested by AI
    if (method === 'tools/call') {
      const { name, arguments: toolArgs } = params;

      try {
        let resultData = null;

        if (name === 'list_rules') {
          resultData = await sendToExtension('listRules', toolArgs);
        } else if (name === 'add_rule') {
          resultData = await sendToExtension('addRule', toolArgs);
        } else if (name === 'delete_rule') {
          resultData = await sendToExtension('deleteRule', toolArgs);
        } else if (name === 'run_script_on_active_tab') {
          resultData = await sendToExtension('injectScriptOnActiveTab', toolArgs);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }

        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(resultData, null, 2) }]
          }
        });
      } catch (err) {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [{ type: 'text', text: err.message }]
          }
        });
      }
      return;
    }

    // Default error for unknown method
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: 'Method not found' }
    });
  } catch (err) {
    console.error('[Js-Injection MCP] Input parse error:', err);
  }
});
