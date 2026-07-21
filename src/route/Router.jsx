import { useEffect, useCallback, useRef } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";

import Config from "_variables";

import { useDispatch } from "react-redux";
import { set } from "store/modules/lists";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

import MainContainer from "container/main/MainContainer";
import EditorContainer from "container/editor/EditorContainer";

function AppRouter() {
  const dispatch = useDispatch();

  /* useRef로 순환 참조(loadStorage ↔ updateDB) 없이 최신 함수 참조 유지 */
  const loadStorageRef = useRef(null);

  const syncToStore = useCallback((items) => {
    const { version: _, ...rest } = items;
    dispatch(set(rest));
  }, [dispatch]);

  const updateDB = useCallback(() => {
    chrome.storage.sync.get(null, (storageList) => {
      chrome.storage.sync.clear(() => {
        chrome.storage.sync.set({ version: Config.version }, () => {
          /* v1 업데이트 호환 */
          Object.entries(storageList).forEach(([id, value], i) => {
            if (id !== "version") {
              chrome.storage.sync.set({
                [i]: {
                  nickname: decodeURIComponent(id),
                  url: decodeURIComponent(id),
                  code: value[0],
                  jquery: false,
                },
              });
            }
          });
          loadStorageRef.current?.();
        });
      });
    });
  }, []);

  const loadStorage = useCallback(() => {
    chrome.storage.sync.get("version", (result) => {
      if (result.version !== Config.version) {
        updateDB();
      } else {
        chrome.storage.sync.get(null, (items) => {
          syncToStore(items);
        });
      }
    });
  }, [updateDB, syncToStore]);

  /* ref를 항상 최신 함수로 유지 */
  loadStorageRef.current = loadStorage;

  const handleOption = () => {
    window.open(chrome.runtime.getURL("index.html"));
  };

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  return (
    <HashRouter basename="/">
      <Link to="/">
        <div className="top arrange">
          <div className="title">JS-Injection</div>
          <div className="small">
            <div className="setting" onClick={handleOption}>
              <FontAwesomeIcon icon={faCog} /> 설정
            </div>
          </div>
        </div>
      </Link>
      <Routes>
        <Route path="/" element={<MainContainer />} />
        <Route path="/:id" element={<EditorContainer />} />
      </Routes>
    </HashRouter>
  );
}

export default AppRouter;
