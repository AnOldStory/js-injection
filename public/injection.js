// FIX #8: 고정 버전 jQuery 사용 (jquery-latest는 deprecated)
const JQUERY_URL = "https://code.jquery.com/jquery-3.7.1.min.js";

function injectJquery() {
  const head = document.getElementsByTagName("HEAD")[0];
  const script = document.createElement("script");
  script.src = JQUERY_URL;
  script.type = "text/javascript";
  head.appendChild(script);
}

// FIX #7: chrome.runtime.lastError 처리 추가
chrome.runtime.sendMessage({ state: "beforeLoad" }, (isOK) => {
  if (chrome.runtime.lastError) {
    // Service Worker 비활성 상태 — 무시
    return;
  }
  if (isOK) {
    injectJquery();
  }
});
