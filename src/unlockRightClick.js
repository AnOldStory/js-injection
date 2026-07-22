/* Helper script to unlock right-click, text selection, and copy protection */
export const UNLOCK_RIGHT_CLICK_SCRIPT = `
(function() {
  const events = ['contextmenu', 'copy', 'cut', 'paste', 'mousedown', 'mouseup', 'selectstart', 'keydown'];
  events.forEach(function(event) {
    document.addEventListener(event, function(e) {
      e.stopPropagation();
    }, true);
  });

  const style = document.createElement('style');
  style.id = 'js-injection-unlock-style';
  style.textContent = '* { -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; user-select: text !important; }';
  (document.head || document.documentElement).appendChild(style);

  // Override inline handlers
  const allElements = document.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    el.oncontextmenu = null;
    el.onselectstart = null;
    el.ondragstart = null;
    el.oncopy = null;
    el.oncut = null;
  }
})();
`;
