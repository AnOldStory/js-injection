/*global chrome */
import React, { Component } from "react";

class SaveButton extends Component {
  constructor(props) {
    super(props);
    this.Save = this.Save.bind(this);
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
                console.log(storageUrl, storageCode, "Saved!");
              }
            );
          }
        );
        this.setState({
          err: "수정 완료!"
        });
      } else {
        chrome.storage.sync.set(
          { [encodeURIComponent(storageUrl)]: [storageCode, 1] },
          function() {
            console.log(storageUrl, storageCode, "Saved!");
          }
        );
        this.setState({
          err: "저장 완료!"
        });
      }
    }
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

export default SaveButton;
