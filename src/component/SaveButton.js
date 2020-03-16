/*global chrome */
import React, { Component } from "react";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";

class SaveButton extends Component {
  constructor(props) {
    super(props);
    this.Sync = this.Sync.bind(this);
    this.Save = this.Save.bind(this);
    this.Load = this.Load.bind(this);
    this.state = {
      err: ""
    };
  }

  Sync() {
    let { id, nickname, url, code, jquery } = this.props;
    if (!url) {
      url = "https://*.example.com/";
    }
    if (!nickname) {
      nickname = url;
    }
    if (this.props.match.params.id !== "new") {
      chrome.storage.sync.remove(id, () => {
        this.Save(id, nickname, url, code, jquery);
      });
    } else {
      this.Save(id, nickname, url, code, jquery);
    }
  }

  Save(id, nickname, url, code, jquery) {
    chrome.storage.sync.set(
      {
        [id]: {
          nickname: nickname,
          url: url,
          code: code,
          jquery: jquery
        }
      },
      () => {
        this.Load();
      }
    );
  }

  Load() {
    chrome.storage.sync.get(null, storageList => {
      const { ListActions } = this.props;
      delete storageList.version;
      ListActions.set(storageList);
      this.props.history.push("/");
    });
  }

  render() {
    return (
      <>
        <div className="big-btn">
          <div className="btn" onClick={this.Sync}>
            <FontAwesomeIcon icon={faSave} size="lg" /> 저장하기
          </div>
        </div>
        {this.state.err}
      </>
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
)(SaveButton);
