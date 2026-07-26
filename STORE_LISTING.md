# Chrome Web Store — Listing Fields (copy-paste ready)

Paste each block into the matching field at
**https://chrome.google.com/webstore/devconsole** → your item → *Store listing* / *Privacy practices*.
Every justification below matches the actual `manifest.json`.

---

## Store listing

**Item name**
```
Js-Injection
```

**Summary** (short description, max 132 chars)
```
Inject your own JavaScript & CSS into any site, plus a local AI (MCP) bridge to automate the browser. Chrome & Whale.
```

**Category**
```
Developer Tools
```

**Language**
```
English (primary) — Korean also supported in-app
```

**Detailed description**
```
Js-Injection lets you run your own JavaScript and CSS on any website — automatically, every time you visit it.

■ WHAT IT DOES
• Inject custom JavaScript and CSS per-domain, applied on page load
• Master switch + per-rule toggles to turn things on/off instantly
• Live CSS Sync — 0.1s real-time reload without refreshing the page
• Unlock right-click / copy / text-selection restrictions (automatic or one-click)
• One-click CDN presets: jQuery (3/2/1), Lodash, Axios, Day.js, Tailwind CSS
• Import / export backups of all your rules
• Wide, responsive options dashboard
• Full Korean & English UI with instant switching

■ AI MCP BRIDGE (optional)
Js-Injection can act as a Model Context Protocol (MCP) bridge, letting a local AI agent
(Claude Desktop, Cursor, Antigravity) manage your injection rules and automate the browser.
The bridge connects ONLY to a WebSocket server on your own machine (ws://localhost:3000).
Nothing is sent to any remote server. If you never start the local MCP server, no connection is made.

■ PRIVACY
Js-Injection does NOT collect, track, or transmit any personal data. All your rules and code
are stored locally in your browser (chrome.storage). See the full policy:
https://github.com/AnOldStory/js-injection/blob/master/PRIVACY_POLICY.md

■ WHY THE PERMISSIONS
• "Access to all sites" is required because YOU choose which sites to inject your scripts into.
• The localhost permissions power only the optional local AI (MCP) bridge.
Js-Injection never reads or transmits your browsing history or page content.

Open source: https://github.com/AnOldStory/js-injection
```

**Homepage URL**
```
https://github.com/AnOldStory/js-injection
```

**Support URL**
```
https://github.com/AnOldStory/js-injection/issues
```

**Graphic assets** (upload from `STOREIMG/store/`)
- Screenshots (1280×800): `screenshot-1-hero`, `screenshot-2-features`, `screenshot-3-mcp`, `screenshot-4-editor`
- Small promo tile (440×280): `small-promo-440x280.png`
- Marquee promo tile (1400×560): `marquee-1400x560.png`
- Store icon (128×128): `public/icon128.png`

---

## Privacy practices tab

**Single purpose** (required)
```
Js-Injection lets the user inject their own JavaScript and CSS into websites they choose, and
optionally exposes a local Model Context Protocol (MCP) bridge so a local AI agent can manage
those injection rules.
```

**Permission justifications** (one per requested permission)

`storage`
```
Stores the user's own injection rules, custom code, and preferences locally in the browser.
No data is sent anywhere.
```

`scripting`
```
Injects the user's custom JavaScript and CSS into the pages they have configured a rule for.
This is the core function of the extension.
```

`tabs`
```
Reads only the URL of the currently active tab so the rule editor can pre-fill the current
site and apply the matching rule. Not used to build browsing history.
```

`offscreen`
```
Runs a minimal offscreen document that maintains the optional local MCP WebSocket connection.
It handles no personal data.
```

**Host permission** `<all_urls>`
```
The user may configure the extension to inject their own scripts/CSS into any website of their
choosing, so access to all sites is required. The extension does not read or transmit page
content — it only applies the user's own rules.
```

**Host permissions** `ws://localhost/*`, `http://localhost/*`
```
Used solely for the optional local AI (MCP) bridge, which connects to a WebSocket server on the
user's own machine (loopback). These addresses never reach the public internet.
```

**Remote code**
```
No. The extension executes no remotely-hosted code. The only code it runs is what the user
types into the extension themselves, stored locally. CDN library presets insert well-known
public library <script> tags into the page at the user's explicit request.
```

**Data usage disclosures** (check these on the form)
- Personally identifiable information: **No**
- Health / financial / authentication / personal communications / location / web history / user activity: **No**
- "I do not sell or transfer user data to third parties": **checked**
- "I do not use or transfer user data for purposes unrelated to my item's single purpose": **checked**
- "I do not use or transfer user data to determine creditworthiness or for lending": **checked**

---

## Whale Store (store.whale.naver.com)

Whale's console reuses the same package (Manifest V3) and assets. Paste the Korean summary/description
below; screenshots and icon are the same files as above.

**요약**
```
내가 만든 JavaScript·CSS를 원하는 모든 사이트에 자동 주입 + 로컬 AI(MCP) 브라우저 자동화. Chrome·Whale 지원.
```

**상세 설명**
```
Js-Injection은 내가 작성한 JavaScript와 CSS를 원하는 웹사이트에 방문할 때마다 자동으로 실행해 줍니다.

■ 주요 기능
• 도메인별 커스텀 JS/CSS 주입 (페이지 로드 시 자동 적용)
• 전체 마스터 스위치 + 규칙별 개별 토글
• Live CSS Sync — 새로고침 없이 0.1초 실시간 반영
• 우클릭 / 복사 / 텍스트 선택 금지 해제 (자동 또는 1클릭)
• CDN 프리셋 원클릭: jQuery(3/2/1), Lodash, Axios, Day.js, Tailwind
• 규칙 백업 가져오기/내보내기
• 넓은 반응형 옵션 대시보드
• 한국어·영어 완전 지원 (즉시 전환)

■ AI MCP 브리지 (선택)
로컬 AI 에이전트(Claude Desktop, Cursor, Antigravity)가 주입 규칙을 관리하고 브라우저를 자동화할 수 있습니다.
브리지는 오직 내 컴퓨터의 WebSocket 서버(ws://localhost:3000)에만 연결하며, 외부 서버로 전송되는 데이터는 없습니다.

■ 개인정보
어떤 개인정보도 수집·추적·전송하지 않습니다. 모든 규칙과 코드는 브라우저 로컬(chrome.storage)에만 저장됩니다.
전체 방침: https://github.com/AnOldStory/js-injection/blob/master/PRIVACY_POLICY.md
```
