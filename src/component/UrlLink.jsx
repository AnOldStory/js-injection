import { Link } from "react-router-dom";
import DeleteButton from "component/DeleteButton";
import { useStorage } from "store/useStorage";
import { saveRule } from "shared/rule-store";
import { executeUserCode } from "shared/execute";
import { isInjectableUrl, matchesRule } from "shared/url-match";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faToggleOn, faToggleOff, faTag, faUnlock } from "@fortawesome/free-solid-svg-icons";

function UrlLink({ id, nickname, url, enabled, unlockRightClick, tags, code, cssCode, jquery, runAt, matched }) {
  const { loadStorage, t } = useStorage();
  const isEnabled = enabled !== false;

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await saveRule(id, {
        nickname,
        url,
        code,
        cssCode: cssCode || "",
        jquery: jquery || "none",
        enabled: !isEnabled,
        unlockRightClick: !!unlockRightClick,
        runAt: runAt || "document_start",
        tags: tags || "",
      });
      loadStorage();
    } catch (error) {
      alert(`${t("saveFailed")}\n${error?.message || error}`);
    }
  };

  const handleRunNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs?.[0];
      if (!tab?.id || !isInjectableUrl(tab.url || "")) {
        alert(t("runNowFail"));
        return;
      }

      /* Run Now is a manual shortcut for *this* rule, so it must respect the
         rule's own URL scope.  Only the top-level document is targeted:
         `allFrames` would also run the code inside cross-origin iframes whose
         URL never matched the rule. */
      if (!matchesRule(url, tab.url || "")) {
        alert(t("runNowNotMatched"));
        return;
      }

      if (cssCode) {
        await chrome.scripting
          .insertCSS({ target: { tabId: tab.id, frameIds: [0] }, css: cssCode })
          .catch(() => {});
      }

      if (code) {
        const result = await executeUserCode({
          tabId: tab.id,
          frameIds: [0],
          code,
          injectImmediately: true,
        });
        if (!result.ok) {
          alert(`${t("runNowFail")}\n${result.error || ""}`);
          return;
        }
      }

      alert(t("runNowSuccess"));
    } catch (error) {
      alert(`${t("runNowFail")}\n${error?.message || error}`);
    }
  };

  const tagList = (tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);

  return (
    <div
      className={`main-link arrange btn-margin ${!isEnabled ? "disabled-rule" : ""}`}
      style={{
        padding: "6px 10px",
        background: matched && isEnabled ? "#f4faff" : isEnabled ? "#fff" : "#f5f5f5",
        borderRadius: "4px",
        marginBottom: "6px",
        borderLeft: isEnabled ? "4px solid #4CAF50" : "4px solid #9e9e9e",
        boxShadow: matched ? "0 0 0 1px #90caf9" : "none",
      }}
    >
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
          {(nickname || url || "").length > 28 ? (nickname || url).slice(0, 25) + "..." : nickname || url}
          {matched && (
            <span style={{ fontSize: "10px", background: "#e3f2fd", color: "#1565c0", padding: "1px 5px", borderRadius: "4px", whiteSpace: "nowrap" }} title={t("matchedBadgeTooltip")}>
              {t("matchedBadge")}
            </span>
          )}
          {unlockRightClick && (
            <span style={{ fontSize: "10px", background: "#dcfce7", color: "#15803d", padding: "1px 5px", borderRadius: "4px" }} title={t("enableContextMenu")}>
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
