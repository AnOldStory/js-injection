import React, { Component } from "react";
import { Link } from "react-router-dom";

import DeleteButton from "component/DeleteButton";

class UrlLink extends Component {
  render() {
    return (
      <div className="main-link arrange btn-margin">
        <Link className="list-link btn" to={this.props.id}>
          <div className="small">
            <div className="url">
              {this.props.nickname.length > 30
                ? this.props.nickname.substr(0, 25) + "..."
                : this.props.nickname}
            </div>
          </div>
          <div className="big">
            <div className="url">{this.props.nickname}</div>
          </div>
        </Link>

        <DeleteButton id={this.props.id} />
      </div>
    );
  }
}

export default UrlLink;
