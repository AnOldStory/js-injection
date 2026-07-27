/**
 * Captures real screenshots of the built extension running in Chromium.
 *
 *   npm run build && node scripts/capture-app-shots.mjs
 *
 * Loads dist/ as an unpacked extension, seeds a realistic rule set into
 * chrome.storage.sync, then screenshots the actual product surfaces:
 *   captures/app-dashboard.png  — options dashboard (rule list + MCP + backup)
 *   captures/app-popup.png      — toolbar popup rule list
 *   captures/app-editor.png     — rule editor with JS code
 *   captures/app-editor-css.png — rule editor on the CSS tab, Live CSS Sync on
 *   captures/app-live-before.png— demo page untouched
 *   captures/app-live-after.png — same page with the rule injected
 *
 * A small static server hosts scripts/demo-page/ and Chromium resolves
 * demo.local to it, so the injection shot runs over real http:// like any site.
 */
import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const DIST = resolve(ROOT, "dist");
const OUT = resolve(ROOT, "STOREIMG/captures");
const PROFILE = resolve(ROOT, ".tmp-chrome-profile");
const PORT = 8899;
const SITE = `http://demo.local:${PORT}/`;

mkdirSync(OUT, { recursive: true });
rmSync(PROFILE, { recursive: true, force: true });

// ---- the rule that gets injected into the demo page ----------------------
const DEMO_CSS = `/* Injected banner + reading chip */
#ji-banner {
  position: fixed; left: 0; right: 0; top: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center; height: 38px;
  font: 600 13px/1 system-ui, sans-serif; letter-spacing: .2px;
  color: #eaf2ff; background: linear-gradient(90deg, #336699, #4a90d9);
}
#ji-chip {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
  padding: 9px 14px; border-radius: 999px;
  font: 600 12px/1 system-ui, sans-serif; color: #eaf2ff;
  background: #1d2942; border: 1px solid #33507d;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35);
}

/* Dark reading theme */
:root { color-scheme: dark; }
body { background: #0f1420 !important; color: #dfe6f1 !important; }
header.site, aside .card, footer.site { background: #151c2b !important; border-color: #263349 !important; }
header.site { box-shadow: 0 1px 0 #263349; }
.brand { color: #f2f6fc !important; }
nav.site { color: #93a3bd !important; }
nav.site a.on { color: #6fa8dc !important; }
.searchbox { background: #1b2436 !important; border-color: #2c3a53 !important; color: #6f7f99 !important; }
h1, h2 { color: #f4f8ff !important; }
p, td, aside ul, aside li { color: #b6c3d6 !important; }
.byline, aside h3, footer.site { color: #8493ac !important; }
pre { background: #111a2a !important; border-color: #2a3752 !important; color: #9fd3ff !important; }
th, td { border-bottom-color: #24314a !important; }
th { color: #93a3bd !important; }
.tag { background: #1d2942 !important; color: #9fb6d6 !important; }
.kicker { color: #7cb2e8 !important; }`;

const DEMO_JS = `function applyReadingMode() {
  /* Banner announcing the rule is live (styled on the CSS tab) */
  const banner = document.createElement("div");
  banner.id = "ji-banner";
  banner.textContent = "Js-Injection active - dark reading mode is on";
  document.documentElement.appendChild(banner);
  document.body.style.paddingTop = "38px";

  /* Number every section heading */
  document.querySelectorAll("article h2").forEach((h, i) => {
    h.textContent = \`\${i + 1}. \${h.textContent}\`;
  });

  /* Estimate reading time and pin it bottom-right */
  const words = document.body.innerText.trim().split(/\\s+/).length;
  const chip = document.createElement("div");
  chip.id = "ji-chip";
  chip.textContent = \`\${Math.ceil(words / 220)} min read - \${words} words\`;
  document.documentElement.appendChild(chip);

  console.log("[Js-Injection] applied on", location.host);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyReadingMode);
} else {
  applyReadingMode();
}`;

const SEED = {
  version: "3.3.1",
  __globalEnabled: true,
  __lang: "en",
  __mcpEnabled: false,
  __mcpUrl: "ws://localhost:3000/mcp",
  0: {
    nickname: "Devlog — dark reading mode",
    url: `http://demo.local:${PORT}/*`,
    code: DEMO_JS,
    cssCode: DEMO_CSS,
    jquery: "none",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: false,
    runAt: "document_end",
    tags: "css, darkmode, reading",
  },
  1: {
    nickname: "GitHub — full-width diffs",
    url: "https://*.github.com/*",
    code: "",
    cssCode: ".container-xl { max-width: 100% !important; }\n.diff-table { font-size: 13px !important; }",
    jquery: "none",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: false,
    runAt: "document_start",
    tags: "layout, work",
  },
  2: {
    nickname: "Unlock copy & right-click",
    url: "https://*/*",
    code: "",
    cssCode: "",
    jquery: "none",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: true,
    runAt: "document_start",
    tags: "utility",
  },
  3: {
    nickname: "Wikipedia — focus mode",
    url: "https://*.wikipedia.org/*",
    code: "",
    cssCode: "#mw-panel, .vector-sticky-pinned-container { display: none !important; }\n#content { margin-left: 0 !important; }",
    jquery: "none",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: false,
    runAt: "document_start",
    tags: "reading",
  },
  4: {
    nickname: "Hide cookie banners",
    url: "https://*/*",
    code: "",
    cssCode: '[id*="cookie-banner"], [class*="cookie-consent"], .gdpr-overlay {\n  display: none !important;\n}\nhtml, body { overflow: auto !important; }',
    jquery: "none",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: false,
    runAt: "document_start",
    tags: "utility, css",
  },
  5: {
    nickname: "Tailwind sandbox",
    url: "https://*.codepen.io/*",
    code: 'console.log("Tailwind CDN injected — utility classes ready.");',
    cssCode: "",
    jquery: "tailwind",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: false,
    runAt: "document_idle",
    tags: "prototyping",
  },
  6: {
    nickname: "Standup notes auto-fill",
    url: "https://*.atlassian.net/*",
    code: 'jQuery(function ($) {\n  $("textarea[name=comment]").val("No blockers. Continuing on the MV3 migration.");\n});',
    cssCode: "",
    jquery: "jquery3",
    customLibUrl: "",
    enabled: false,
    unlockRightClick: false,
    runAt: "document_idle",
    tags: "automation",
  },
};

// ---- static server for the demo page ------------------------------------
const page404 = "<h1>404</h1>";
const server = createServer((req, res) => {
  try {
    const body = readFileSync(resolve(__dir, "demo-page/index.html"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/html" });
    res.end(page404);
  }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

// ---- launch Chromium with the unpacked extension ------------------------
// MV3 extensions need the full Chromium binary (headless_shell can't load them).
const CHROME = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium",
].find((p) => p && existsSync(p));

const context = await chromium.launchPersistentContext(PROFILE, {
  headless: true,
  ...(CHROME ? { executablePath: CHROME } : {}),
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  args: [
    `--disable-extensions-except=${DIST}`,
    `--load-extension=${DIST}`,
    `--host-resolver-rules=MAP demo.local 127.0.0.1`,
    "--hide-scrollbars",
    "--force-color-profile=srgb",
  ],
});

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 30000 });
const EXT_ID = new URL(worker.url()).host;
console.log("extension id:", EXT_ID);
const EXT = (hash = "") => `chrome-extension://${EXT_ID}/index.html${hash}`;

const shot = async (page, name, opts = {}) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, name), ...opts });
  console.log("  ✓", name);
};

// ---- seed storage -------------------------------------------------------
// Seed from the service worker, not from a UI page: the app runs a first-run
// migration whenever the stored `version` is missing, which would clear the seed.
const seed = (data) =>
  worker.evaluate(
    (d) => new Promise((done) => chrome.storage.sync.clear(() => chrome.storage.sync.set(d, done))),
    data
  );
const patch = (data) =>
  worker.evaluate((d) => new Promise((done) => chrome.storage.sync.set(d, done)), data);

await seed(SEED);

// ---- 1) options dashboard ----------------------------------------------
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(EXT("#/"), { waitUntil: "load" });
  await page.getByText("Rule Management List").waitFor();
  await shot(page, "app-dashboard.png", { fullPage: false });
  await page.close();
}

// ---- 2) toolbar popup ---------------------------------------------------
// 500px wide: below the 650px options-page threshold, at/above the 480px
// body min-width, so this is exactly the popup layout Chrome renders.
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 500, height: 600 });
  await page.goto(EXT("#/"), { waitUntil: "load" });
  await page.getByText("Master Switch: ON").waitFor();
  await shot(page, "app-popup.png");
  await page.close();
}

// ---- 3) rule editor, JS tab -------------------------------------------
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 900, height: 1075 });
  await page.goto(EXT("#/0"), { waitUntil: "load" });
  await page.locator(".ace_content").first().waitFor({ timeout: 20000 });
  await shot(page, "app-editor.png");

  // ---- 4) same editor on the CSS tab ----------------------------------
  await page.getByText("CSS (Styles)").click();
  await page.waitForTimeout(700);
  await shot(page, "app-editor-css.png");
  await page.close();
}

// ---- 5) the demo page, before and after injection ----------------------
{
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // before: master switch off, so nothing is injected
  await patch({ __globalEnabled: false });
  await page.waitForTimeout(600);
  await page.goto(SITE, { waitUntil: "load" });
  await shot(page, "app-live-before.png");

  // after: switch back on and reload — the real content script injects
  await patch({ __globalEnabled: true });
  await page.waitForTimeout(800);
  await page.goto(SITE, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.style.paddingTop === "38px", null, { timeout: 15000 });
  await shot(page, "app-live-after.png");
  await page.close();
}

await context.close();
server.close();
rmSync(PROFILE, { recursive: true, force: true });
console.log("\nCaptures written to STOREIMG/captures/");
