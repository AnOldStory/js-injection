import { Link } from "react-router-dom";
import DeleteButton from "component/DeleteButton";
import { useStorage } from "store/useStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faToggleOn, faToggleOff, faTag, faUnlock } from "@fortawesome/free-solid-svg-icons";

function UrlLink({ id, nickname, url, enabled, unlockRightClick, tags, code, cssCode, jquery, customLibUrl, runAt }) {
  const { loadStorage, t } = useStorage();
  const isEnabled = enabled !== false;

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    chrome.storage.sync.set(
      {
        [id]: {
          nickname,
          url,
          code,
          cssCode: cssCode || "",
          jquery: jquery || "none",
          customLibUrl: customLibUrl || "",
          enabled: !isEnabled,
          unlockRightClick: !!unlockRightClick,
          runAt: runAt || "document_start",
          tags: tags || "",
        },
      },
      () => loadStorage()
    );
  };

  const handleRunNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs?.[0]?.id) return;
      const tabId = tabs[0].id;
      
      // Inject CSS if present
      if (cssCode) {
        chrome.scripting.insertCSS({
          target: { tabId },
          css: cssCode,
        }).catch(() => {});
      }

      // Inject JS Code
      if (code) {
        chrome.scripting.executeScript({
          target: { tabId, allFrames: true },
          world: "MAIN",
          func: (userCode) => {
            // MAIN world에서 사용자가 저장한 코드를 그대로 실행한다
            eval(userCode);
          },
          args: [code],
        }).then(() => {
          alert(t("runNowSuccess"));
        }).catch(() => {
          alert(t("runNowFail"));
        });
      }
    });
  };

  const tagList = (tags || "").split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <div className={`main-link arrange btn-margin ${!isEnabled ? "disabled-rule" : ""}`} style={{ padding: "6px 10px", background: isEnabled ? "#fff" : "#f5f5f5", borderRadius: "4px", marginBottom: "6px", borderLeft: isEnabled ? "4px solid #4CAF50" : "4px solid #9e9e9e" }}>
      <button
        onClick={handleToggle}
        title={isEnabled ? t("enabled") : t("disabled")}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "18px",
          color: isEnabled ? "#4CAF50" : "#9e9e9e",
          paddingRight: "8px",
        }}
      >
        <FontAwesomeIcon icon={isEnabled ? faToggleOn : faToggleOff} />
      </button>

      <Link className="list-link btn" to={String(id)} style={{ flex: 1, textDecoration: "none", opacity: isEnabled ? 1 : 0.6 }}>
        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#333", display: "flex", alignItems: "center", gap: "6px" }}>
          {nickname.length > 28 ? nickname.slice(0, 25) + "..." : nickname}
          {unlockRightClick && (
            <span style={{ fontSize: "10px", background: "#dcfce7", color: "#15803d", padding: "1px 5px", borderRadius: "4px" }} title="우클릭 해제 활성화됨">
              <FontAwesomeIcon icon={faUnlock} /> Unlock
            </span>
          )}
        </div>
        <div style={{ fontSize: "11px", color: "#777", wordBreak: "break-all" }}>{url}</div>
        {tagList.length > 0 && (
          <div style={{ display: "flex", gap: "4px", marginTop: "3px", flexWrap: "wrap" }}>
            {tagList.map((tag, idx) => (
              <span key={idx} style={{ fontSize: "10px", background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: "10px" }}>
                <FontAwesomeIcon icon={faTag} size="xs" /> {tag}
              </span>
            ))}
          </div>
        )}
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={handleRunNow}
          className="btn-run-now"
          title={t("runNow")}
          style={{
            background: "#2196F3",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "4px 8px",
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <FontAwesomeIcon icon={faPlay} size="xs" />
          <span className="big">{t("runNow")}</span>
        </button>

        <DeleteButton id={id} />
      </div>
    </div>
  );
}

export default UrlLink;
