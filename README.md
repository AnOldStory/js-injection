<div align="center">

<img width="140" height="140" src="https://raw.githubusercontent.com/AnOldStory/Js-Injection/master/STOREIMG/%EC%9B%90%EB%B3%B8.png?raw=true" alt="Js-Injection Logo">

# Js-Injection

**JavaScript & CSS Injection Extension + AI MCP Bridge for Chromium Browsers (Chrome, Whale, Edge)**

[![Version](https://img.shields.io/github/v/release/AnOldStory/js-injection?style=for-the-badge&label=version&color=6C63FF)](https://github.com/AnOldStory/js-injection/releases/latest)
[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/mijnijeicfcodlijkmafknapfcilffni?style=for-the-badge&label=live%20on%20store&color=4285F4)](https://chromewebstore.google.com/detail/js-injection/mijnijeicfcodlijkmafknapfcilffni)
[![Manifest](https://img.shields.io/badge/Manifest-V3-4CAF50?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Install-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/js-injection/mijnijeicfcodlijkmafknapfcilffni)
[![Whale Store](https://img.shields.io/badge/Whale_Store-Install-00DE8C?style=for-the-badge&logo=naver&logoColor=white)](https://store.whale.naver.com/detail/aibngojigjlagjankjgbcapehgmolkfa)

<br/>

</div>

---

## ✨ Overview

**Js-Injection** is a powerful Chrome / Naver Whale extension that automatically injects JavaScript and CSS styles into any website. It also acts as an **AI Model Context Protocol (MCP) Bridge**, allowing Claude Desktop, Antigravity, or Cursor AI agents to automate your browser and manage injection rules via AI prompts.

---

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **MCP Protocol Bridge** | Connects to Claude Desktop / IDE AI agents via WebSocket for browser automation |
| 🔘 **Master Switch & Toggles** | One-click global disable/enable + per-rule toggle controls |
| ⚡ **Live CSS Sync** | Real-time 0.1s CSS live reload on active tabs without page refresh |
| 🔓 **Unlock Right Click** | Bypasses contextmenu / copy / selection restrictions automatically or via 1-Click button |
| 🌐 **i18n Multi-Language** | Full Korean (한국어) and English support with instant toggle |
| 📚 **CDN Library Presets** | One-click injection of jQuery (3.x/2.x/1.x), Lodash, Axios, Day.js, Tailwind CSS |
| 🖥️ **Options Dashboard** | Wide 1280px responsive dashboard layout for easy management |
| 🔄 **3-Way Realtime Sync** | Automatic instant sync across Popup, Side Panel, and Options Page |

---

## 🤖 MCP Integration Setup (for AI Agents)

Add `js-injection-mcp` to your `claude_desktop_config.json` or `mcp.json`:

```json
{
  "mcpServers": {
    "js-injection": {
      "command": "npx",
      "args": ["-y", "js-injection-mcp"]
    }
  }
}
```

Or run directly from local repository:
```bash
node /path/to/Js-Injection/mcp-server.js
```

---

## 📜 Version History (변경 이력)

### **v3.3.0**
- AI Model Context Protocol (MCP) WebSocket Bridge 지원 (`js-injection-mcp`)
- 2열 넓은 옵션 대시보드 UI 및 인터랙티브 MCP 연동 가이드

### **v3.2.0**
- 전체 마스터 스위치 (Master On/Off) & 개별 규칙 토글 기능
- 0.1초 반응속도 Live CSS Sync 지원
- 우클릭 / 드래그 / 텍스트 복사 금지 해제 기능 추가 (1회성 해제 버튼 제공)
- 한국어 / 영어 완전 다국어 (i18n) 지원

### **v3.0.0**
- Manifest V2 → V3 마이그레이션 (Service Worker, scripting API)
- React 19 & Vite 6 기반 현대화

### **v2.0.1**
- 백업 기능 오류 해결
- 오탈자 수정

### **v2.0.0**
- UI/UX 디자인 개선
- 백업 (Import/Export) 기능 추가
- jQuery 버전 선택 및 주입 기능 추가
- 중복 도메인 허용
- 기타 오류 수정

---

## 🛠️ Build & Install

```bash
# Install dependencies
npm install

# Build extension
npm run build
```

Load the **`dist/`** folder into Chrome / Whale via `chrome://extensions` (Developer mode).

---

## 🔒 Privacy Policy

Js-Injection strictly values user privacy and does **NOT** collect, track, or transmit any personal data to external servers.  
For full details, please refer to the [PRIVACY_POLICY.md](PRIVACY_POLICY.md) document.


