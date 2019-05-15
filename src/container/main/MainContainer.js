/*global chrome*/
import React, { Component } from "react";
import { Link } from "react-router-dom";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

import UrlLink from "component/UrlLink";

import "./MainContainer.scss";

class MainContainer extends Component {
  constructor(props) {
    super(props);
    this.Clear = this.Clear.bind(this);
    this.Option = this.Option.bind(this);
  }

  Clear() {
    chrome.storage.sync.clear(() => {
      console.log("Clear StorageList!");
      this.Load();
    });
  }

  Load() {
    chrome.storage.sync.get(
      null,
      function(storageList) {
        console.log("Loding StorageList!");
        const { ListActions } = this.props;
        ListActions.set(storageList);
      }.bind(this)
    );
  }

  Option() {
    window.open(chrome.runtime.getURL("index.html"));
  }

  render() {
    return (
      <div className="main">
        <div className="top">
          <Link to="new">new</Link>
        </div>
        <div className="bottom">
          {Object.keys(this.props.storageList).map((url, i) => (
            <UrlLink url={url} key={i} />
          ))}
        </div>
        <button onClick={this.Clear}>초기화</button>
        <button onClick={this.Option}>새탭으로보기</button>
      </div>
    );
  }
}

export default connect(
  value => ({
    storageList: value.lists.get("all")
  }),
  dispatch => ({
    ListActions: bindActionCreators(listActions, dispatch)
  })
)(MainContainer);
