/* Manifest V3 Service Worker */

let storageList = {};

/* Glob pattern matching */
function glob(pattern, input) {
  const re = new RegExp(
    decodeURIComponent(
      pattern.replace(/([.?+^$[\]\\(){}|/-])/g, "\\$1").replace(/\*/g, ".*")
    )
  );
  return re.test(input);
}

/* Load storage on startup */
chrome.storage.sync.get(null, (items) => {
  storageList = items;
  console.log("[Js-Injection] Storage loaded:", Object.keys(storageList).length, "items");
});

/* FIX: Watch for storage changes and update cache */
chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === "sync") {
    chrome.storage.sync.get(null, (items) => {
      storageList = items;
    });
  }
});

/* Inject scripts into matching tabs when requested via message */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.state === "beforeLoad") {
    let injectJquery = false;
    const injections = [];

    for (const key in storageList) {
      if (key === "version") continue;
      const item = storageList[key];
      if (!item?.url || !sender.url) continue;

      if (glob(item.url, sender.url)) {
        // FIX #6: new Function() → func + args 패턴으로 CSP 안전하게 실행
        // user code는 args[0]으로 전달되어 MAIN world에서 eval됨
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
        if (item.jquery) injectJquery = true;
      }
    }

    Promise.allSettled(injections).then(() => {
      sendResponse(injectJquery);
    });

    return true; // keep message channel open
  }
});
