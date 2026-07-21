import { Link } from "react-router-dom";
import DeleteButton from "component/DeleteButton";

function UrlLink({ id, nickname }) {
  return (
    <div className="main-link arrange btn-margin">
      <Link className="list-link btn" to={String(id)}>
        <div className="small">
          <div className="url">
            {nickname.length > 30 ? nickname.slice(0, 25) + "..." : nickname}
          </div>
        </div>
        <div className="big">
          <div className="url">{nickname}</div>
        </div>
      </Link>

      <DeleteButton id={id} />
    </div>
  );
}

export default UrlLink;
