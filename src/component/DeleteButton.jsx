import { Link } from "react-router-dom";
import { useStorage } from "store/useStorage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus } from "@fortawesome/free-solid-svg-icons";

function DeleteButton({ id }) {
  const { loadStorage, t } = useStorage();

  const handleDelete = (e) => {
    e.preventDefault();
    if (window.confirm(t("confirmDelete"))) {
      chrome.storage.sync.remove(String(id), () => {
        loadStorage();
      });
    }
  };

  return (
    <div className="big delete">
      <Link to="/" className="btn delete-inner" onClick={handleDelete} title={t("delete")}>
        <FontAwesomeIcon icon={faMinus} size="lg" /> {t("delete")}
      </Link>
    </div>
  );
}

export default DeleteButton;
