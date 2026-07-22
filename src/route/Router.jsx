import { useEffect, useCallback, useRef } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";

import Config from "_variables";

import { useDispatch, useSelector } from "react-redux";
import { set, setLang } from "store/modules/lists";
import { i18n } from "../i18n";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faGlobe } from "@fortawesome/free-solid-svg-icons";

import MainContainer from "container/main/MainContainer";
import EditorContainer from "container/editor/EditorContainer";

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

  const updateDB = useCallback(() => {
    chrome.storage.sync.get(null, (storageList) => {
      chrome.storage.sync.clear(() => {
        chrome.storage.sync.set(
          { version: Config.version, __globalEnabled: true, __lang: "ko" },
          () => {
            /* v1/v2 업데이트 호환 */
            Object.entries(storageList || {}).forEach(([id, value], i) => {
              if (id !== "version" && !id.startsWith("__")) {
                chrome.storage.sync.set({
                  [i]: {
                    nickname: decodeURIComponent(id),
                    url: decodeURIComponent(id),
                    code: Array.isArray(value) ? value[0] : value.code || "",
                    jquery: "jquery3",
                    enabled: true,
                    runAt: "document_start",
                    cssCode: "",
                    tags: "",
                  },
                });
              }
            });
            loadStorageRef.current?.();
          }
        );
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
      <div className="top arrange">
        <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
          <div className="title">{t("appTitle")} <span style={{ fontSize: "11px", opacity: 0.7 }}>v3.2.0</span></div>
        </Link>
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
