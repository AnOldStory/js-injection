import { useEffect, useCallback } from "react";
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";

import Config from "_variables";

import { useDispatch, useSelector } from "react-redux";
import { set, setLang } from "store/modules/lists";
import { migrateIfNeeded } from "shared/rule-store";
import { i18n } from "../i18n";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faGlobe, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

import MainContainer from "container/main/MainContainer";
import EditorContainer from "container/editor/EditorContainer";
import { isPopup, saveRoute } from "store/session";

/* 팝업이 다시 열릴 때 이어서 볼 수 있도록 현재 화면을 기록해 둔다 */
function RouteTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isPopup()) saveRoute(pathname);
  }, [pathname]);

  return null;
}

/* 편집 화면에서 목록으로 돌아가는 길 — 제목 클릭 말고는 방법이 없어서 눈에 띄게 둔다 */
function BackButton({ t }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isEditor = pathname !== "/";

  useEffect(() => {
    if (!isEditor) return undefined;
    const handleKey = (e) => {
      /* 코드 에디터 안에서는 Esc 가 에디터 몫이라 건드리지 않는다 */
      if (e.key !== "Escape" || document.activeElement?.closest?.(".ace_editor")) return;
      navigate("/");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isEditor, navigate]);

  if (!isEditor) return null;

  return (
    <button className="back-btn" onClick={() => navigate("/")} title={`${t("backToList")} (Esc)`}>
      <FontAwesomeIcon icon={faArrowLeft} /> {t("backToList")}
    </button>
  );
}

function AppRouter() {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.lists.lang);

  /*
   * Migration is additive and idempotent: it normalises legacy rules and moves
   * old `storage.sync` data into `storage.local` once.  It never clears the
   * rule set when the stored version differs.
   */
  const loadStorage = useCallback(async () => {
    try {
      const { rules, prefs } = await migrateIfNeeded(Config.version);
      dispatch(set({ ...rules, ...prefs }));
    } catch (error) {
      console.error("[Js-Injection] storage load failed:", error);
    }
  }, [dispatch]);

  const handleOption = () => {
    window.open(chrome.runtime.getURL("index.html"));
  };

  const handleToggleLang = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextLang = lang === "ko" ? "en" : "ko";
    chrome.storage.local.set({ __lang: nextLang }, () => {
      void chrome.runtime.lastError;
      dispatch(setLang(nextLang));
    });
  };

  /* REALTIME SYNC across Popup, Side Panel, Options Page */
  useEffect(() => {
    loadStorage();

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== "local") return;
      /* 편집 중 초안은 250ms 마다 저장된다 — 그때마다 전체 규칙을 다시 읽고
         비교하면 큰 규칙을 편집할 때 화면이 버벅인다. 초안/감사로그만 바뀐
         경우는 무시한다. */
      const keys = Object.keys(changes || {});
      const onlyNoise = keys.every(
        (key) =>
          key.startsWith("__draft_") ||
          key === "__mcpAudit" ||
          key === "__lastRoute"
      );
      if (!onlyNoise) loadStorage();
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadStorage]);

  const t = (key) => i18n[lang]?.[key] || i18n.ko[key] || key;

  return (
    <HashRouter basename="/">
      <RouteTracker />
      <div className="top arrange">
        <div className="arrange" style={{ gap: "10px" }}>
          <BackButton t={t} />
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }} title={t("backToList")}>
            <div className="title">{t("appTitle")} <span style={{ fontSize: "11px", opacity: 0.7 }}>v{Config.version}</span></div>
          </Link>
        </div>
        <div className="small arrange" style={{ gap: "8px" }}>
          <div className="setting" onClick={handleToggleLang} style={{ cursor: "pointer" }} title="Language / 언어 변경">
            <FontAwesomeIcon icon={faGlobe} /> {lang.toUpperCase()}
          </div>
          <div className="setting" onClick={handleOption} style={{ cursor: "pointer" }}>
            <FontAwesomeIcon icon={faCog} /> {t("setting")}
          </div>
        </div>
      </div>
      <Routes>
        <Route path="/" element={<MainContainer />} />
        <Route path="/:id" element={<EditorContainer />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
