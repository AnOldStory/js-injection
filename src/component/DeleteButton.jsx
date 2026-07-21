import { Link } from "react-router-dom";
import { useStorage } from "store/useStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus } from "@fortawesome/free-solid-svg-icons";

function DeleteButton({ id }) {
  const { loadStorage } = useStorage(); // FIX #9: 커스텀 훅

  const handleDelete = () => {
    chrome.storage.sync.remove(String(id), () => {
      loadStorage();
    });
  };

  return (
    <div className="big delete">
      <Link to="/" className="btn delete-inner" onClick={handleDelete}>
        <FontAwesomeIcon icon={faMinus} size="lg" /> 삭제하기
      </Link>
    </div>
  );
}

export default DeleteButton;
