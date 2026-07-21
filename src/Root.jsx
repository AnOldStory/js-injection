import { Provider } from "react-redux";
import store from "./store";
import Router from "./route/Router";
import "./index.scss";

const Root = () => (
  <Provider store={store}>
    <Router />
  </Provider>
);

export default Root;
