import { Link, useNavigate } from "react-router-dom";
import { useStorage } from "store/useStorage";
import { clearDraft } from "store/session";
import { deleteRule } from "shared/rule-store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus } from "@fortawesome/free-solid-svg-icons";

function DeleteButton({ id }) {
  const { loadStorage, t } = useStorage();
  const navigate = useNavigate();

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm(t("confirmDelete"))) return;

    try {
      await deleteRule(id);
      clearDraft(String(id));
      loadStorage();
      navigate("/");
    } catch (error) {
      alert(`${t("saveFailed")}\n${error?.message || error}`);
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
