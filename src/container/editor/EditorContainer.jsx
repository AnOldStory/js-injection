import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useParams } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { set } from "store/modules/lists";

import SaveButton from "component/SaveButton";

import "./EditorContainer.scss";

const AceEditor = lazy(() =>
  import("react-ace").then((mod) =>
    Promise.all([
      import("ace-builds/src-noconflict/mode-javascript"),
      import("ace-builds/src-noconflict/theme-monokai"),
      import("ace-builds/src-noconflict/ext-language_tools"),
    ]).then(() => mod)
  )
);

function EditorContainer() {
  const { id: paramId } = useParams();
  const dispatch = useDispatch();
  const storageList = useSelector((state) => state.lists.all);

  const [id, setId] = useState(paramId);
  const [nickname, setNickname] = useState("");
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [jquery, setJquery] = useState(false);

  // FIX #15: useCallback — eslint-disable 주석 불필요
  const loadList = useCallback(() => {
    chrome.storage.sync.get(null, (items) => {
      const { version: _, ...rest } = items;
      dispatch(set(rest));
      const item = rest[paramId];
      if (item) {
        setNickname(item.nickname || "");
        setUrl(item.url || "");
        setCode(item.code || "");
        setJquery(item.jquery || false);
      }
    });
  }, [dispatch, paramId]);

  useEffect(() => {
    if (paramId !== "new") {
      loadList();
    } else {
      let maxnum = 0;
      Object.keys(storageList).forEach((key) => {
        if (maxnum < Number(key)) maxnum = Number(key);
      });
      setId(maxnum + 1);
    }
  }, [paramId, loadList, storageList]);

  const editorState = { id, nickname, url, code, jquery };

  return (
    <div className="editor">
      <div className="nickname">
        <div className="block-name">규칙 이름</div>
        <input
          type="text"
          onChange={(e) => setNickname(e.target.value)}
          placeholder="example 사이트 스크립트"
          value={nickname}
          name="nickname"
          className="block"
        />
      </div>

      <div className="url">
        <div className="block-name">적용할 도메인</div>
        <input
          type="text"
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://*.example.com/"
          value={url}
          name="url"
          className="block"
        />
      </div>

      <div className="option">
        <div className="block-name">추가 옵션</div>
        <label className="options">
          Latest jQuery 자동 추가:
          <input
            type="checkbox"
            checked={jquery}
            onChange={(e) => setJquery(e.target.checked)}
            name="jquery"
          />{" "}
          (이미 존재하는 사이트의 Jquery와 충돌할 수 있습니다.)
        </label>
      </div>

      <div className="block-name"> 코드 </div>
      <Suspense
        fallback={
          <div
            style={{
              height: 350,
              background: "#272822",
              color: "#ccc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            에디터 로딩 중...
          </div>
        }
      >
        <AceEditor
          mode="javascript"
          theme="monokai"
          height="350px"
          width="99%"
          onChange={setCode}
          setOptions={{ tabSize: 2, enableLiveAutocompletion: true, useWorker: false }}
          value={code}
          editorProps={{ $blockScrolling: true }}
        />
      </Suspense>

      <SaveButton editorState={editorState} isNew={paramId === "new"} />
    </div>
  );
}

export default EditorContainer;
