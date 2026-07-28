import { createSlice } from "@reduxjs/toolkit";
import { detectLang } from "../../i18n";

const initialState = {
  all: {},
  globalEnabled: true,
  lang: detectLang(),
};

const listsSlice = createSlice({
  name: "lists",
  initialState,
  reducers: {
    set(state, action) {
      const { __globalEnabled, __lang, ...rules } = action.payload || {};
      state.all = rules;
      state.globalEnabled = __globalEnabled !== false;
      state.lang = __lang || detectLang();
    },
    setGlobalEnabled(state, action) {
      state.globalEnabled = action.payload;
    },
    setLang(state, action) {
      state.lang = action.payload;
    },
  },
});

export const { set, setGlobalEnabled, setLang } = listsSlice.actions;
export default listsSlice.reducer;
