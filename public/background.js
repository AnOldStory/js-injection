/* Manifest V3 Service Worker with MCP Bridge Support */

let storageList = {};

/* Helper: Create offscreen document if not existing */
async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["MATCH_PATTERNS"],
    justification: "Maintain persistent WebSocket connection to MCP server",
  });
}

/* Glob pattern matching */
function glob(pattern, input) {
  try {
    const re = new RegExp(
      decodeURIComponent(
        pattern.replace(/([.?+^$[\]\\(){}|/-])/g, "\\$1").replace(/\*/g, ".*")
      )
    );
    return re.test(input);
  } catch {
    return false;
  }
}

/* Helper to map lib option to CDN URL */
function getLibraryUrl(item) {
  if (item.jquery === true || item.jquery === "jquery3") {
    return "https://code.jquery.com/jquery-3.7.1.min.js";
  }
  if (item.jquery === "jquery2") {
    return "https://code.jquery.com/jquery-2.2.4.min.js";
  }
  if (item.jquery === "jquery1") {
    return "https://code.jquery.com/jquery-1.12.4.min.js";
  }
  if (item.jquery === "lodash") {
    return "https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js";
  }
  if (item.jquery === "axios") {
    return "https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js";
  }
  if (item.jquery === "dayjs") {
    return "https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js";
  }
  if (item.jquery === "tailwind") {
    return "https://cdn.tailwindcss.com";
  }
  if (item.jquery === "custom" && item.customLibUrl) {
    return item.customLibUrl;
  }
  return null;
}

const UNLOCK_CODE = `
(function() {
  const events = ['contextmenu', 'copy', 'cut', 'paste', 'mousedown', 'mouseup', 'selectstart', 'keydown'];
  events.forEach(function(event) {
    document.addEventListener(event, function(e) {
      e.stopPropagation();
    }, true);
  });

  const style = document.createElement('style');
  style.id = 'js-injection-unlock-style';
  style.textContent = '* { -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; user-select: text !important; }';
  (document.head || document.documentElement).appendChild(style);

  const allElements = document.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    el.oncontextmenu = null;
    el.onselectstart = null;
    el.ondragstart = null;
    el.oncopy = null;
    el.oncut = null;
  }
})();
`;

/* Load storage on startup.
   The service worker is torn down after ~30s idle and revived by the very
   beforeLoad message it has to answer, so handlers must await this instead of
   reading storageList synchronously — otherwise they see an empty list and
   silently inject nothing. */
const storageReady = new Promise((resolve) => {
  chrome.storage.sync.get(null, (items) => {
    storageList = items || {};
    console.log("[Js-Injection] Storage loaded:", Object.keys(storageList).length, "items");

    // Auto-connect MCP if enabled
    if (storageList.__mcpEnabled) {
      ensureOffscreenDocument().then(() => {
        chrome.runtime.sendMessage({
          type: "CONNECT_MCP",
          url: storageList.__mcpUrl || "ws://localhost:3000/mcp",
        });
      });
    }

    resolve();
  });
});

/* Watch for storage changes */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    chrome.storage.sync.get(null, (items) => {
      storageList = items || {};
    });

    if (changes.__mcpEnabled) {
      if (changes.__mcpEnabled.newValue) {
        ensureOffscreenDocument().then(() => {
          chrome.runtime.sendMessage({
            type: "CONNECT_MCP",
            url: storageList.__mcpUrl || "ws://localhost:3000/mcp",
          });
        });
      }
    }
  }
});

/* Handle MCP Tool Commands from AI Server */
async function handleMcpCommand(payload) {
  const { action, params } = payload || {};

  if (action === "listRules") {
    return storageList;
  }
  if (action === "addRule") {
    const newId = Date.now().toString();
    const ruleData = {
      nickname: params.nickname || "AI Created Rule",
      url: params.url || "https://*/*",
      code: params.code || "",
      cssCode: params.cssCode || "",
      enabled: true,
      jquery: params.jquery || "none",
      unlockRightClick: !!params.unlockRightClick,
      runAt: params.runAt || "document_start",
      tags: params.tags || "AI",
    };
    await chrome.storage.sync.set({ [newId]: ruleData });
    return { success: true, id: newId, rule: ruleData };
  }
  if (action === "deleteRule") {
    await chrome.storage.sync.remove(String(params.id));
    return { success: true, deletedId: params.id };
  }
  if (action === "injectScriptOnActiveTab") {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.[0]?.id) return { error: "No active tab found" };
    
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id, allFrames: true },
      world: "MAIN",
      func: (userCode) => {
        // eslint-disable-next-line no-eval
        return eval(userCode);
      },
      args: [params.code],
    });
    return { success: true, tabId: tabs[0].id };
  }

  return { error: `Unknown MCP action: ${action}` };
}

/* Listen for messages from content scripts, UI, and Offscreen document */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "MCP_COMMAND_RECEIVED") {
    handleMcpCommand(message.payload).then((res) => sendResponse(res));
    return true;
  }

  if (message.state === "beforeLoad") {
    storageReady.then(() => handleBeforeLoad(sender, sendResponse));
    return true;
  }
});

function handleBeforeLoad(sender, sendResponse) {
  if (storageList.__globalEnabled === false) {
    sendResponse([]);
    return;
  }

  const librariesToInject = [];
  const injections = [];

  const url = sender.url ?? "";
  const isInjectable = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
  if (!isInjectable) {
    sendResponse([]);
    return;
  }

  for (const key in storageList) {
    if (key === "version" || key.startsWith("__")) continue;
    const item = storageList[key];
    if (!item?.url) continue;

    if (item.enabled === false) continue;

    if (glob(item.url, sender.url)) {
      const libUrl = getLibraryUrl(item);
      if (libUrl && !librariesToInject.includes(libUrl)) {
        librariesToInject.push(libUrl);
      }

      // executeScript defaults to injecting at document_idle, which loses the
      // race against anything the page itself runs. Honour the rule's runAt.
      const injectImmediately = (item.runAt || "document_start") === "document_start";

      if (item.unlockRightClick) {
        injections.push(
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id, allFrames: true },
            world: "MAIN",
            injectImmediately,
            func: (code) => {
              // eslint-disable-next-line no-eval
              eval(code);
            },
            args: [UNLOCK_CODE],
          })
        );
      }

      if (item.cssCode) {
        chrome.scripting.insertCSS({
          target: { tabId: sender.tab.id, allFrames: true },
          css: item.cssCode,
        }).catch(() => {});
      }

      if (item.code) {
        injections.push(
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id, allFrames: true },
            world: "MAIN",
            injectImmediately,
            func: (code) => {
              // eslint-disable-next-line no-eval
              eval(code);
            },
            args: [item.code],
          })
        );
      }
    }
  }

  Promise.allSettled(injections).then(() => {
    sendResponse(librariesToInject);
  });
}
