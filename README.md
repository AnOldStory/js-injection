# Js-Injection

<p align="center">
    <img width="170" height="170" src="https://raw.githubusercontent.com/AnOldStory/Js-Injection/master/STOREIMG/%EC%9B%90%EB%B3%B8.png?raw=true">
</p>

<p align="center">
    <img src="https://img.shields.io/badge/version-v3.0.0-orange" alt="version"/>
    <img src="https://img.shields.io/badge/Manifest-V3-blue" alt="Manifest V3"/>
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/FrontEnd-React 19-9cf.svg" alt="React"></a>
</p>


## Description

> Javascript Injection Extension Tool for Chromium-based Web browsers.

## Download

Chrome Browser → [Chrome Web Store](https://chrome.google.com/webstore/detail/js-injection/mijnijeicfcodlijkmafknapfcilffni)

Whale Browser → [Whale Store](https://store.whale.naver.com/detail/aibngojigjlagjankjgbcapehgmolkfa)

## TODO

- [x] Main design
- [x] Popup page
- [ ] On/Off
- [x] Option page design
- [x] Popup page design
- [x] Save file
- [x] Main Working
- [x] Program main image
- [x] Prevent duplication url collision

---

## Privacy Policy

This extension **does not collect, store, transmit, or share any personal data**.

- All user-defined scripts and URL rules are stored locally via `chrome.storage.sync` and synced only through the user's own Google account.
- No data is ever sent to any external server, third party, or developer.
- No analytics, tracking, or telemetry of any kind.

### Permissions

| Permission | Reason |
|------------|--------|
| `scripting` | Required to inject user-defined JavaScript into web pages that match URL patterns configured by the user. Scripts are executed only on pages explicitly specified by the user. |
| `storage` | Required to save and sync user-created injection rules (URL patterns and code snippets) across devices via Chrome's built-in `chrome.storage.sync` API. |
| `host_permissions: <all_urls>` | Required because users can define rules for any website. The extension only acts on URLs that the user has explicitly configured. |

If you have any questions, please open an issue on [GitHub](https://github.com/AnOldStory/Js-Injection/issues).
