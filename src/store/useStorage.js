import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { set } from "store/modules/lists";
import { i18n } from "../i18n";

/**
 * useStorage — chrome.storage.local 읽기를 Redux에 동기화하고 i18n 번역 헬퍼 함수 제공
 *
 * 규칙은 sync 가 아니라 local 에 저장한다 (항목당 8KB / 전체 100KB 제한 회피,
 * Google 계정으로 코드가 동기화되지 않음).
 */
export function useStorage() {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.lists.lang);
  const globalEnabled = useSelector((state) => state.lists.globalEnabled);

  const loadStorage = useCallback(
    (callback) => {
      chrome.storage.local.get(null, (items) => {
        void chrome.runtime.lastError;
        /* 초안/버전 문자열은 화면 상태가 아니므로 Redux 로 복사하지 않는다
           (초안은 코드 전문이라 수 MB 가 될 수 있다). */
        const payload = {};
        for (const [key, value] of Object.entries(items || {})) {
          if (key === "version" || key.startsWith("__draft_")) continue;
          payload[key] = value;
        }
        dispatch(set(payload));
        callback?.();
      });
    },
    [dispatch]
  );

  const t = useCallback(
    (key) => {
      return i18n[lang]?.[key] || i18n.ko[key] || key;
    },
    [lang]
  );

  return { loadStorage, t, lang, globalEnabled };
}
