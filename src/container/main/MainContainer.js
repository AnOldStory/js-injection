import React, { Component } from "react";

import UrlLink from "component/UrlLink";

import "./MainContainer.scss";

class MainContainer extends Component {
  render() {
    return (
      <div className="main">
        <UrlLink url="new" />
        {Object.keys(this.props.storageList).map((url, i) => (
          <UrlLink url={url} key={i} />
        ))}
      </div>
    );
  }
}

export default MainContainer;
