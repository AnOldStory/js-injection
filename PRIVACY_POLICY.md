# Privacy Policy for Js-Injection

**Last Updated:** July 23, 2026

**Js-Injection** (the "Extension") is committed to protecting user privacy. This Privacy Policy explains our practices regarding data collection, usage, and storage when you use our browser extension.

---

## 1. Data Collection and Transmission

**Js-Injection does NOT collect, store, track, or transmit any personal data or sensitive user information.**

- **No Server Transmission:** We do not own or operate any external databases or remote servers to collect or store user data. All data generated or processed by the Extension remains strictly on your local device.
- **No Third-Party Analytics:** The Extension does not integrate any third-party tracking, telemetry, or analytics software (such as Google Analytics).

---

## 2. Local Data Storage

All preferences, user-defined scripts, custom CSS rules, and configuration settings created within the Extension are stored locally in your browser's internal storage API (`chrome.storage.local` and/or `chrome.storage.sync`).

- This data is used solely to execute your configured JavaScript and CSS injections on target websites as intended by you.
- Your stored rules and code snippets are never shared with or accessible by the developer or any third parties.

---

## 3. Use of Permissions

The Extension requests only the permissions required to provide its core features. The list below matches exactly the permissions declared in the extension's `manifest.json`:

- **`storage`**: Saves your custom scripts, CSS rules, and user preferences locally within your browser.
- **`scripting`**: Injects your custom JavaScript and CSS into the web pages you visit according to your defined rules.
- **`tabs`**: Reads the URL of your currently active tab only, so the Extension can pre-fill the rule editor with the site you are on and apply the correct injection rules. It is never used to build a history of your browsing.
- **`offscreen`**: Runs a minimal background document that maintains the optional local MCP WebSocket connection described in Section 3a. It handles no personal data.
- **Host permission `<all_urls>`**: Required because you may configure the Extension to inject your own scripts and styles into any website of your choosing. The Extension does not read or transmit page content; it only applies the rules you define.
- **Host permissions `ws://localhost/*` and `http://localhost/*`**: Used solely for the optional local AI (MCP) bridge described below. These are loopback addresses on your own machine and never reach the public internet.

None of these permissions are used to monitor, harvest, or log your browsing history or personal activities.

---

## 3a. Optional Local AI (MCP) Bridge

The Extension includes an optional **Model Context Protocol (MCP)** bridge that lets a local AI agent (e.g. Claude Desktop, Antigravity, or Cursor running on your own computer) manage your injection rules.

- This feature connects **only to a WebSocket server running on your own machine** at `ws://localhost:3000` (loopback). No data leaves your device, and no remote or third-party server is contacted.
- The connection carries only the injection rules and commands you or your local AI agent explicitly issue. It transmits no personal data, browsing history, or page content.
- The bridge is inactive unless you run the accompanying local MCP server yourself. If you never start it, no connection is ever made.

---

## 4. Third-Party Services and Sharing

We do not sell, trade, rent, or transfer any user data to third parties. The Extension operates independently of external commercial services.

---

## 5. Data Retention and Deletion

Since all data is stored locally on your device:
- You can delete your custom rules and settings at any time directly through the Extension's user interface.
- Uninstalling the Extension or clearing your browser's data will permanently remove all stored rules and configurations.

---

## 6. Policy Updates

We may update this Privacy Policy from time to time to reflect changes in extension functionality or legal requirements. Any updates will be posted directly to this document in the public repository.

---

## 7. Contact Information

If you have any questions or concerns regarding this Privacy Policy, please submit an issue on our official GitHub repository:

- **GitHub Repository:** [https://github.com/AnOldStory/Js-Injection](https://github.com/AnOldStory/Js-Injection)
