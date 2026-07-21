import { useNavigate } from "react-router-dom";
import { useStorage } from "store/useStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";

function SaveButton({ editorState, isNew }) {
  const navigate = useNavigate();  // FIX #10: prop 대신 직접 사용
  const { loadStorage } = useStorage(); // FIX #9: 커스텀 훅

  const save = (id, nickname, url, code, jquery) => {
    chrome.storage.sync.set(
      { [id]: { nickname, url, code, jquery } },
      () => { loadStorage(() => navigate("/")); }
    );
  };

  const handleSync = () => {
    let { id, nickname, url, code, jquery } = editorState;
    if (!url) url = "https://*.example.com/";
    if (!nickname) nickname = url;

    if (!isNew) {
      chrome.storage.sync.remove(String(id), () => {
        save(id, nickname, url, code, jquery);
      });
    } else {
      save(id, nickname, url, code, jquery);
    }
  };

  return (
    <div className="big-btn">
      <div className="btn" onClick={handleSync}>
        <FontAwesomeIcon icon={faSave} size="lg" /> 저장하기
      </div>
    </div>
  );
}

export default SaveButton;
