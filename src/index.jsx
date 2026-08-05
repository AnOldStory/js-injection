import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root";
import { detectTabPage, setTabPage, loadRoute } from "./store/session";

const container = document.getElementById("root");
const root = createRoot(container);

const render = () =>
  root.render(
    <StrictMode>
      <Root />
    </StrictMode>
  );

/*
 * 팝업은 닫힐 때마다 처음부터 다시 뜬다. 마지막으로 보던 화면을 HashRouter 가
 * 읽기 전에 해시에 심어 두면 편집하던 규칙으로 바로 돌아간다.
 * 옵션 페이지(탭)는 그대로 살아있으므로 복원하지 않는다.
 */
detectTabPage((isTab) => {
  setTabPage(isTab);
  if (isTab || window.location.hash.slice(1)) {
    render();
    return;
  }
  loadRoute((path) => {
    if (path && path !== "/") window.location.hash = path;
    render();
  });
});
