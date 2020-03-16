/*global chrome*/
import React, { Component } from "react";
import { HashRouter, Route, Switch, Link } from "react-router-dom";

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
    chrome.storage.sync.get(
      null,
      function(storageList) {
        const { ListActions } = this.props;
        ListActions.set(storageList);
      }.bind(this)
    );
  }

  Option() {
    window.open(chrome.runtime.getURL("index.html"));
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
