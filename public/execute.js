/**
 * Execute user JavaScript inside a page.
 *
 * `chrome.userScripts.execute()` (Chrome 135+) compiles the string in the
 * browser and is not subject to the page's `unsafe-eval` CSP.  The fallback
 * uses `eval` inside the MAIN world, which works on most pages but is blocked
 * by any page whose CSP omits `'unsafe-eval'` — we surface that error instead
 * of silently swallowing it.
 */

function messageOf(error) {
  /* Chrome errors are short; a user's own `throw new Error(<huge>)` is not.
     Cap it so alerts, audit entries and MCP responses stay bounded. */
  return String(error?.message || error || "unknown error").slice(0, 2000);
}

/**
 * Only treat *API-level* failures as "userScripts is unusable".
 *
 * Matching on generic words such as "undefined" would misread a runtime error
 * thrown by the user's own code as a missing API, and then run that code a
 * second time through the eval fallback.  These messages are the ones Chrome
 * emits when the API is missing, the permission is absent, or the user has not
 * enabled "Allow User Scripts".
 */
function userScriptsUnavailable(error) {
  /*
   * Match only messages that can originate from Chrome's API gate.  Generic
   * words ("permission", "not allowed", "not available") also appear in errors
   * thrown by the user's own code; treating those as an unavailable API would
   * execute that code a second time through the eval fallback.
   */
  return /user\s?scripts|user scripts|developer mode|allow user scripts/i.test(messageOf(error));
}

export function isMissingUserScriptsApi(error) {
  return userScriptsUnavailable(error);
}

/**
 * @param {object} options
 * @param {number} options.tabId
 * @param {number[]} [options.frameIds]
 * @param {boolean} [options.allFrames]
 * @param {string} options.code
 * @param {boolean} [options.injectImmediately]
 * @returns {Promise<{ok: boolean, via?: string, error?: string, results?: unknown[]}>}
 */
export async function executeUserCode({
  tabId,
  frameIds,
  allFrames = false,
  code,
  injectImmediately = false,
}) {
  if (!code || typeof code !== "string") return { ok: true, via: "empty" };

  const target = { tabId };
  if (Array.isArray(frameIds) && frameIds.length) {
    target.frameIds = frameIds;
  } else if (allFrames) {
    target.allFrames = true;
  }

  if (chrome.userScripts?.execute) {
    try {
      const results = await chrome.userScripts.execute({
        target,
        js: [{ code }],
        world: "MAIN",
        injectImmediately: !!injectImmediately,
      });
      return { ok: true, via: "userScripts", results };
    } catch (error) {
      /* A syntax/runtime error in the user's code is a real failure.  Only
         fall back when the API itself is unavailable (permission / toggle). */
      if (!userScriptsUnavailable(error)) {
        return { ok: false, error: messageOf(error) };
      }
    }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target,
      world: "MAIN",
      injectImmediately: !!injectImmediately,
      func: (source) => {
        return eval(source);
      },
      args: [code],
    });
    return { ok: true, via: "eval", results };
  } catch (error) {
    const message = messageOf(error);
    if (/unsafe-eval|Content Security Policy|EvalError/i.test(message)) {
      return {
        ok: false,
        error:
          "이 페이지의 CSP가 eval 실행을 막습니다. chrome://extensions에서 이 확장의 '사용자 스크립트 허용'을 켜 주세요. " +
          "(This page's CSP blocks eval; enable 'Allow user scripts' for the extension.)",
      };
    }
    return { ok: false, error: message };
  }
}
