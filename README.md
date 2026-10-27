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

> Requires Chrome/Whale 120 or newer. Rules are stored in `chrome.storage.local` on this device only — they are never uploaded to a Google account or any server.

---

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **MCP Protocol Bridge** | Loopback-only WebSocket bridge with a pairing token; write/run-script access is off until you allow it |
| 🔘 **Master Switch & Toggles** | One-click global disable/enable + per-rule toggle controls |
| ⚡ **Live CSS Sync** | Debounced CSS preview on the active tab, only when the rule's URL pattern matches |
| 🔓 **Unlock Right Click** | Removes context-menu / selection / drag blocking without breaking typing or paste |
| 🌐 **i18n Multi-Language** | Full Korean (한국어) and English support with instant toggle |
| 📚 **Bundled Library Presets** | jQuery 3.7, Lodash, Axios and Day.js ship inside the extension — no CDN requests |
| 🖥️ **Options Dashboard** | Wide 1280px responsive dashboard layout for easy management |
| 🔄 **3-Way Realtime Sync** | Automatic instant sync across Popup, Side Panel, and Options Page |
| 🔐 **Validated Backups** | Strict JSON import validation; MCP tokens and consent flags are never exported |

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

### Pairing the extension

1. Start `js-injection-mcp` once. It creates `~/.js-injection-mcp-token` (mode `0600`) and prints the path, never the token itself.
2. Open **Settings → MCP Bridge**, paste the file's contents into the token field, and click **Connect**.
3. Leave the access switches off unless you want the AI agent to change rules or execute code:
   - **Allow rule changes** — `add_rule` / `delete_rule`
   - **Allow one-off code execution** — `run_script_on_active_tab`
   - **Allow exposing stored code** — include JS/CSS bodies in `list_rules`

The server binds `127.0.0.1` only, rejects non-extension browser origins, requires a constant-time token check, and keeps a single active extension socket. A token can also be supplied through `JS_INJECTION_MCP_TOKEN` (set `JS_INJECTION_MCP_TOKEN_FILE` to use another path).

---

## 📜 Version History (변경 이력)

버전별 변경 사항은 [GitHub Releases](https://github.com/AnOldStory/js-injection/releases)에서
확인할 수 있다. 태그를 push하면 릴리스가 자동으로 만들어진다.

---

## 🛠️ Build & Install

```bash
# Install dependencies
npm ci --legacy-peer-deps

# Lint + unit tests + build
npm run lint
npm test
npm run build
```

Load the **`dist/`** folder into Chrome / Whale via `chrome://extensions` (Developer mode).

---

## 🔒 Privacy Policy

Js-Injection strictly values user privacy and does **NOT** collect, track, or transmit any personal data to external servers.  
For full details, please refer to the [PRIVACY_POLICY.md](PRIVACY_POLICY.md) document.


