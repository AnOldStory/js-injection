function injectJquery() {
  var head = document.getElementsByTagName("HEAD")[0];
  var script = document.createElement("script");
  script.src = "https://code.jquery.com/jquery-latest.min.js";
  script.type = "text/javascript";
  head.appendChild(script);
}

chrome.runtime.sendMessage({ state: "beforeLoad" }, isOK => {
  if (isOK) {
    injectJquery();
  }
});
