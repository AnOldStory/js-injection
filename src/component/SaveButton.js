/*global chrome */
import React, { Component } from "react";

class SaveButton extends Component {
  constructor(props) {
    super(props);
    this.Save = this.Save.bind(this);
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
              { [encodeURIComponent(storageUrl)]: storageCode },
              function() {
                console.log(storageUrl, storageCode, "Saved!");
              }
            );
          }
        );
      } else {
        chrome.storage.sync.set(
          { [encodeURIComponent(storageUrl)]: storageCode },
          function() {
            console.log(storageUrl, storageCode, "Saved!");
          }
        );
      }
    }
  }

  render() {
    return <button onClick={this.Save}>저장하기</button>;
  }
}

export default SaveButton;
