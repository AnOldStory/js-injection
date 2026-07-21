import { combineReducers } from "@reduxjs/toolkit";
import lists from "./lists";

/* combineReducers 유지 — state shape: { lists: { all: {} } }
 * 향후 reducer 추가에 대비하고, 기존 useSelector 호환성 보장 */
export default combineReducers({ lists });
