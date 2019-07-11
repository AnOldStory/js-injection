import React, { Component } from "react";
import { Link } from "react-router-dom";

class UrlLink extends Component {
  render() {
    return (
      <div className="main-link">
        <Link className="list-link" to={this.props.url}>
          {decodeURIComponent(this.props.url)}
        </Link>
      </div>
    );
  }
}

export default UrlLink;
