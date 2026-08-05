import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Config from "_variables";
import { useSelector, useDispatch } from "react-redux";
import { useStorage } from "store/useStorage";
import { clearAllDrafts } from "store/session";
import { setGlobalEnabled } from "store/modules/lists";
import { UNLOCK_RIGHT_CLICK_SCRIPT } from "../../unlockRightClick";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faDownload,
  faPlus,
  faTrashAlt,
  faPowerOff,
  faSearch,
  faCheckCircle,
  faSlidersH,
  faShieldAlt,
  faList,
  faCode,
  faUnlock,
  faRobot,
  faPlug,
  faCopy,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import UrlLink from "component/UrlLink";

import "./MainContainer.scss";

function glob(pattern, input) {
  try {
    const re = new RegExp(
      decodeURIComponent(
        pattern.replace(/([.?+^$[\]\\(){}|/-])/g, "\\$1").replace(/\*/g, ".*")
      )
    );
    return re.test(input);
  } catch {
    return false;
  }
}

function MainContainer() {
  const storageList = useSelector((state) => state.lists.all);
  const globalEnabled = useSelector((state) => state.lists.globalEnabled);
  const dispatch = useDispatch();

  const { loadStorage, t } = useStorage();
  const [err, setErr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTabUrl, setCurrentTabUrl] = useState("");

  // MCP State
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpUrl, setMcpUrl] = useState("ws://localhost:3000/mcp");
  const [mcpConnected, setMcpConnected] = useState(false);
  const [showMcpGuide, setShowMcpGuide] = useState(false);

  // Determine if running in Options Page vs Popup/Sidebar
  const isOptionsPage = !window.location.href.includes("popup") && window.innerWidth > 650;

  useEffect(() => {
    chrome.storage.sync.get(["__mcpEnabled", "__mcpUrl"], (items) => {
      setMcpEnabled(!!items.__mcpEnabled);
      if (items.__mcpUrl) setMcpUrl(items.__mcpUrl);
    });

    if (chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs?.[0]?.url) {
          setCurrentTabUrl(tabs[0].url);
        }
      });
    }

    const messageListener = (msg) => {
      if (msg.type === "MCP_STATUS_CHANGE") {
        setMcpConnected(msg.connected);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const handleToggleMcp = () => {
    const nextState = !mcpEnabled;
    setMcpEnabled(nextState);
    chrome.storage.sync.set({ __mcpEnabled: nextState, __mcpUrl: mcpUrl }, () => {
      chrome.runtime.sendMessage({
        type: nextState ? "CONNECT_MCP" : "DISCONNECT_MCP",
        url: mcpUrl,
      });
    });
  };

  const mcpConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        "js-injection": {
          command: "npx",
          args: ["-y", "js-injection-mcp"],
        },
      },
    },
    null,
    2
  );

  const handleCopyMcpConfig = () => {
    navigator.clipboard.writeText(mcpConfigSnippet).then(() => {
      alert(t("mcpCopySuccess"));
    });
  };

  const handleToggleGlobal = () => {
    const nextState = !globalEnabled;
    chrome.storage.sync.set({ __globalEnabled: nextState }, () => {
      dispatch(setGlobalEnabled(nextState));
    });
  };

  const handleQuickUnlock = () => {
    if (chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.[0]?.id) return;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          world: "MAIN",
          func: (code) => {
            // MAIN world에서 사용자가 저장한 코드를 그대로 실행한다
            eval(code);
          },
          args: [UNLOCK_RIGHT_CLICK_SCRIPT],
        }).then(() => {
          alert(t("enableContextMenuSuccess"));
        }).catch(() => {});
      });
    }
  };

  const handleClear = () => {
    if (window.confirm(t("confirmDeleteAll"))) {
      chrome.storage.sync.clear(() => {
        clearAllDrafts();
        chrome.storage.sync.set({ version: Config.version, __globalEnabled: true }, () => {
          loadStorage();
        });
      });
    }
  };

  const handleWarning = () => {
    alert(t("backupWarning"));
  };

  const saveItem = (id, item) => {
    chrome.storage.sync.set({ [id]: item }, () => {
      loadStorage();
    });
  };

  const handleUpload = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      if (validate(fileReader.result)) {
        const result = JSON.parse(fileReader.result);
        clearAllDrafts();
        chrome.storage.sync.clear(() => {
          chrome.storage.sync.set({ version: Config.version, __globalEnabled: true }, () => {
            for (let key in result) {
              if (key !== "version" && !key.startsWith("__")) {
                saveItem(key, result[key]);
              }
            }
            setErr("");
          });
        });
      } else {
        setErr(t("invalidFile"));
      }
    };
    fileReader.readAsText(e.target.files[0]);
  };

  const validate = (obj) => {
    try {
      const result = JSON.parse(obj);
      return typeof result === "object" && result !== null;
    } catch {
      return false;
    }
  };

  const matchesCurrentTab = (item) => !!currentTabUrl && glob(item.url || "", currentTabUrl);

  // Filter rules by search query
  const filteredList = Object.entries(storageList).filter(([key, item]) => {
    if (key === "version" || key.startsWith("__")) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nicknameMatch = (item.nickname || "").toLowerCase().includes(q);
    const urlMatch = (item.url || "").toLowerCase().includes(q);
    const tagMatch = (item.tags || "").toLowerCase().includes(q);
    return nicknameMatch || urlMatch || tagMatch;
  });

  const totalRulesCount = Object.keys(storageList).filter((k) => k !== "version" && !k.startsWith("__")).length;
  const activeRulesCount = Object.entries(storageList).filter(([k, v]) => k !== "version" && !k.startsWith("__") && v.enabled !== false).length;

  // Calculate active tab matching count
  const matchingActiveCount = Object.entries(storageList).filter(([key, item]) => {
    if (key === "version" || key.startsWith("__")) return false;
    return item.enabled !== false && matchesCurrentTab(item);
  }).length;

  /* 규칙이 많아지면 지금 보고 있는 페이지에 걸리는 규칙부터 찾게 된다 — 위로 올린다 */
  const matchedList = filteredList.filter(([, item]) => matchesCurrentTab(item));
  const otherList = filteredList.filter(([, item]) => !matchesCurrentTab(item));
  const grouped = matchedList.length > 0 && otherList.length > 0;

  const mainListUI = (
    <>
      {/* Master Switch Panel */}
      <div
        style={{
          padding: "10px 14px",
          background: globalEnabled ? "#e8f5e9" : "#ffebee",
          borderBottom: `2px solid ${globalEnabled ? "#4CAF50" : "#f44336"}`,
          borderRadius: isOptionsPage ? "6px 6px 0 0" : "0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "13px", color: globalEnabled ? "#2e7d32" : "#c62828" }}>
          <FontAwesomeIcon icon={faPowerOff} style={{ marginRight: "6px" }} />
          {globalEnabled ? t("masterSwitchOn") : t("masterSwitchOff")}
        </div>
        <button
          onClick={handleToggleGlobal}
          style={{
            background: globalEnabled ? "#4CAF50" : "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "4px 12px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "12px",
          }}
        >
          {globalEnabled ? t("globalDisable") : t("globalEnable")}
        </button>
      </div>

      {/* Active Tab Match Indicator & Quick Unlock Button */}
      {currentTabUrl && (
        <div
          style={{
            padding: "6px 14px",
            background: "#e3f2fd",
            color: "#1565c0",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FontAwesomeIcon icon={faCheckCircle} />
            {matchingActiveCount > 0
              ? `${t("activeTabStatus")}: ${matchingActiveCount} ${t("activeTabMatching")}`
              : t("activeTabNone")}
          </div>

          <button
            onClick={handleQuickUnlock}
            style={{
              background: "#1565c0",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "11px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            title={t("quickUnlockTooltip")}
          >
            <FontAwesomeIcon icon={faUnlock} /> {t("quickUnlockContextMenu")}
          </button>
        </div>
      )}

      {/* Action Buttons & Search Bar */}
      <div style={{ padding: "12px 14px 0 14px" }}>
        <div className="big-btn" style={{ width: "100%", margin: "0 0 10px 0" }}>
          <Link to="new">
            <FontAwesomeIcon icon={faPlus} size="lg" /> {t("addNewRule")}
          </Link>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px 8px 32px",
              boxSizing: "border-box",
              borderRadius: "4px",
              border: "1px solid #ccc",
              fontSize: "13px",
            }}
          />
          <FontAwesomeIcon
            icon={faSearch}
            style={{ position: "absolute", left: "10px", top: "10px", color: "#888" }}
          />
        </div>
      </div>

      {/* Rule List — 현재 페이지에 적용되는 규칙이 맨 위로 */}
      <div className="bottom" style={{ padding: "0 14px 14px 14px" }}>
        {filteredList.length > 0 ? (
          <>
            {grouped && (
              <div className="list-section-title" style={{ color: "#1565c0" }}>
                <FontAwesomeIcon icon={faCheckCircle} /> {t("sectionForThisPage")} ({matchedList.length})
              </div>
            )}
            {matchedList.map(([id, value]) => (
              <UrlLink id={id} {...value} key={id} matched />
            ))}

            {grouped && (
              <div className="list-section-title">
                <FontAwesomeIcon icon={faList} /> {t("sectionOtherRules")} ({otherList.length})
              </div>
            )}
            {otherList.map(([id, value]) => (
              <UrlLink id={id} {...value} key={id} />
            ))}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px", color: "#888", fontSize: "13px" }}>
            {searchQuery ? t("noSearchResults") : t("noRulesRegistered")}
          </div>
        )}
      </div>
    </>
  );

  if (isOptionsPage) {
    return (
      <div className="options-dashboard">
        <div className="options-grid">
          {/* Main Left Panel: Rule List */}
          <div className="options-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: "#f8f9fa", borderBottom: "1px solid #eee", fontWeight: "bold", fontSize: "15px", color: "#333", display: "flex", alignItems: "center", gap: "8px" }}>
              <FontAwesomeIcon icon={faList} /> {t("ruleListTitle")} ({filteredList.length})
            </div>
            {mainListUI}
          </div>

          {/* Right Panel: Settings, Statistics, MCP & Backup Management */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* MCP AI Protocol Bridge Card */}
            <div className="options-card" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
              <div className="options-card-header" style={{ color: "#166534", borderBottomColor: "#bbf7d0", justifyContent: "space-between" }}>
                <div>
                  <FontAwesomeIcon icon={faRobot} /> {t("mcpTitle")}
                </div>
                <button
                  onClick={() => setShowMcpGuide(!showMcpGuide)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#15803d",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <FontAwesomeIcon icon={faInfoCircle} /> {showMcpGuide ? t("mcpGuideClose") : t("mcpGuideOpen")}
                </button>
              </div>

              <div style={{ fontSize: "12px", color: "#15803d", marginBottom: "10px", lineHeight: "1.4" }}>
                {t("mcpDesc")}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder={t("mcpServerUrl")}
                  style={{ padding: "6px 8px", borderRadius: "4px", border: "1px solid #a7f3d0", fontSize: "12px" }}
                />
                <button
                  onClick={handleToggleMcp}
                  style={{
                    padding: "8px",
                    background: mcpEnabled ? "#dc2626" : "#16a34a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  <FontAwesomeIcon icon={faPlug} /> {mcpEnabled ? t("mcpDisconnectBtn") : t("mcpConnectBtn")}
                </button>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: mcpConnected ? "#15803d" : "#6b7280", marginTop: "2px" }}>
                  {mcpConnected ? t("mcpStatusConnected") : t("mcpStatusDisconnected")}
                </div>
              </div>

              {/* Interactive MCP Guide Accordion */}
              {showMcpGuide && (
                <div style={{ marginTop: "12px", padding: "10px", background: "#ffffff", borderRadius: "6px", border: "1px solid #bbf7d0", fontSize: "12px", color: "#333" }}>
                  <div style={{ fontWeight: "bold", color: "#166534", marginBottom: "6px" }}>{t("mcpGuideTitle")}</div>
                  <div style={{ marginBottom: "4px", color: "#555" }}>{t("mcpGuideStep1")}</div>
                  <code style={{ display: "block", background: "#f3f4f6", padding: "4px 6px", borderRadius: "4px", fontSize: "11px", wordBreak: "break-all", marginBottom: "8px" }}>
                    npx -y js-injection-mcp
                  </code>

                  <div style={{ marginBottom: "4px", color: "#555" }}>{t("mcpGuideStep2")}</div>
                  <pre style={{ background: "#1e293b", color: "#f8fafc", padding: "8px", borderRadius: "4px", fontSize: "10px", overflowX: "auto", margin: "0 0 8px 0" }}>
                    {mcpConfigSnippet}
                  </pre>
                  <button
                    onClick={handleCopyMcpConfig}
                    style={{
                      width: "100%",
                      padding: "6px",
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    <FontAwesomeIcon icon={faCopy} /> {t("mcpCopyConfig")}
                  </button>
                </div>
              )}
            </div>

            {/* System Status Summary */}
            <div className="options-card">
              <div className="options-card-header">
                <FontAwesomeIcon icon={faSlidersH} /> {t("dashboardTitle")}
              </div>
              <div style={{ fontSize: "13px", lineHeight: "1.8", color: "#555" }}>
                <div>• {t("totalRules")} <strong>{totalRulesCount}</strong></div>
                <div>• {t("activeRules")} <strong style={{ color: "#2e7d32" }}>{activeRulesCount}</strong></div>
                <div>• {t("injectionStatus")} <strong style={{ color: globalEnabled ? "#2e7d32" : "#c62828" }}>{globalEnabled ? t("statusNormal") : t("statusPaused")}</strong></div>
                <div>• {t("appVersion")} <strong>v{Config.version}</strong></div>
              </div>
            </div>

            {/* Quick Presets / Tips */}
            <div className="options-card">
              <div className="options-card-header">
                <FontAwesomeIcon icon={faCode} /> {t("quickTipsTitle")}
              </div>
              <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.6" }}>
                <p style={{ margin: "0 0 6px 0" }}>🤖 {t("tipMcp")}</p>
                <p style={{ margin: "0 0 6px 0" }}>🔓 {t("tipUnlock")}</p>
                <p style={{ margin: "0 0 6px 0" }}>💡 {t("tipLiveCss")}</p>
                <p style={{ margin: 0 }}>💡 {t("tipRunNow")}</p>
              </div>
            </div>

            {/* Danger / Backup Controls */}
            <div className="options-card" style={{ background: "#fff8e1", borderColor: "#ffe082" }}>
              <div className="options-card-header" style={{ color: "#b78103", borderBottomColor: "#ffecb3" }}>
                <FontAwesomeIcon icon={faShieldAlt} /> {t("backupSectionTitle")}
              </div>
              <div style={{ fontSize: "12px", color: "#795548", marginBottom: "12px", lineHeight: "1.4" }}>
                {t("backupDesc")}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <a
                  href={"data:text/json," + encodeURIComponent(JSON.stringify(storageList))}
                  className="btn"
                  download="js-injection-backup.json"
                  style={{
                    display: "block",
                    padding: "8px",
                    background: "#2196F3",
                    color: "#fff",
                    textAlign: "center",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    textDecoration: "none",
                  }}
                >
                  <FontAwesomeIcon icon={faDownload} /> {t("backupDownload")}
                </a>

                <div className="upload" style={{ width: "100%" }}>
                  <div className="btn" style={{ padding: "8px", background: "#4CAF50", color: "#fff", textAlign: "center", borderRadius: "4px", fontWeight: "bold", fontSize: "12px" }}>
                    <FontAwesomeIcon icon={faUpload} /> {t("backupUpload")}
                  </div>
                  <input type="file" className="file btn" onClick={handleWarning} onChange={handleUpload} />
                </div>

                <button
                  onClick={handleClear}
                  style={{
                    padding: "8px",
                    background: "#d32f2f",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer",
                    marginTop: "6px",
                  }}
                >
                  <FontAwesomeIcon icon={faTrashAlt} /> {t("allRulesDelete")}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="alert">{err}</div>
      </div>
    );
  }

  // Popup / SidePanel View
  return (
    <div className="main">
      {mainListUI}
      <div className="alert">{err}</div>
    </div>
  );
}

export default MainContainer;
