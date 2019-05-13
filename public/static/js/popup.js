chrome.tabs.getSelected(null, function(t) {
  document.querySelector("#setting").addEventListener("click", e => {
    window.open(chrome.runtime.getURL("index.html"));
  });
});
