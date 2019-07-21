/*global chrome */
import React, { Component } from "react";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

class SaveButton extends Component {
  constructor(props) {
    super(props);
    this.Save = this.Save.bind(this);
    this.Load = this.Load.bind(this);
    this.state = {
      err: ""
    };
  }

  Save() {
    let storageUrl = this.props.url;
    let storageCode = this.props.value;
    this.props.ChangefirstUrl();
    if (storageUrl !== "new") {
      if (this.props.isUrlChange) {
        chrome.storage.sync.remove(
          encodeURIComponent(this.props.firstUrl),
          function() {
            console.log(storageUrl, "Deleted!");
            chrome.storage.sync.set(
              { [encodeURIComponent(storageUrl)]: [storageCode, 1] },
              function() {
                this.Load();
                console.log(storageUrl, storageCode, "Saved!");
              }.bind(this)
            );
          }.bind(this)
        );
        this.setState({
          err: "수정 완료!"
        });
      } else {
        chrome.storage.sync.set(
          { [encodeURIComponent(storageUrl)]: [storageCode, 1] },
          function() {
            this.Load();
            console.log(storageUrl, storageCode, "Saved!");
            this.props.history.push("/");
          }.bind(this)
        );
        this.setState({
          err: "저장 완료!"
        });
      }
    }
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
      <>
        <div className="btn" onClick={this.Save}>
          저장하기
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
