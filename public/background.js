var storageList = {};

/* Data */
function glob(pattern, input) {
  var re = new RegExp(
    decodeURIComponent(
      pattern.replace(/([.?+^$[\]\\(){}|\/-])/g, "\\$1").replace(/\*/g, ".*")
    )
  );
  return re.test(input);
}

chrome.storage.sync.get(null, function(items) {
  storageList = items;
  console.log(storageList);
});

/* Listener */
chrome.storage.onChanged.addListener(function() {
  window.location.reload();
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // console.log("메시지", message); // state, action
  // console.log("센더", sender);
  // console.log("대답", sendResponse); // callback
  let query = false;
  if (message.state === "beforeLoad") {
    for (let key in storageList) {
      if (key !== "version") {
        if (glob(storageList[key].url, sender.url)) {
          chrome.tabs.executeScript(sender.tab.id, {
            code: storageList[key].code,
            runAt: "document_idle"
          });
          if (storageList[key].jquery) {
            query = true;
          }
        }
      }
    }
    sendResponse(query);
  }
});
