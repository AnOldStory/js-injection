/*global chrome */
import React, { Component } from "react";
import { Link } from "react-router-dom";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

class DeleteButton extends Component {
  constructor(props) {
    super(props);
    this.Delete = this.Delete.bind(this);
    this.Load = this.Load.bind(this);
  }

  Delete() {
    let storageUrl = this.props.url;
    chrome.storage.sync.remove(encodeURIComponent(storageUrl), () => {
      console.log(storageUrl, "Deleted!");
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

  render() {
    return (
      <Link to="/">
        <button onClick={this.Delete}>삭제하기</button>
      </Link>
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
)(DeleteButton);
