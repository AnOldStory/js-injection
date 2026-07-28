import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { set } from "store/modules/lists";
import { useStorage } from "store/useStorage";
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

function EditorContainer() {
  const { id: paramId } = useParams();
  const dispatch = useDispatch();
  const storageList = useSelector((state) => state.lists.all);
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

  // Auto-fill active tab URL for new rules
  useEffect(() => {
    if (paramId === "new" && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs?.[0]?.url) {
          try {
            const parsedUrl = new URL(tabs[0].url);
            if (parsedUrl.protocol.startsWith("http")) {
              const defaultPattern = `${parsedUrl.protocol}//*.${parsedUrl.hostname.replace(/^www\./, "")}/*`;
              setUrl(defaultPattern);
              setNickname(`${parsedUrl.hostname} Custom Script`);
            }
          } catch {
            // chrome:// 같은 파싱 불가 URL이면 기본값 없이 빈 폼으로 둔다
          }
        }
      });
    }
  }, [paramId]);

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

  const loadList = useCallback(() => {
    chrome.storage.sync.get(null, (items) => {
      const { version: _, ...rest } = items || {};
      dispatch(set(rest));
      const item = rest[paramId];
      if (item) {
        setNickname(item.nickname || "");
        setUrl(item.url || "");
        setCode(item.code || "");
        setCssCode(item.cssCode || "");

        if (item.jquery === true) setJquery("jquery3");
        else if (item.jquery === false || !item.jquery) setJquery("none");
        else setJquery(item.jquery);

        setCustomLibUrl(item.customLibUrl || "");
        setEnabled(item.enabled !== false);
        setUnlockRightClick(item.unlockRightClick || false);
        setRunAt(item.runAt || "document_start");
        setTags(item.tags || "");
      }
    });
  }, [dispatch, paramId]);

  useEffect(() => {
    if (paramId !== "new") {
      loadList();
    } else {
      let maxnum = 0;
      Object.keys(storageList).forEach((key) => {
        if (!isNaN(Number(key)) && maxnum < Number(key)) maxnum = Number(key);
      });
      setId(maxnum + 1);
    }
  }, [paramId, loadList, storageList]);

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

  return (
    <div className="editor" style={{ padding: "12px" }}>
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
        <SaveButton editorState={editorState} isNew={paramId === "new"} />
      </div>
    </div>
  );
}

export default EditorContainer;
