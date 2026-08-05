/**
 * 팝업은 포커스를 잃는 순간 통째로 파괴된다(=편집 중이던 내용이 날아간다).
 * 편집 중인 폼과 마지막으로 보던 화면을 chrome.storage.local 에 임시로 남겨 두었다가
 * 팝업이 다시 열릴 때 그대로 복원한다.
 *
 * sync 가 아니라 local 을 쓰는 이유: sync 는 항목당 8KB / 전체 100KB 제한이라
 * 편집 중인 코드 초안을 담으면 실제 규칙 저장이 막힐 수 있다.
 */

const DRAFT_PREFIX = "__draft_";
const ROUTE_KEY = "__lastRoute";
/* 오래된 화면까지 되살리면 오히려 혼란스러워서 1시간까지만 이어서 복원한다 */
const ROUTE_TTL = 60 * 60 * 1000;

let tabPage = false;

/** 옵션 페이지(탭)인지 팝업/사이드패널인지 — 탭에서는 chrome.tabs.getCurrent 가 탭을 돌려준다 */
export function detectTabPage(callback) {
  if (!chrome.tabs?.getCurrent) {
    callback(false);
    return;
  }
  try {
    chrome.tabs.getCurrent((tab) => {
      void chrome.runtime.lastError;
      callback(!!tab);
    });
  } catch {
    callback(false);
  }
}

export function setTabPage(value) {
  tabPage = value;
}

export function isPopup() {
  return !tabPage;
}

const draftKey = (id) => `${DRAFT_PREFIX}${id}`;

export function loadDraft(id, callback) {
  const key = draftKey(id);
  chrome.storage.local.get(key, (items) => {
    void chrome.runtime.lastError;
    callback(items?.[key] || null);
  });
}

export function saveDraft(id, data) {
  chrome.storage.local.set({ [draftKey(id)]: data });
}

export function clearDraft(id, callback) {
  chrome.storage.local.remove(draftKey(id), () => {
    void chrome.runtime.lastError;
    callback?.();
  });
}

export function clearAllDrafts(callback) {
  chrome.storage.local.get(null, (items) => {
    const keys = Object.keys(items || {}).filter((k) => k.startsWith(DRAFT_PREFIX));
    if (!keys.length) {
      callback?.();
      return;
    }
    chrome.storage.local.remove(keys, () => {
      void chrome.runtime.lastError;
      callback?.();
    });
  });
}

export function saveRoute(path) {
  chrome.storage.local.set({ [ROUTE_KEY]: { path, at: Date.now() } });
}

export function loadRoute(callback) {
  chrome.storage.local.get(ROUTE_KEY, (items) => {
    void chrome.runtime.lastError;
    const saved = items?.[ROUTE_KEY];
    callback(saved?.path && Date.now() - saved.at < ROUTE_TTL ? saved.path : null);
  });
}
