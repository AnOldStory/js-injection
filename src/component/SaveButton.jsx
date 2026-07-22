import { useNavigate } from "react-router-dom";
import { useStorage } from "store/useStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";

function SaveButton({ editorState, isNew }) {
  const navigate = useNavigate();
  const { loadStorage, t } = useStorage();

  const save = (id, stateData) => {
    chrome.storage.sync.set(
      { [id]: stateData },
      () => { loadStorage(() => navigate("/")); }
    );
  };

  const handleSync = () => {
    let { id, nickname, url, code, cssCode, jquery, customLibUrl, enabled, unlockRightClick, runAt, tags } = editorState;
    if (!url) url = "https://*.example.com/";
    if (!nickname) nickname = url;

    const dataToSave = {
      nickname,
      url,
      code,
      cssCode: cssCode || "",
      jquery: jquery || "none",
      customLibUrl: customLibUrl || "",
      enabled: enabled !== false,
      unlockRightClick: !!unlockRightClick,
      runAt: runAt || "document_start",
      tags: tags || "",
    };

    if (!isNew) {
      chrome.storage.sync.remove(String(id), () => {
        save(id, dataToSave);
      });
    } else {
      save(id, dataToSave);
    }
  };

  return (
    <div className="big-btn">
      <div className="btn" onClick={handleSync} style={{ cursor: "pointer" }}>
        <FontAwesomeIcon icon={faSave} size="lg" /> {t("save")}
      </div>
    </div>
  );
}

export default SaveButton;
