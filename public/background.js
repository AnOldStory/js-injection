/* Manifest V3 Service Worker */

let storageList = {};

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

/* Load storage on startup */
chrome.storage.sync.get(null, (items) => {
  storageList = items || {};
  console.log("[Js-Injection] Storage loaded:", Object.keys(storageList).length, "items");
});

/* Watch for storage changes and update cache */
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync") {
    chrome.storage.sync.get(null, (items) => {
      storageList = items || {};
    });
  }
});

/* Inject scripts into matching tabs when requested via message */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.state === "beforeLoad") {
    // Check Master Switch
    if (storageList.__globalEnabled === false) {
      sendResponse([]);
      return true;
    }

    const librariesToInject = [];
    const injections = [];

    const url = sender.url ?? "";
    const isInjectable = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://");
    if (!isInjectable) {
      sendResponse([]);
      return true;
    }

    for (const key in storageList) {
      if (key === "version" || key.startsWith("__")) continue;
      const item = storageList[key];
      if (!item?.url) continue;

      // Skip disabled individual rule
      if (item.enabled === false) continue;

      if (glob(item.url, sender.url)) {
        const libUrl = getLibraryUrl(item);
        if (libUrl && !librariesToInject.includes(libUrl)) {
          librariesToInject.push(libUrl);
        }

        // Auto Unlock Right Click if enabled for rule
        if (item.unlockRightClick) {
          injections.push(
            chrome.scripting.executeScript({
              target: { tabId: sender.tab.id, allFrames: true },
              world: "MAIN",
              func: (code) => {
                // eslint-disable-next-line no-eval
                eval(code);
              },
              args: [UNLOCK_CODE],
            })
          );
        }

        // CSS Injection if present
        if (item.cssCode) {
          chrome.scripting.insertCSS({
            target: { tabId: sender.tab.id, allFrames: true },
            css: item.cssCode,
          }).catch(() => {});
        }

        // JS Code Injection
        if (item.code) {
          injections.push(
            chrome.scripting.executeScript({
              target: { tabId: sender.tab.id, allFrames: true },
              world: "MAIN",
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

    return true; // keep message channel open
  }
});
