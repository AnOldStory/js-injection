function injectLibrary(libUrl) {
  if (!libUrl) return;
  const head = document.getElementsByTagName("HEAD")[0] || document.documentElement;
  const script = document.createElement("script");
  script.src = libUrl;
  script.type = "text/javascript";
  head.appendChild(script);
}

chrome.runtime.sendMessage({ state: "beforeLoad" }, (librariesToInject) => {
  if (chrome.runtime.lastError) {
    return;
  }
  if (Array.isArray(librariesToInject)) {
    librariesToInject.forEach((libUrl) => {
      injectLibrary(libUrl);
    });
  }
});
