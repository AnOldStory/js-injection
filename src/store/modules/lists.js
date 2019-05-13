import { createAction, handleActions } from "redux-actions";
import { Map } from "immutable";

const SET = "lists/SET";

export const set = createAction(SET, value => value);

const initialState = Map({
  all: {}
});

export default handleActions(
  {
    [SET]: (state, action) => {
      return state.set("all", action.payload);
    }
  },
  initialState
);
