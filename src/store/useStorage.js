import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { set } from "store/modules/lists";
import { i18n } from "../i18n";

/**
 * useStorage — chrome.storage.sync 읽기를 Redux에 동기화하고 i18n 번역 헬퍼 함수 제공
 */
export function useStorage() {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.lists.lang);
  const globalEnabled = useSelector((state) => state.lists.globalEnabled);

  const loadStorage = useCallback((callback) => {
    chrome.storage.sync.get(null, (items) => {
      const { version: _, ...rest } = items || {};
      dispatch(set(rest));
      callback?.();
    });
  }, [dispatch]);

  const t = useCallback(
    (key) => {
      return i18n[lang]?.[key] || i18n.ko[key] || key;
    },
    [lang]
  );

  return { loadStorage, t, lang, globalEnabled };
}
