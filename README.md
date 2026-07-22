<div align="center">

<img width="140" height="140" src="https://raw.githubusercontent.com/AnOldStory/Js-Injection/master/STOREIMG/%EC%9B%90%EB%B3%B8.png?raw=true" alt="Js-Injection Logo">

# Js-Injection v3.3.0

**JavaScript & CSS Injection Extension + AI MCP Bridge for Chromium Browsers (Chrome, Whale, Edge)**

[![Version](https://img.shields.io/badge/version-v3.3.0-6C63FF?style=for-the-badge)](https://github.com/AnOldStory/Js-Injection/releases)
[![Manifest](https://img.shields.io/badge/Manifest-V3-4CAF50?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)

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

## 🛠️ Build & Install

```bash
# Install dependencies
npm install

# Build extension
npm run build
```

Load the **`dist/`** folder into Chrome / Whale via `chrome://extensions` (Developer mode).
