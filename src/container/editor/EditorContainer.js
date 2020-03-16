/*global chrome*/
import React, { Component } from "react";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

import AceEditor from "react-ace";

import SaveButton from "component/SaveButton";
import "brace/mode/javascript";
import "brace/theme/monokai";

import "./EditorContainer.scss";

class EditorContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      id: this.props.match.params.id,
      nickname: "",
      url: "",
      code: "",
      jquery: false
    };
    this.onChange = this.onChange.bind(this);
    this.onCodeChange = this.onCodeChange.bind(this);
    this.onCheckChange = this.onCheckChange.bind(this);
    this.LoadList = this.LoadList.bind(this);
  }

  componentDidMount() {
    if (this.props.match.params.id !== "new") {
      this.LoadList();
    } else {
      let maxnum = 0;
      Object.keys(this.props.storageList).forEach(i => {
        if (maxnum < Number(i)) maxnum = Number(i);
      });
      this.setState({
        id: maxnum + 1
      });
    }
  }

  onChange(e) {
    this.setState({
      [e.target.name]: e.target.value
    });
  }

  onCodeChange(value) {
    this.setState({
      code: value
    });
  }

  onCheckChange(e) {
    this.setState({
      [e.target.name]: e.target.checked
    });
  }

  LoadList() {
    chrome.storage.sync.get(null, storageList => {
      const { ListActions } = this.props;
      delete storageList.version;
      ListActions.set(storageList);
      this.setState({
        id: this.state.id,
        ...storageList[this.state.id]
      });
    });
  }

  render() {
    return (
      <div className="editor">
        <div className="nickname">
          <div className="block-name">규칙 이름</div>
          <input
            type="text"
            onChange={this.onChange}
            placeholder="example 사이트 스크립트"
            value={this.state.nickname}
            name="nickname"
            className="block"
          />
        </div>

        <div className="url">
          <div className="block-name">적용할 도메인</div>
          <input
            type="text"
            onChange={this.onChange}
            placeholder="https://*.example.com/"
            value={this.state.url}
            name="url"
            className="block"
          />
        </div>
        <div className="option">
          <div className="block-name">추가 옵션</div>
          <label className="options">
            Latest Jquery 자동 추가:
            <input
              type="checkbox"
              checked={this.state.jquery}
              onChange={this.onCheckChange}
              name="jquery"
            />{" "}
            (이미 존재하는 사이트의 Jquery와 충돌할 수 있습니다.)
          </label>
        </div>
        <div className="block-name"> 코드 </div>
        <AceEditor
          mode="javascript"
          theme="monokai"
          height="350px"
          width="99%"
          onChange={this.onCodeChange}
          setOptions={{
            tabSize: 2
          }}
          value={this.state.code}
          editorProps={{ $blockScrolling: true }}
        />

        <SaveButton
          {...this.state}
          match={this.props.match}
          history={this.props.history}
        />
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
)(EditorContainer);
