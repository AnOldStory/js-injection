/*global chrome */
import React, { Component } from "react";
import { Link } from "react-router-dom";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus } from "@fortawesome/free-solid-svg-icons";

class DeleteButton extends Component {
  constructor(props) {
    super(props);
    this.Delete = this.Delete.bind(this);
    this.Load = this.Load.bind(this);
  }

  Delete() {
    chrome.storage.sync.remove(this.props.id, () => {
      this.Load();
    });
  }

  Load() {
    chrome.storage.sync.get(
      null,
      function(storageList) {
        const { ListActions } = this.props;
        ListActions.set(storageList);
      }.bind(this)
    );
  }

  render() {
    return (
      <div className="big delete">
        <Link to="/" className="btn delete-inner" onClick={this.Delete}>
          <FontAwesomeIcon icon={faMinus} size="lg" /> 삭제하기
        </Link>
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
)(DeleteButton);
