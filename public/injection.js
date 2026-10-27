/*
 * Content script (all frames, document_start).
 *
 * Phase 1 asks the service worker which rules match *this frame's* URL.  The
 * worker injects libraries/CSS and replies with rule ids grouped by their
 * configured runAt phase.  Phase 2 reports DOM readiness so the worker can run
 * only those ids, only in this frame.
 */

(() => {
  let requested = false;

  function send(message, callback) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        void chrome.runtime.lastError;
        callback?.(response);
      });
    } catch {
      /* Extension was reloaded/removed while the page was open. */
    }
  }

  function runRules(ruleIds) {
    if (!Array.isArray(ruleIds) || ruleIds.length === 0) return;
    send({ state: "runRules", ruleIds });
  }

  function start(groups) {
    if (!groups || typeof groups !== "object") return;

    /* document_start rules run as soon as the worker has prepared libraries. */
    runRules(groups.start);

    const runEnd = () => runRules(groups.end);
    const runIdle = () => runRules(groups.idle);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runEnd, { once: true });
      window.addEventListener("load", runIdle, { once: true });
    } else if (document.readyState === "interactive") {
      runEnd();
      window.addEventListener("load", runIdle, { once: true });
    } else {
      /* Late-injected content script (extension reload, bfcache restore). */
      runEnd();
      runIdle();
    }
  }

  if (requested) return;
  requested = true;

  send({ state: "beforeLoad" }, start);
})();
