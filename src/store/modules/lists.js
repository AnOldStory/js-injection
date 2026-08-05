import { createSlice, current } from "@reduxjs/toolkit";
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
      /*
       * storage 를 읽을 때마다 새 객체가 나오므로 내용이 같아도 참조가 바뀐다.
       * 그대로 넣으면 이걸 구독하는 화면이 끝없이 다시 그려지므로(=편집 중이던
       * 입력이 계속 되돌아간다) 내용이 실제로 달라졌을 때만 교체한다.
       */
      if (JSON.stringify(current(state).all) !== JSON.stringify(rules)) {
        state.all = rules;
      }
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
