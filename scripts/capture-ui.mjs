/**
 * Captures real screenshots of the built extension (dist/) by loading it in Chromium.
 * Output: STOREIMG/raw/*.png  — consumed by scripts/gen-store-images.mjs
 *
 * Run `npm run build` first, then `node scripts/capture-ui.mjs`.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const DIST = resolve(ROOT, "dist");
const RAW = resolve(ROOT, "STOREIMG/raw");
const PROFILE = resolve(ROOT, ".capture-profile");
mkdirSync(RAW, { recursive: true });
rmSync(PROFILE, { recursive: true, force: true });

const DEMO_PORT = 8899;
const VERSION = JSON.parse(
  readFileSync(resolve(ROOT, "package.json"), "utf8")
).version;

// ---- demo page injected into by a real rule --------------------------------
const DEMO_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Release notes — Acme Docs</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.7 -apple-system,"Segoe UI",Roboto,sans-serif; color:#1f2328; background:#fff; }
  header { border-bottom:1px solid #e3e6ea; padding:14px 40px; display:flex; align-items:center; gap:14px; }
  .logo { width:26px;height:26px;border-radius:7px;background:#336699; }
  header b { font-size:15px; }
  nav { margin-left:auto; display:flex; gap:22px; font-size:14px; color:#57606a; }
  main { max-width:760px; margin:0 auto; padding:40px 40px 80px; }
  h1 { font-size:32px; margin:0 0 6px; letter-spacing:-.3px; }
  .meta { color:#6a737d; font-size:14px; margin-bottom:28px; }
  h2 { font-size:20px; margin:32px 0 10px; }
  p { margin:0 0 14px; }
  pre { background:#f6f8fa; border:1px solid #e3e6ea; border-radius:8px; padding:14px 16px; font-size:13.5px; overflow:auto; }
  table { border-collapse:collapse; width:100%; font-size:14px; margin:10px 0 4px; }
  th,td { border:1px solid #e3e6ea; padding:8px 12px; text-align:left; }
  th { background:#f6f8fa; }
  footer { border-top:1px solid #e3e6ea; padding:18px 40px; color:#8b949e; font-size:13px; }
</style></head><body>
<header><div class="logo"></div><b>Acme Docs</b>
  <nav><span>Guides</span><span>API</span><span>Changelog</span><span>Support</span></nav>
</header>
<main>
  <h1>Release notes</h1>
  <div class="meta">Version 4.2 · Updated today · 4 min read</div>
  <p>This release focuses on rendering performance and a reworked plugin pipeline.
     Existing integrations keep working without changes.</p>
  <h2>Highlights</h2>
  <table>
    <tr><th>Area</th><th>Change</th></tr>
    <tr><td>Renderer</td><td>Incremental layout, ~40% faster first paint</td></tr>
    <tr><td>Plugins</td><td>New lifecycle hooks</td></tr>
    <tr><td>CLI</td><td>Config validation with clear errors</td></tr>
  </table>
  <h2>Upgrading</h2>
  <pre>npm install acme@4.2
acme migrate --from 4.1</pre>
  <p>Read the migration guide for the full list of deprecations and their replacements.</p>
</main>
<footer>© Acme — documentation sample page</footer>
</body></html>`;

const server = createServer((_, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(DEMO_HTML);
}).listen(DEMO_PORT);

// ---- sample rules seeded into chrome.storage.sync --------------------------
const DEMO_CSS = `/* wider article + dark reading theme */
body { background: #0f1420 !important; color: #dfe7f3 !important; }
main { max-width: 980px; }
header, footer { background: #131a2b !important; }
pre, th { background: #16203a !important; }
td, th, header, footer, pre { border-color: #26314d !important; }
h1, h2, b { color: #7fb2ea; }
.meta, nav, footer { color: #93a6c2 !important; }`;

const DEMO_JS = `// runs at document_start on every matching page
const bar = document.createElement("div");
bar.textContent = "Js-Injection: rule applied automatically";
bar.style.cssText =
  "position:fixed;z-index:99999;left:0;right:0;top:0;padding:9px 16px;" +
  "font:600 13px/1.4 sans-serif;color:#fff;background:#336699;text-align:center";
const apply = () => {
  document.body.prepend(bar);
  document.body.style.paddingTop = "38px";
  document.title = "[injected] " + document.title;
};
if (document.readyState === "loading") addEventListener("DOMContentLoaded", apply);
else apply();`;

const RULES = {
  1: {
    nickname: "Acme Docs — dark reading mode",
    url: "http://localhost:8899/*",
    code: DEMO_JS,
    cssCode: DEMO_CSS,
    jquery: "none",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: false,
    runAt: "document_start",
    tags: "css, reading",
  },
  2: {
    nickname: "Docs portal — unlock right click",
    url: "https://*.example.com/*",
    code: "",
    cssCode: "",
    jquery: "none",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: true,
    runAt: "document_idle",
    tags: "unlock",
  },
  3: {
    nickname: "Dashboard — auto refresh",
    url: "https://*.mycompany.io/reports/*",
    code: "setInterval(() => location.reload(), 60000);",
    cssCode: "",
    jquery: "jquery3",
    customLibUrl: "",
    enabled: true,
    unlockRightClick: false,
    runAt: "document_end",
    tags: "automation, jquery",
  },
  4: {
    nickname: "Shop — hide promo banners",
    url: "https://*.shop.example/*",
    code: "",
    cssCode: ".promo, .newsletter-popup { display: none !important; }",
    jquery: "none",
    customLibUrl: "",
    enabled: false,
    unlockRightClick: false,
    runAt: "document_start",
    tags: "cleanup",
  },
};

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: true,
  deviceScaleFactor: 2, // captures at 2x so downscaled store images stay sharp
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
});

// resolve extension id from its service worker
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
const extId = new URL(sw.url()).host;
console.log("  extension id:", extId);
const url = (hash = "") => `chrome-extension://${extId}/index.html${hash}`;

const shot = async (page, name, opts = {}) => {
  const file = resolve(RAW, name);
  await page.screenshot({ path: file, ...opts });
  console.log("  ✓", name);
};

// ---- seed storage ----------------------------------------------------------
// Seeded from the service worker *before* any UI page opens: the UI migrates
// storage whenever `version` mismatches, which would overwrite these rules.
await sw.evaluate(
  ([rules, version]) =>
    new Promise((done) => {
      chrome.storage.sync.clear(() =>
        chrome.storage.sync.set(
          { version, __globalEnabled: true, __lang: "en", ...rules },
          done
        )
      );
    }),
  [RULES, VERSION]
);

// ---- 1) popup (rule list) --------------------------------------------------
{
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 500, height: 660 });
  await page.goto(url("#/"));
  await page.waitForSelector(".main-link");
  await page.waitForTimeout(600);
  await shot(page, "popup.png");
  await page.close();
}

// ---- 2) options dashboard --------------------------------------------------
{
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1400, height: 940 });
  await page.goto(url("#/"));
  await page.waitForSelector(".options-dashboard");
  await page.waitForTimeout(700);
  await shot(page, "options.png");

  // MCP card with the setup guide expanded (config JSON visible)
  await page.getByText("Setup Guide", { exact: false }).first().click();
  await page.waitForTimeout(400);
  const mcp = page.locator(".options-card").filter({ hasText: "MCP" }).first();
  await shot(mcp, "mcp-card.png");
  await page.close();
}

// ---- 3) rule editor (JS + CSS tabs) ---------------------------------------
{
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1040, height: 1000 });
  await page.goto(url("#/1"));
  await page.waitForSelector(".ace_editor");
  await page.waitForTimeout(900);
  await shot(page, "editor-js.png", { fullPage: true });

  await page.getByRole("button", { name: "CSS (Styles)" }).click();
  await page.waitForTimeout(700);
  await shot(page, "editor-css.png", { fullPage: true });
  await page.close();
}

// ---- 4) real injection running on a page ----------------------------------
{
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1180, height: 780 });
  await page.goto(`http://localhost:${DEMO_PORT}/`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const injected = await page.evaluate(() => document.title.startsWith("[injected]"));
  if (!injected) throw new Error("rule did not inject into the demo page");
  await shot(page, "in-action.png");
  await page.close();
}

writeFileSync(
  resolve(RAW, "README.txt"),
  "Raw UI captures produced by scripts/capture-ui.mjs from the built extension (dist/).\n" +
    "Do not edit by hand — re-run `npm run build && node scripts/capture-ui.mjs`.\n"
);

await ctx.close();
server.close();
rmSync(PROFILE, { recursive: true, force: true });
console.log("\nRaw captures written to STOREIMG/raw/");
