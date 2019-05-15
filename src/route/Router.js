/*global chrome*/
import React, { Component } from "react";
import { HashRouter, Route, Switch, Link } from "react-router-dom";

import { connect } from "react-redux";
import * as listActions from "store/modules/lists";
import { bindActionCreators } from "redux";

import MainContainer from "container/main/MainContainer";
import EditorContainer from "container/editor/EditorContainer";

class Router extends Component {
  constructor(props) {
    super(props);
    this.Load = this.Load.bind(this);
  }

  componentDidMount() {
    this.Load();
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
      <HashRouter basename="/">
        <>
          <Switch>
            <Route
              exact
              path="/"
              component={() => (
                <MainContainer storageList={this.props.storageList} />
              )}
            />
            <Route
              component={() => (
                <Link to="/" onClick={this.Load}>
                  메인으로 돌아가기
                </Link>
              )}
            />
          </Switch>
          <Route path="/:url" component={EditorContainer} />
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
