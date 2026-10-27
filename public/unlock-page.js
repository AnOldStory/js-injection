/* Injected into the page's MAIN world to undo copy/selection restrictions.
 *
 * It intentionally does NOT stop `keydown`/`mousedown`/`mouseup`/`paste`
 * propagation: doing that at document-capture level breaks keyboard
 * shortcuts, custom dropdowns and paste handling on almost every modern site.
 * We only clear the page's own inline handlers and block the three events that
 * implement right-click / selection / drag protection.
 */
(() => {
  if (window.__jsInjectionUnlocked) return;
  window.__jsInjectionUnlocked = true;

  const INLINE_PROPS = ["oncontextmenu", "onselectstart", "ondragstart", "oncopy", "oncut"];

  const clearHandlers = (el) => {
    if (!el || el.nodeType !== 1) return;
    for (const prop of INLINE_PROPS) {
      try {
        if (el[prop]) el[prop] = null;
      } catch {
        /* Some host objects throw on property writes. */
      }
    }
  };

  const clearTree = (root) => {
    clearHandlers(root);
    if (!root?.querySelectorAll) return;
    root.querySelectorAll("*").forEach(clearHandlers);
  };

  const style = document.createElement("style");
  style.id = "js-injection-unlock-style";
  style.textContent =
    "*, *::before, *::after { -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; user-select: text !important; }";
  (document.head || document.documentElement)?.appendChild(style);

  clearTree(document.documentElement || document);

  try {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(clearTree);
      }
    });
    observer.observe(document.documentElement || document, {
      childList: true,
      subtree: true,
    });
  } catch {
    /* MutationObserver is best-effort; the page is still unlocked. */
  }

  /* Capture-phase stopPropagation keeps the page's own "no right click" UI
     from appearing while leaving the native menu/selection/drag intact. */
  for (const type of ["contextmenu", "selectstart", "dragstart"]) {
    document.addEventListener(type, (event) => event.stopPropagation(), true);
  }
})();
