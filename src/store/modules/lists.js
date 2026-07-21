import { createSlice } from "@reduxjs/toolkit";

const listsSlice = createSlice({
  name: "lists",
  initialState: { all: {} },
  reducers: {
    set(state, action) {
      state.all = action.payload;
    }
  }
});

export const { set } = listsSlice.actions;
export default listsSlice.reducer;
