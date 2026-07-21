<div align="center">

<img width="140" height="140" src="https://raw.githubusercontent.com/AnOldStory/Js-Injection/master/STOREIMG/%EC%9B%90%EB%B3%B8.png?raw=true" alt="Js-Injection Logo">

# Js-Injection

**JavaScript Injection Extension for Chromium-based Browsers**

[![Version](https://img.shields.io/badge/version-v3.0.0-6C63FF?style=for-the-badge)](https://github.com/AnOldStory/Js-Injection/releases)
[![Manifest](https://img.shields.io/badge/Manifest-V3-4CAF50?style=for-the-badge&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)](LICENSE)

<br/>

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://chrome.google.com/webstore/detail/js-injection/mijnijeicfcodlijkmafknapfcilffni)
[![Whale Store](https://img.shields.io/badge/Whale%20Store-Install-03C75A?style=flat-square&logo=naver&logoColor=white)](https://store.whale.naver.com/detail/aibngojigjlagjankjgbcapehgmolkfa)

</div>

---

## ✨ Overview

**Js-Injection** is a Chrome / Naver Whale extension that automatically injects JavaScript code into any website you choose.

Simply register a URL pattern and a script — the extension will execute it every time you visit a matching page.

- Automate repetitive JavaScript tasks
- Customize website UI and behavior
- Inject debugging or development utilities

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 📝 **Rule Management** | Add, edit, and delete JS rules per URL pattern |
| 🔄 **Auto Execution** | Scripts run automatically on matching page visits |
| ☁️ **Cloud Sync** | Rules synced across devices via `chrome.storage.sync` |
| 📦 **Backup & Restore** | Export and import rules as a JSON file |
| ⚡ **jQuery Injection** | Automatically inject jQuery with a single toggle |
| 🌐 **Glob Patterns** | Wildcard URL matching (e.g. `https://*.example.com/*`) |

---

## 📥 Installation

<table>
  <tr>
    <td align="center">
      <a href="https://chrome.google.com/webstore/detail/js-injection/mijnijeicfcodlijkmafknapfcilffni">
        <img src="https://img.shields.io/badge/-Chrome%20Web%20Store-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white"/>
      </a>
    </td>
    <td align="center">
      <a href="https://store.whale.naver.com/detail/aibngojigjlagjankjgbcapehgmolkfa">
        <img src="https://img.shields.io/badge/-Whale%20Store-03C75A?style=for-the-badge&logo=naver&logoColor=white"/>
      </a>
    </td>
  </tr>
</table>

---

## 🛠 Development Setup

```bash
# Clone the repository
git clone https://github.com/AnOldStory/Js-Injection.git
cd Js-Injection

# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

### Load in Chrome (Developer Mode)

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `dist/` folder

---

## 🏗 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, Redux Toolkit |
| **Build** | Vite 6, Sass |
| **Extension** | Manifest V3, Chrome Scripting API |
| **Code Editor** | react-ace, ace-builds |
| **CI/CD** | GitHub Actions |

---

## 📦 Release

Pushing a version tag triggers GitHub Actions to automatically:
1. Build for production
2. Create a GitHub Release with the zip attached
3. Upload to the Chrome Web Store

```bash
git tag -a v3.0.1 -m "Fix: ..."
git push origin v3.0.1
```

---

## 🔒 Privacy Policy

This extension **does not collect, store, transmit, or share any personal data**.

- All user-defined scripts and URL rules are stored locally via `chrome.storage.sync` and synced only through the user's own Google account.
- No data is ever sent to any external server, third party, or developer.
- No analytics, tracking, or telemetry of any kind.

### Permissions

| Permission | Reason |
|------------|--------|
| `scripting` | Injects user-defined JavaScript into web pages matching user-configured URL patterns. Scripts run only on pages the user has explicitly specified. |
| `storage` | Saves and syncs user-created injection rules across devices via Chrome's built-in `chrome.storage.sync` API. |
| `host_permissions: <all_urls>` | Users can define rules for any website. The extension only acts on URLs explicitly configured by the user. |

---

## 📋 Roadmap

- [x] Main UI design
- [x] Popup & Options page
- [x] Backup / Restore
- [x] Core injection logic
- [x] Manifest V3 migration
- [x] React 19 upgrade
- [x] Automated Chrome Web Store CI/CD
- [ ] Rule On/Off toggle

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

👉 [Open an Issue](https://github.com/AnOldStory/Js-Injection/issues)

---

<div align="center">

Made with ❤️ by [AnOldStory](https://github.com/AnOldStory)

</div>
