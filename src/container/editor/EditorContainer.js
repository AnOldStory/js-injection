import React, { Component } from "react";
import { connect } from "react-redux";

import AceEditor from "react-ace";

import SaveButton from "component/SaveButton";
import DeleteButton from "component/DeleteButton";

import "brace/mode/javascript";
import "brace/theme/monokai";

import "./EditorContainer.scss";

class EditorContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      firstUrl: decodeURIComponent(this.props.match.params.url),
      url: "",
      code: "",
      isUrlChange: 0
    };
    this.onChange = this.onChange.bind(this);
    this.onCodeChange = this.onCodeChange.bind(this);
    this.LoadList = this.LoadList.bind(this);
    this.ChangefirstUrl = this.ChangefirstUrl.bind(this);
  }

  componentDidMount() {
    if (this.props.match.params.url !== "new") {
      this.LoadList();
    }
  }

  onChange(e) {
    this.setState({
      isUrlChange: 1,
      url: e.target.value
    });
  }

  onCodeChange(value) {
    this.setState({
      code: value
    });
  }

  ChangefirstUrl() {
    this.setState({
      firstUrl: decodeURIComponent(this.state.url)
    });
  }

  LoadList() {
    this.setState({
      url: this.state.firstUrl,
      code: this.props.storageList[encodeURIComponent(this.state.firstUrl)][0]
    });
  }

  render() {
    return (
      <div className="editor">
        <input
          type="text"
          onChange={this.onChange}
          placeholder="https://*.example.com/"
          value={this.state.url}
        />
        <AceEditor
          mode="javascript"
          theme="monokai"
          onChange={this.onCodeChange}
          setOptions={{
            tabSize: 2
          }}
          value={this.state.code}
          editorProps={{ $blockScrolling: true }}
        />
        <SaveButton
          url={this.state.url}
          value={this.state.code}
          isUrlChange={this.state.isUrlChange}
          firstUrl={this.state.firstUrl}
          ChangefirstUrl={this.ChangefirstUrl}
        />
        {this.props.match.params.url === "new" ? (
          ""
        ) : (
          <DeleteButton url={this.state.url} load={this.props.load} />
        )}
      </div>
    );
  }
}

export default connect(value => ({
  storageList: value.lists.get("all")
}))(EditorContainer);
