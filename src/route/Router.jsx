import { useEffect, useCallback, useRef } from "react";
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";

import Config from "_variables";

import { useDispatch, useSelector } from "react-redux";
import { set, setLang } from "store/modules/lists";
import { detectLang, i18n } from "../i18n";

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

  const loadStorageRef = useRef(null);

  const syncToStore = useCallback(
    (items) => {
      const { version: _, ...rest } = items || {};
      dispatch(set(rest));
    },
    [dispatch]
  );

  /* v1/v2 규칙은 URL 문자열을 키로 쓰고 값에 url/nickname이 없다 */
  const isLegacyRule = (value) =>
    Array.isArray(value) || !(value && typeof value === "object" && "url" in value);

  const updateDB = useCallback(() => {
    chrome.storage.sync.get(null, (items) => {
      const stored = items || {};
      const prefs = {
        version: Config.version,
        __globalEnabled: stored.__globalEnabled !== false,
        __lang: stored.__lang || detectLang(),
      };
      const rules = Object.entries(stored).filter(
        ([id]) => id !== "version" && !id.startsWith("__")
      );

      /* 이미 현재 포맷이면 버전만 갱신한다 — 규칙을 건드리면 안 된다 */
      if (!rules.some(([, value]) => isLegacyRule(value))) {
        chrome.storage.sync.set(prefs, () => loadStorageRef.current?.());
        return;
      }

      /* v1/v2 업데이트 호환: 옛 포맷만 현재 포맷으로 옮긴다 */
      chrome.storage.sync.clear(() => {
        chrome.storage.sync.set(prefs, () => {
          rules.forEach(([id, value], i) => {
            chrome.storage.sync.set({
              [i]: isLegacyRule(value)
                ? {
                    nickname: decodeURIComponent(id),
                    url: decodeURIComponent(id),
                    code: Array.isArray(value) ? value[0] : value.code || "",
                    jquery: "jquery3",
                    enabled: true,
                    runAt: "document_start",
                    cssCode: "",
                    tags: "",
                  }
                : value,
            });
          });
          loadStorageRef.current?.();
        });
      });
    });
  }, []);

  const loadStorage = useCallback(() => {
    chrome.storage.sync.get(null, (result) => {
      if (result?.version !== Config.version) {
        updateDB();
      } else {
        syncToStore(result);
      }
    });
  }, [updateDB, syncToStore]);

  loadStorageRef.current = loadStorage;

  const handleOption = () => {
    window.open(chrome.runtime.getURL("index.html"));
  };

  const handleToggleLang = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextLang = lang === "ko" ? "en" : "ko";
    chrome.storage.sync.set({ __lang: nextLang }, () => {
      dispatch(setLang(nextLang));
    });
  };

  /* REALTIME SYNC across Popup, SidePanel, Options Page */
  useEffect(() => {
    loadStorage();

    const handleStorageChange = (changes, areaName) => {
      if (areaName === "sync") {
        loadStorage();
      }
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
