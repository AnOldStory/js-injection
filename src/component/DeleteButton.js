/*global chrome */
import React, { Component } from "react";
import { Link } from "react-router-dom";

class DeleteButton extends Component {
  constructor(props) {
    super(props);
    this.Delete = this.Delete.bind(this);
  }

  Delete() {
    let storageUrl = this.props.url;
    chrome.storage.sync.remove(encodeURIComponent(storageUrl), function() {
      console.log(storageUrl, "Deleted!");
    });
  }

  render() {
    return (
      <Link to="/">
        <button onClick={this.Delete}>삭제하기</button>
      </Link>
    );
  }
}

export default DeleteButton;
