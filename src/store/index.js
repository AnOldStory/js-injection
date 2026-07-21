import { configureStore } from "@reduxjs/toolkit";
import reducer from "./modules";

const store = configureStore({ reducer });

export default store;
