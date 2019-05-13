import React, { Component } from "react";
import { Link } from "react-router-dom";

class UrlLink extends Component {
  render() {
    return (
      <Link className="main-link" to={this.props.url}>
        <div className="main-link-span">
          {this.props.url === "new"
            ? "new"
            : decodeURIComponent(this.props.url)}
        </div>
      </Link>
    );
  }
}

export default UrlLink;
