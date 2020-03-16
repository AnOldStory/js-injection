/*global chrome*/
import React, { Component, version } from "react";
import { HashRouter, Route, Switch, Link } from "react-router-dom";

import Config from "_variables";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

import MainContainer from "container/main/MainContainer";
import EditorContainer from "container/editor/EditorContainer";

class Router extends Component {
  constructor(props) {
    super(props);
    this.Load = this.Load.bind(this);
    this.Option = this.Option.bind(this);
  }

  componentDidMount() {
    this.Load();
  }

  Load() {
    chrome.storage.sync.get("version", result => {
      if (result.version !== Config.version) {
        this.updateDB();
      } else {
        chrome.storage.sync.get(null, storageList => {
          const { ListActions } = this.props;
          delete storageList.version;
          ListActions.set(storageList);
        });
      }
    });
  }

  updateDB() {
    chrome.storage.sync.get(null, storageList => {
      chrome.storage.sync.clear(() => {
        chrome.storage.sync.set({ version: Config.version }, () => {
          /* v1 업데이트 호환 */
          Object.entries(storageList).forEach(([id, value], i) => {
            if (id !== "version")
              this.Save(
                i,
                decodeURIComponent(id),
                decodeURIComponent(id),
                value[0],
                false
              );
          });
          this.Load();
        });
      });
    });
  }

  Option() {
    window.open(chrome.runtime.getURL("index.html"));
  }

  Save(id, nickname, url, code, jquery) {
    chrome.storage.sync.set({
      [id]: {
        nickname: nickname,
        url: url,
        code: code,
        jquery: jquery
      }
    });
  }

  render() {
    return (
      <HashRouter basename="/">
        <>
          <Link to="/">
            <div className="top arrange">
              <div className="title">JS-Injection</div>

              <div className="small">
                <div className="setting" onClick={this.Option}>
                  <FontAwesomeIcon icon={faCog} /> 설정
                </div>
              </div>
            </div>
          </Link>
          <Switch>
            <Route exact path="/" component={MainContainer} />
          </Switch>
          <Route path="/:id" component={EditorContainer} />
        </>
      </HashRouter>
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
)(Router);
