import { useDispatch } from "react-redux";
import { set } from "store/modules/lists";

/**
 * useStorage — chrome.storage.sync 읽기를 Redux에 동기화하는 커스텀 훅.
 * SaveButton, DeleteButton, MainContainer, Router 등 여러 곳에서 공유.
 */
export function useStorage() {
  const dispatch = useDispatch();

  const loadStorage = (callback) => {
    chrome.storage.sync.get(null, (items) => {
      const { version: _, ...rest } = items;
      dispatch(set(rest));
      callback?.();
    });
  };

  return { loadStorage };
}
