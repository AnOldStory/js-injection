import { useNavigate } from "react-router-dom";
import { useStorage } from "store/useStorage";
import { clearDraft } from "store/session";
import { saveRule, isNumericId } from "shared/rule-store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";

function SaveButton({ editorState, draftKey }) {
  const navigate = useNavigate();
  const { loadStorage, t } = useStorage();

  const handleSync = async () => {
    const {
      id,
      nickname,
      url,
      code,
      cssCode,
      jquery,
      enabled,
      unlockRightClick,
      runAt,
      tags,
    } = editorState;

    /* Only numeric ids are router-safe.  A legacy URL-shaped key cannot be
       addressed through `/:id` (useParams decodes it), so saving it would
       create another unopenable rule — allocate a fresh numeric id instead. */
    const candidate = String(id);
    const ruleId = candidate !== "new" && isNumericId(candidate) ? candidate : String(Date.now());

    const rule = {
      nickname: (nickname || "").trim() || (url || "").trim(),
      url: (url || "").trim(),
      code: code || "",
      cssCode: cssCode || "",
      jquery: jquery || "none",
      enabled: enabled !== false,
      unlockRightClick: !!unlockRightClick,
      runAt: runAt || "document_start",
      tags: tags || "",
    };

    try {
      await saveRule(ruleId, rule);
      /* 저장이 끝났으면 임시 보관본은 더 이상 필요 없다 */
      clearDraft(draftKey ?? ruleId);
      loadStorage(() => navigate("/"));
    } catch (error) {
      alert(`${t("saveFailed")}\n${error?.message || error}`);
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
