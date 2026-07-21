import { useState } from "react";
import { Link } from "react-router-dom";

import Config from "_variables";

import { useSelector } from "react-redux";
import { useStorage } from "store/useStorage";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faDownload,
  faPlus,
  faTrashAlt
} from "@fortawesome/free-solid-svg-icons";
import UrlLink from "component/UrlLink";

import "./MainContainer.scss";

function MainContainer() {
  const storageList = useSelector((state) => state.all);
  const { loadStorage } = useStorage();
  const [err, setErr] = useState("");

  const handleClear = () => {
    chrome.storage.sync.clear(() => {
      loadStorage();
    });
  };

  const handleWarning = () => {
    alert("백업 파일 업로드시 기존의 규칙은 모두 사라집니다!");
  };

  const saveItem = (id, nickname, url, code, jquery) => {
    chrome.storage.sync.set(
      { [id]: { nickname, url, code, jquery } },
      () => { loadStorage(); }
    );
  };

  const handleUpload = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      if (validate(fileReader.result)) {
        const result = JSON.parse(fileReader.result);
        chrome.storage.sync.clear(() => {
          chrome.storage.sync.set({ version: Config.version }, () => {
            for (let key in result) {
              const { nickname, url, code, jquery } = result[key];
              saveItem(key, nickname, url, code, jquery);
            }
            setErr("");
          });
        });
      } else {
        setErr("올바르지 않은 파일 입니다!");
      }
    };
    fileReader.readAsText(e.target.files[0]);
  };

  // FIX #1: 수정된 validate — jquery는 boolean 타입 검사로
  const validate = (obj) => {
    try {
      const result = JSON.parse(obj);
      for (let key in result) {
        const { nickname, url, code, jquery } = result[key];
        if (!key || !nickname || !url || !code || typeof jquery !== "boolean") {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="main">
      <div className="big-btn">
        <Link to="new">
          <FontAwesomeIcon icon={faPlus} size="lg" /> 새로운 규칙 추가
        </Link>
      </div>

      <div className="bottom">
        {/* FIX #2: key={id} — 고유 id 사용 */}
        {Object.entries(storageList).map(([id, value]) => (
          <UrlLink id={id} {...value} key={id} />
        ))}
      </div>

      <div className="big big-btn">
        <div className="btn" onClick={handleClear}>
          <FontAwesomeIcon icon={faTrashAlt} size="lg" /> 모든 규칙 삭제
        </div>
      </div>

      <div className="big big-btn">
        <a
          href={
            "data:text/json," +
            encodeURIComponent(JSON.stringify(storageList))
          }
          className="btn"
          download="backup.json"
        >
          <FontAwesomeIcon icon={faDownload} size="lg" /> 백업 다운
        </a>
      </div>

      <div className="big big-btn upload">
        <div className="btn">
          <FontAwesomeIcon icon={faUpload} size="lg" /> 백업 업로드
        </div>
        <input
          type="file"
          className="file btn"
          onClick={handleWarning}
          onChange={handleUpload}
        />
      </div>
      <div className="alert">{err}</div>
    </div>
  );
}

export default MainContainer;
