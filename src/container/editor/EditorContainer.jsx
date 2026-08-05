import { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { useStorage } from "store/useStorage";
import { loadDraft, saveDraft, clearDraft } from "store/session";
import SaveButton from "component/SaveButton";

import "./EditorContainer.scss";

const AceEditor = lazy(() =>
  import("react-ace").then((mod) =>
    Promise.all([
      import("ace-builds/src-noconflict/mode-javascript"),
      import("ace-builds/src-noconflict/mode-css"),
      import("ace-builds/src-noconflict/theme-monokai"),
      import("ace-builds/src-noconflict/ext-language_tools"),
    ]).then(() => mod)
  )
);

const EMPTY_STATE = {
  id: "new",
  nickname: "",
  url: "",
  code: "",
  cssCode: "",
  jquery: "none",
  customLibUrl: "",
  enabled: true,
  unlockRightClick: false,
  runAt: "document_start",
  tags: "",
  activeTab: "js",
};

/* 저장된 규칙(jquery 가 true/false 였던 구버전 포함)을 폼 상태로 편다 */
function fromStored(item, id) {
  let jquery = "none";
  if (item.jquery === true) jquery = "jquery3";
  else if (item.jquery && item.jquery !== false) jquery = item.jquery;

  return {
    ...EMPTY_STATE,
    id,
    nickname: item.nickname || "",
    url: item.url || "",
    code: item.code || "",
    cssCode: item.cssCode || "",
    jquery,
    customLibUrl: item.customLibUrl || "",
    enabled: item.enabled !== false,
    unlockRightClick: !!item.unlockRightClick,
    runAt: item.runAt || "document_start",
    tags: item.tags || "",
  };
}

/* 새 규칙이면 현재 탭 도메인을 미리 채워 준다 — 어디까지나 초기값이라 그대로 고칠 수 있다 */
function withActiveTabUrl(base, tabUrl) {
  try {
    const parsed = new URL(tabUrl);
    if (!parsed.protocol.startsWith("http")) return base;
    return {
      ...base,
      url: `${parsed.protocol}//*.${parsed.hostname.replace(/^www\./, "")}/*`,
      nickname: `${parsed.hostname} Custom Script`,
    };
  } catch {
    return base; // chrome:// 같이 파싱 불가한 주소면 빈 폼으로 둔다
  }
}

const FIELDS = Object.keys(EMPTY_STATE).sort();
const serialize = (state) => JSON.stringify(FIELDS.map((key) => [key, state?.[key] ?? null]));

function EditorContainer() {
  const { id: paramId } = useParams();
  const { t } = useStorage();

  const [id, setId] = useState(paramId);
  const [nickname, setNickname] = useState("");
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jquery, setJquery] = useState("none");
  const [customLibUrl, setCustomLibUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [unlockRightClick, setUnlockRightClick] = useState(false);
  const [runAt, setRunAt] = useState("document_start");
  const [tags, setTags] = useState("");
  const [activeTab, setActiveTab] = useState("js");
  const [liveCss, setLiveCss] = useState(true);
  const [ready, setReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  /* 저장소에 들어있는 원본 — 임시 저장본과 비교하고 '되돌리기'의 기준이 된다 */
  const baselineRef = useRef(null);
  const loadedForRef = useRef(null);

  const applyState = useCallback((state) => {
    setId(state.id);
    setNickname(state.nickname);
    setUrl(state.url);
    setCode(state.code);
    setCssCode(state.cssCode);
    setJquery(state.jquery);
    setCustomLibUrl(state.customLibUrl);
    setEnabled(state.enabled);
    setUnlockRightClick(state.unlockRightClick);
    setRunAt(state.runAt);
    setTags(state.tags);
    setActiveTab(state.activeTab || "js");
  }, []);

  /* 저장소에서 이 화면의 원본 상태를 만든다 (새 규칙이면 다음 번호 + 자동 입력) */
  const buildBaseline = useCallback(
    (done) => {
      chrome.storage.sync.get(null, (items) => {
        const stored = items || {};

        if (paramId !== "new") {
          done(fromStored(stored[paramId] || {}, paramId));
          return;
        }

        let maxnum = 0;
        Object.keys(stored).forEach((key) => {
          if (key !== "" && !isNaN(Number(key)) && maxnum < Number(key)) maxnum = Number(key);
        });
        const base = { ...EMPTY_STATE, id: maxnum + 1 };

        if (!chrome.tabs?.query) {
          done(base);
          return;
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          done(tabs?.[0]?.url ? withActiveTabUrl(base, tabs[0].url) : base);
        });
      });
    },
    [paramId]
  );

  /*
   * 폼은 화면당 딱 한 번만 채운다. 다른 창의 저장이나 storage 변경 때문에
   * 다시 읽어오면 입력 중이던 URL·코드가 계속 원래대로 되돌아간다.
   */
  useEffect(() => {
    if (loadedForRef.current === paramId) return;
    loadedForRef.current = paramId;

    buildBaseline((base) => {
      baselineRef.current = base;
      loadDraft(paramId, (draft) => {
        /* 규칙 번호만은 항상 지금 저장소 기준으로 — 묵혀 둔 초안이 기존 규칙을 덮어쓰면 안 된다 */
        const merged = draft ? { ...base, ...draft, id: base.id } : base;
        if (draft && serialize(merged) !== serialize(base)) {
          applyState(merged);
          setDraftRestored(true);
        } else {
          applyState(base);
          if (draft) clearDraft(paramId);
        }
        setReady(true);
      });
    });
  }, [paramId, buildBaseline, applyState]);

  // LIVE CSS SYNC: Apply CSS changes immediately to active tab without reload
  const handleCssChange = (newCss) => {
    setCssCode(newCss);
    if (!liveCss) return;

    if (chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.[0]?.id) return;
        const tabId = tabs[0].id;

        chrome.scripting.executeScript({
          target: { tabId },
          func: (cssText, ruleId) => {
            const styleId = `js-injection-live-style-${ruleId}`;
            let styleEl = document.getElementById(styleId);
            if (!styleEl) {
              styleEl = document.createElement("style");
              styleEl.id = styleId;
              (document.head || document.documentElement).appendChild(styleEl);
            }
            styleEl.textContent = cssText;
          },
          args: [newCss, id],
        }).catch(() => {});
      });
    }
  };

  const editorState = {
    id,
    nickname,
    url,
    code,
    cssCode,
    jquery,
    customLibUrl,
    enabled,
    unlockRightClick,
    runAt,
    tags,
  };

  /*
   * 팝업은 웹페이지를 클릭하는 순간 닫히면서 통째로 사라진다.
   * 저장 전 편집 내용을 계속 임시 보관해 두고, 다시 열릴 때 위에서 복원한다.
   */
  const snapshotRef = useRef(null);
  snapshotRef.current = ready ? { ...editorState, activeTab } : null;

  useEffect(() => {
    if (!ready) return undefined;

    const flush = () => {
      const snapshot = snapshotRef.current;
      if (!snapshot) return;
      if (baselineRef.current && serialize(snapshot) === serialize(baselineRef.current)) {
        clearDraft(paramId);
      } else {
        saveDraft(paramId, snapshot);
      }
    };

    const timer = setTimeout(flush, 250);
    /* 팝업이 닫히기 직전 마지막 입력까지 챙긴다 */
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
    };
  }, [
    ready,
    paramId,
    id,
    nickname,
    url,
    code,
    cssCode,
    jquery,
    customLibUrl,
    enabled,
    unlockRightClick,
    runAt,
    tags,
    activeTab,
  ]);

  const handleDiscardDraft = () => {
    clearDraft(paramId);
    if (baselineRef.current) applyState(baselineRef.current);
    setDraftRestored(false);
  };

  return (
    <div className="editor" style={{ padding: "12px" }}>
      {/* Restored Draft Notice */}
      {draftRestored && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px 12px",
            background: "#fff8e1",
            border: "1px solid #ffe082",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#8d6e00",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>⏱ {t("draftRestored")}</span>
          <button
            onClick={handleDiscardDraft}
            style={{
              background: "transparent",
              border: "1px solid #ffca28",
              borderRadius: "4px",
              padding: "3px 8px",
              fontSize: "11px",
              fontWeight: "bold",
              color: "#8d6e00",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t("draftDiscard")}
          </button>
        </div>
      )}

      {/* Rule Name & Enabled Toggle */}
      <div className="nickname" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <div className="block-name">{t("ruleName")}</div>
          <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {t("enabled")}
          </label>
        </div>
        <input
          type="text"
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t("ruleNamePlaceholder")}
          value={nickname}
          name="nickname"
          className="block"
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>

      {/* Target Domain */}
      <div className="url" style={{ marginBottom: "12px" }}>
        <div className="block-name">{t("targetDomain")}</div>
        <input
          type="text"
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("targetDomainPlaceholder")}
          value={url}
          name="url"
          className="block"
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
        {paramId === "new" && url && !draftRestored && (
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
            {t("autoFilledUrl")}
          </div>
        )}
      </div>

      {/* Unlock Right Click Option */}
      <div style={{ marginBottom: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "6px" }}>
        <label style={{ fontSize: "13px", fontWeight: "bold", color: "#166534", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="checkbox"
            checked={unlockRightClick}
            onChange={(e) => setUnlockRightClick(e.target.checked)}
          />
          🔓 {t("enableContextMenu")}
        </label>
        <div style={{ fontSize: "11px", color: "#15803d", marginTop: "2px", marginLeft: "22px" }}>
          {t("enableContextMenuDesc")}
        </div>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: "12px" }}>
        <div className="block-name">{t("tags")}</div>
        <input
          type="text"
          onChange={(e) => setTags(e.target.value)}
          placeholder={t("tagsPlaceholder")}
          value={tags}
          className="block"
          style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
        />
      </div>

      {/* Run At Option */}
      <div style={{ marginBottom: "12px" }}>
        <div className="block-name">{t("runAt")}</div>
        <select
          value={runAt}
          onChange={(e) => setRunAt(e.target.value)}
          style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
        >
          <option value="document_start">{t("runAtStart")}</option>
          <option value="document_idle">{t("runAtIdle")}</option>
          <option value="document_end">{t("runAtEnd")}</option>
        </select>
      </div>

      {/* External Library & CDN Options */}
      <div className="option" style={{ marginBottom: "12px" }}>
        <div className="block-name">{t("libraryOption")}</div>
        <select
          value={jquery}
          onChange={(e) => setJquery(e.target.value)}
          style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginBottom: "6px" }}
        >
          <option value="none">{t("libNone")}</option>
          <option value="jquery3">{t("libJquery3")}</option>
          <option value="jquery2">{t("libJquery2")}</option>
          <option value="jquery1">{t("libJquery1")}</option>
          <option value="lodash">{t("libLodash")}</option>
          <option value="axios">{t("libAxios")}</option>
          <option value="dayjs">{t("libDayjs")}</option>
          <option value="tailwind">{t("libTailwind")}</option>
          <option value="custom">{t("libCustom")}</option>
        </select>

        {jquery === "custom" && (
          <input
            type="text"
            placeholder={t("customUrlPlaceholder")}
            value={customLibUrl}
            onChange={(e) => setCustomLibUrl(e.target.value)}
            style={{ width: "100%", padding: "8px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        )}
      </div>

      {/* Code Editor Tabs (JS / CSS) & Live CSS Toggle */}
      <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setActiveTab("js")}
            style={{
              padding: "6px 16px",
              border: "none",
              background: activeTab === "js" ? "#272822" : "#e0e0e0",
              color: activeTab === "js" ? "#fff" : "#333",
              cursor: "pointer",
              fontWeight: "bold",
              borderRadius: "4px 4px 0 0",
            }}
          >
            JavaScript
          </button>
          <button
            onClick={() => setActiveTab("css")}
            style={{
              padding: "6px 16px",
              border: "none",
              background: activeTab === "css" ? "#272822" : "#e0e0e0",
              color: activeTab === "css" ? "#fff" : "#333",
              cursor: "pointer",
              fontWeight: "bold",
              borderRadius: "4px 4px 0 0",
            }}
          >
            CSS (Styles)
          </button>
        </div>

        {activeTab === "css" && (
          <label style={{ fontSize: "11px", color: "#4CAF50", fontWeight: "bold", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={liveCss}
              onChange={(e) => setLiveCss(e.target.checked)}
            />
            ⚡ {t("liveCssSync")}
          </label>
        )}
      </div>

      <Suspense
        fallback={
          <div
            style={{
              height: 520,
              background: "#272822",
              color: "#ccc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t("editorLoading")}
          </div>
        }
      >
        {activeTab === "js" ? (
          <AceEditor
            mode="javascript"
            theme="monokai"
            height="520px"
            width="100%"
            onChange={setCode}
            setOptions={{ tabSize: 2, enableLiveAutocompletion: true, useWorker: false }}
            value={code}
            editorProps={{ $blockScrolling: true }}
          />
        ) : (
          <AceEditor
            mode="css"
            theme="monokai"
            height="520px"
            width="100%"
            onChange={handleCssChange}
            setOptions={{ tabSize: 2, enableLiveAutocompletion: true, useWorker: false }}
            value={cssCode}
            editorProps={{ $blockScrolling: true }}
          />
        )}
      </Suspense>

      <div style={{ marginTop: "12px" }}>
        <SaveButton editorState={editorState} isNew={paramId === "new"} draftKey={paramId} />
      </div>
    </div>
  );
}

export default EditorContainer;
