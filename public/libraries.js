/**
 * Libraries bundled with the extension.
 *
 * Chrome Web Store policy forbids loading remotely hosted code, so the old
 * `https://cdn.../<lib>.js` presets are gone.  These files are injected with
 * `chrome.scripting.executeScript({ files: [...] })` from inside the package.
 */
export const LIBRARY_FILES = Object.freeze({
  jquery3: "vendor/jquery-3.7.1.min.js",
  lodash: "vendor/lodash-4.17.21.min.js",
  axios: "vendor/axios-1.7.9.min.js",
  dayjs: "vendor/dayjs-1.11.13.min.js",
});

export const LIBRARY_IDS = Object.freeze(Object.keys(LIBRARY_FILES));

const LIBRARY_ID_SET = new Set(LIBRARY_IDS);

export function isLibraryId(value) {
  return value === "none" || LIBRARY_ID_SET.has(value);
}

export function getLibraryFile(value) {
  return LIBRARY_FILES[value] || null;
}
