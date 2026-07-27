/**
 * Chrome Web Store / Whale Store listing image generator.
 *
 *   npm run build && node scripts/capture-app-shots.mjs && node scripts/gen-store-images.mjs
 *
 * Every screenshot here is built around a real capture of the extension running
 * in Chromium (STOREIMG/captures/, produced by scripts/capture-app-shots.mjs) —
 * framed in a browser window on the branded background. Nothing is mocked up
 * except the MCP architecture diagram, which pairs with a real capture of the
 * MCP panel.
 *
 * Output: exactly 5 screenshots (1280x800) for store slots 1-5, plus the marquee
 * promo (1400x560) and small promo (440x280) tiles. Five is the Chrome Web Store
 * limit, so every headline feature has to earn its place inside those five:
 *   1 live page + toolbar popup   2 before/after   3 dashboard
 *   4 rule editor                 5 MCP bridge
 * English copy only (font-safe, no emoji). Brand blue #336699 sampled from the logo.
 */
import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const OUT = resolve(ROOT, "STOREIMG/store");
const CAP = resolve(ROOT, "STOREIMG/captures");
mkdirSync(OUT, { recursive: true });

const SHOTS = {
  live: resolve(CAP, "app-live-after.png"),
  plain: resolve(CAP, "app-live-before.png"),
  dashboard: resolve(CAP, "app-dashboard.png"),
  popup: resolve(CAP, "app-popup.png"),
  editor: resolve(CAP, "app-editor.png"),
  editorCss: resolve(CAP, "app-editor-css.png"),
};
for (const [k, f] of Object.entries(SHOTS)) {
  if (!existsSync(f)) {
    console.error(`Missing capture "${k}": ${f}\nRun: npm run build && node scripts/capture-app-shots.mjs`);
    process.exit(1);
  }
}

// ---- palette -------------------------------------------------------------
const C = {
  bg0: "#0B1220",
  bg1: "#111d33",
  bg2: "#16233d",
  blue: "#4a90d9",
  blueDim: "#336699",
  purple: "#8b7fd4",
  cyan: "#38bec9",
  green: "#4caf82",
  text: "#eef3f9",
  muted: "#93a6c2",
  cardBorder: "rgba(255,255,255,0.09)",
  cardFill: "rgba(255,255,255,0.035)",
  chrome: "#1b2a45",
  chromeInner: "#0e1a2e",
};
const FONT = "sans-serif";
const MONO = "monospace";

// ---- helpers -------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Approximate advance width of a glyph in the default sans-serif, in em units.
 * Rough per-class values are enough to size pills so they never collide —
 * they are deliberately generous rather than exact.
 */
function charEm(ch) {
  if (" ".includes(ch)) return 0.28;
  if ("iljI|.,:;'!()[]".includes(ch)) return 0.32;
  if ("ftr-/".includes(ch)) return 0.38;
  if ("mwMW@".includes(ch)) return 0.88;
  if (ch >= "A" && ch <= "Z") return 0.7;
  if (ch >= "0" && ch <= "9") return 0.57;
  if (ch.charCodeAt(0) > 127) return 0.62; // em dash, middle dot, ~
  return 0.56;
}

// width of `text` at `size` px; mono=true for the monospace family
const textW = (text, size, { mono = false, bold = false } = {}) =>
  mono
    ? String(text).length * size * 0.605
    : [...String(text)].reduce((a, c) => a + charEm(c), 0) * size * (bold ? 1.06 : 1) * 1.04;

function bg(w, h) {
  return `
    <defs>
      <linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.bg0}"/>
        <stop offset="0.55" stop-color="${C.bg1}"/>
        <stop offset="1" stop-color="${C.bg2}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${C.blue}" stop-opacity="0.22"/>
        <stop offset="1" stop-color="${C.blue}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bgg)"/>
    <circle cx="${w * 0.82}" cy="${h * 0.18}" r="${h * 0.55}" fill="url(#glow)"/>
    <circle cx="${w * 0.1}" cy="${h * 0.95}" r="${h * 0.4}" fill="url(#glow)" opacity="0.6"/>`;
}

function rrect(x, y, w, h, r, fill, stroke, sw = 1) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${
    stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""
  }/>`;
}

// minimalist stroke icons in a 0..24 box, drawn at (x,y) scaled by s, colored `col`
function icon(name, x, y, s, col) {
  const S = (m) => `<g transform="translate(${x},${y}) scale(${s / 24})" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m}</g>`;
  switch (name) {
    case "bridge": // two nodes linked (MCP)
      return S(`<circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/><path d="M8 12h8"/><path d="M12 9v6"/>`);
    case "toggle":
      return S(`<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3" fill="${col}"/>`);
    case "bolt":
      return S(`<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="${col}" fill-opacity="0.18"/>`);
    case "unlock":
      return S(`<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0"/><circle cx="12" cy="16" r="1.4" fill="${col}"/>`);
    case "globe":
      return S(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>`);
    case "layers":
      return S(`<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 13l9 5 9-5"/>`);
    case "grid":
      return S(`<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`);
    case "sync":
      return S(`<path d="M4 12a8 8 0 0 1 13-6l3 2"/><path d="M20 4v4h-4"/><path d="M20 12a8 8 0 0 1-13 6l-3-2"/><path d="M4 20v-4h4"/>`);
    case "code":
      return S(`<path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M13 6l-2 12"/>`);
    case "search":
      return S(`<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/>`);
    default:
      return "";
  }
}

// build an app-icon tile: white rounded square with the logo centered
async function logoTile(size = 512) {
  const logo = await sharp(resolve(ROOT, "STOREIMG/원본.png"))
    .trim()
    .resize(Math.round(size * 0.78), Math.round(size * 0.78), { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();
  const r = Math.round(size * 0.22);
  const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eaf1fb"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#t)"/></svg>`;
  return sharp(Buffer.from(tileSvg))
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

const b64 = (buf) => "data:image/png;base64," + buf.toString("base64");

async function render(name, w, h, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg(w, h)}${inner}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(OUT, name));
  console.log("  ✓", name, `${w}x${h}`);
}

// ---- real-capture framing -----------------------------------------------
let uid = 0;

// clamp a { left, top, width, height } crop (source pixels) to the image bounds
function cropBox(crop, mw, mh) {
  const left = Math.max(0, Math.min(crop.left ?? 0, mw - 1));
  const top = Math.max(0, Math.min(crop.top ?? 0, mh - 1));
  return {
    left,
    top,
    width: Math.min(crop.width ?? mw, mw - left),
    height: Math.min(crop.height ?? mh, mh - top),
  };
}

/**
 * A capture framed without window chrome — used for zoomed detail callouts
 * that point at one control inside a larger screenshot.
 */
async function plainShot(x, y, w, file, { crop } = {}) {
  let img = sharp(file);
  let { width: mw, height: mh } = await img.metadata();
  if (crop) {
    const box = cropBox(crop, mw, mh);
    img = img.extract(box);
    mw = box.width;
    mh = box.height;
  }
  const h = Math.round((w * mh) / mw);
  const buf = await img.resize(w, h, { fit: "fill" }).png().toBuffer();
  const id = `plain${uid++}`;
  let s = rrect(x - 6, y - 6, w + 12, h + 12, 14, "rgba(255,255,255,0.055)", C.cardBorder, 1);
  s += `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/></clipPath></defs>`;
  s += `<image href="${b64(buf)}" x="${x}" y="${y}" width="${w}" height="${h}" clip-path="url(#${id})"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
  return { svg: s, w, h };
}

/**
 * Frames one of the real captures inside a browser-window chrome.
 *   w         display width of the capture
 *   label     text shown in the window's address pill
 *   crop      { top, height } in SOURCE pixels, applied before scaling
 *   maxInner  cap the displayed capture height (crops the bottom off)
 * Returns { svg, w, h } so callers can lay out around it.
 */
async function windowShot(x, y, w, label, file, { crop, maxInner, kind = "url" } = {}) {
  const TB = 40;
  let img = sharp(file);
  let { width: mw, height: mh } = await img.metadata();
  if (crop) {
    const box = cropBox(crop, mw, mh);
    img = img.extract(box);
    mw = box.width;
    mh = box.height;
  }
  let iw = w;
  let ih = Math.round((w * mh) / mw);
  let buf;
  if (maxInner && ih > maxInner) {
    ih = maxInner;
    buf = await img.resize(iw, ih, { fit: "cover", position: "top" }).png().toBuffer();
  } else {
    buf = await img.resize(iw, ih, { fit: "fill" }).png().toBuffer();
  }

  const h = ih + TB;
  const id = `shot${uid++}`;
  const iy = y + TB;
  const r = 14;

  let s = "";
  // soft outer lift + frame
  s += rrect(x - 7, y - 7, w + 14, h + 14, r + 6, "rgba(255,255,255,0.055)", C.cardBorder, 1);
  s += rrect(x, y, w, h, r, C.chromeInner, "rgba(255,255,255,0.16)", 1);
  // title bar
  s += rrect(x, y, w, TB, r, C.chrome, "none");
  s += `<rect x="${x}" y="${y + TB - r}" width="${w}" height="${r}" fill="${C.chrome}"/>`;
  s += `<circle cx="${x + 20}" cy="${y + 20}" r="5" fill="#e05561"/>`;
  s += `<circle cx="${x + 38}" cy="${y + 20}" r="5" fill="#e0a13a"/>`;
  s += `<circle cx="${x + 56}" cy="${y + 20}" r="5" fill="#4caf82"/>`;
  // address / title pill
  const pillX = x + 76;
  const isUrl = kind === "url";
  const pillW = Math.min(
    w - 96,
    Math.round((isUrl ? 44 : 30) + textW(label, isUrl ? 12.5 : 13, { mono: isUrl }))
  );
  s += rrect(pillX, y + 9, pillW, 22, 11, "rgba(0,0,0,0.28)", "rgba(255,255,255,0.07)", 1);
  if (isUrl) {
    s += icon("globe", pillX + 8, y + 13, 14, C.muted);
    s += `<text x="${pillX + 28}" y="${y + 25}" font-family="${MONO}" font-size="12.5" fill="${C.muted}">${esc(label)}</text>`;
  } else {
    s += `<text x="${pillX + 14}" y="${y + 25}" font-family="${FONT}" font-size="13" fill="${C.muted}">${esc(label)}</text>`;
  }
  // the capture itself, clipped to the frame's rounded bottom
  s += `<defs><clipPath id="${id}">
      <rect x="${x}" y="${iy}" width="${w}" height="${Math.max(0, ih - r)}"/>
      <rect x="${x}" y="${iy + ih - r * 2}" width="${w}" height="${r * 2}" rx="${r}"/>
    </clipPath></defs>`;
  s += `<image href="${b64(buf)}" x="${x}" y="${iy}" width="${w}" height="${ih}" clip-path="url(#${id})"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>`;

  return { svg: s, w, h, innerHeight: ih };
}

// heading block shared by every screenshot
function heading(title, sub, { x = 90, y = 106, size = 40, align = "start" } = {}) {
  let s = `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${C.text}" text-anchor="${align}">${esc(title)}</text>`;
  if (sub) {
    s += `<text x="${x}" y="${y + 40}" font-family="${FONT}" font-size="20" fill="${C.muted}" text-anchor="${align}">${esc(sub)}</text>`;
  }
  return s;
}

function caption(cx, y, text) {
  return `<text x="${cx}" y="${y}" font-family="${FONT}" font-size="16" fill="${C.blueDim}" text-anchor="middle">${esc(text)}</text>`;
}

// small pill used for feature strips / labels
function pill(x, y, text, { col = C.text, fill = C.cardFill, size = 16, ic, icCol = C.blue } = {}) {
  const pad = ic ? 52 : 30;
  const w = Math.round(pad + textW(text, size));
  let s = rrect(x, y, w, size + 20, (size + 20) / 2, fill, C.cardBorder, 1);
  if (ic) s += icon(ic, x + 13, y + 10, size + 1, icCol);
  s += `<text x="${x + (ic ? 38 : 14)}" y="${y + size + 5}" font-family="${FONT}" font-size="${size}" fill="${col}">${esc(text)}</text>`;
  return { svg: s, w };
}

// a centred row of "• label" items, spaced from measured text widths
function bulletRow(cx, y, items, { size = 16, gap = 40 } = {}) {
  const widths = items.map((t) => 18 + textW(t, size));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = cx - total / 2;
  let s = "";
  items.forEach((t, i) => {
    s += `<circle cx="${x + 4}" cy="${y - 5}" r="4" fill="${C.blue}"/>`;
    s += `<text x="${x + 18}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${C.muted}">${esc(t)}</text>`;
    x += widths[i] + gap;
  });
  return s;
}

function pillRow(x, y, items, opts = {}) {
  let s = "";
  let px = x;
  for (const it of items) {
    const p = pill(px, y, Array.isArray(it) ? it[1] : it, { ...opts, ic: Array.isArray(it) ? it[0] : undefined });
    s += p.svg;
    px += p.w + 12;
  }
  return { svg: s, w: px - x - 12 };
}

const SITE_URL = "demo.local:8899";

// ---- 1) MARQUEE 1400x560 ------------------------------------------------
{
  const W = 1400, H = 560;
  const tile = await logoTile(512);
  const ts = 150, tx = 100, ty = 116;
  let inner = "";
  inner += `<image href="${b64(tile)}" x="${tx}" y="${ty}" width="${ts}" height="${ts}" />`;
  const textX = tx + ts + 54;
  inner += `<text x="${textX}" y="${ty + 40}" font-family="${FONT}" font-size="25" font-weight="700" fill="${C.blue}" letter-spacing="2">JS-INJECTION</text>`;
  inner += `<text x="${textX}" y="${ty + 94}" font-family="${FONT}" font-size="43" font-weight="800" fill="${C.text}">JavaScript &amp; CSS Injection</text>`;
  inner += `<text x="${textX}" y="${ty + 134}" font-family="${FONT}" font-size="23" font-weight="500" fill="${C.muted}">+ AI Model Context Protocol bridge for Chromium</text>`;
  inner += pillRow(tx, 330, ["Manifest V3", "React 19", "MCP Bridge", "KO / EN"], { size: 17 }).svg;
  inner += `<text x="${tx}" y="${430}" font-family="${FONT}" font-size="18" fill="${C.blueDim}">Real rules, real pages — no data collected.</text>`;
  // real popup capture on the right
  const shot = await windowShot(960, 44, 340, "Js-Injection", SHOTS.popup, { kind: "title", maxInner: 452 });
  inner += shot.svg;
  await render("marquee-1400x560.png", W, H, inner);
}

// ---- 2) SMALL PROMO 440x280 ---------------------------------------------
{
  const W = 440, H = 280;
  const tile = await logoTile(256);
  const ts = 116;
  let inner = "";
  inner += `<image href="${b64(tile)}" x="${(W - ts) / 2}" y="40" width="${ts}" height="${ts}" />`;
  inner += `<text x="${W / 2}" y="206" font-family="${FONT}" font-size="34" font-weight="800" fill="${C.text}" text-anchor="middle">Js-Injection</text>`;
  inner += `<text x="${W / 2}" y="238" font-family="${FONT}" font-size="16" fill="${C.muted}" text-anchor="middle">JS / CSS Injection + AI MCP</text>`;
  await render("small-promo-440x280.png", W, H, inner);
}

// ---- 3) SCREENSHOT 1 — HERO: real page + the popup that drives it -------
{
  const W = 1280, H = 800;
  const py = 172;
  let inner = "";
  inner += heading("Your JavaScript, running on a real page", "Save a rule once — the extension applies it on every visit, automatically.", {
    x: W / 2,
    y: 96,
    align: "middle",
  });
  const page = await windowShot(90, py, 1100, `${SITE_URL}/`, SHOTS.live, { maxInner: 494 });
  inner += page.svg;
  // the toolbar popup sits over the page, the way Chrome actually renders it
  const pw = 330;
  const px = 90 + 1100 - pw - 26;
  const ppy = py + 58;
  inner += rrect(px + 7, ppy + 11, pw, Math.round(pw * 1.2) + 40, 16, "rgba(0,0,0,0.42)", "none");
  const popup = await windowShot(px, ppy, pw, "Js-Injection", SHOTS.popup, { kind: "title", maxInner: Math.round(pw * 1.2) });
  inner += popup.svg;
  const stripY = py + page.h + 34;
  const row = pillRow(0, stripY, [
    ["bolt", "Live CSS Sync"],
    ["unlock", "Unlock right-click"],
    ["layers", "CDN presets"],
    ["bridge", "AI MCP bridge"],
  ], { size: 17 });
  inner += `<g transform="translate(${(W - row.w) / 2},0)">${row.svg}</g>`;
  await render("screenshot-1-live-1280x800.png", W, H, inner);
}

// ---- 4) SCREENSHOT 2 — BEFORE / AFTER on the same page ------------------
{
  const W = 1280, H = 800;
  let inner = "";
  inner += heading("One rule, one visible difference", "The same page with the master switch off, then with the rule applied.", {
    x: W / 2,
    y: 96,
    align: "middle",
  });
  const cw = 556, gap = 46;
  const x0 = (W - (cw * 2 + gap)) / 2;
  const y = 222;
  const before = await windowShot(x0, y, cw, `${SITE_URL}/`, SHOTS.plain, { maxInner: 388 });
  const after = await windowShot(x0 + cw + gap, y, cw, `${SITE_URL}/`, SHOTS.live, { maxInner: 388 });
  inner += before.svg + after.svg;
  inner += `<text x="${x0 + cw / 2}" y="${y - 20}" font-family="${FONT}" font-size="19" font-weight="700" fill="${C.muted}" text-anchor="middle">Injections paused</text>`;
  inner += `<text x="${x0 + cw + gap + cw / 2}" y="${y - 20}" font-family="${FONT}" font-size="19" font-weight="700" fill="${C.blue}" text-anchor="middle">Rule applied</text>`;
  // arrow between the two frames
  const ay = y + before.h / 2;
  const ax = x0 + cw + gap / 2;
  inner += `<circle cx="${ax}" cy="${ay}" r="21" fill="${C.cardFill}" stroke="${C.cardBorder}" stroke-width="1"/>`;
  inner += `<path d="M${ax - 7} ${ay - 8} l9 8 -9 8" fill="none" stroke="${C.blue}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  inner += bulletRow(W / 2, 716, [
    "Dark theme injected as CSS",
    "Headings numbered by script",
    "Reading-time chip added",
  ]);
  inner += caption(W / 2, 762, "Actual captures from the built extension — nothing retouched");
  await render("screenshot-2-before-after-1280x800.png", W, H, inner);
}

// ---- 5) SCREENSHOT 3 — OPTIONS DASHBOARD -------------------------------
{
  const W = 1280, H = 800;
  let inner = "";
  inner += heading("Manage every rule from one dashboard", "Search, toggle, run on demand, export — plus the AI bridge and backups.", {
    x: W / 2,
    y: 96,
    align: "middle",
  });
  const shot = await windowShot(70, 172, 1140, "Js-Injection — Options", SHOTS.dashboard, { kind: "title", maxInner: 494 });
  inner += shot.svg;
  const row = pillRow(0, 172 + shot.h + 34, [
    ["search", "Search by name, URL or tag"],
    ["toggle", "Per-rule + master switch"],
    ["sync", "Popup / panel / options in sync"],
  ], { size: 17 });
  inner += `<g transform="translate(${(W - row.w) / 2},0)">${row.svg}</g>`;
  await render("screenshot-3-dashboard-1280x800.png", W, H, inner);
}

// ---- 6) SCREENSHOT 4 — RULE EDITOR + LIVE CSS SYNC --------------------
{
  const W = 1280, H = 800;
  let inner = "";
  inner += heading("Write a rule in seconds", "Name it, match a domain, paste your code. Wildcards and run-timing included.", {
    x: W / 2,
    y: 96,
    align: "middle",
  });
  const shot = await windowShot(70, 170, 764, "Js-Injection — Rule Editor", SHOTS.editor, { kind: "title", maxInner: 512 });
  inner += shot.svg;
  const notes = [
    ["globe", "Wildcard domains", "https://*.example.com/*"],
    ["sync", "Run timing", "document_start / end / idle"],
    ["layers", "CDN presets", "jQuery, Lodash, Axios, Tailwind"],
    ["code", "JS and CSS tabs", "Ace editor, autocompletion"],
  ];
  const nx = 876, nw = 334;
  notes.forEach(([ic, t, d], i) => {
    const ny = 170 + i * 100;
    inner += rrect(nx, ny, nw, 84, 18, C.cardFill, C.cardBorder, 1);
    inner += icon(ic, nx + 20, ny + 18, 24, C.blue);
    inner += `<text x="${nx + 56}" y="${ny + 36}" font-family="${FONT}" font-size="18" font-weight="700" fill="${C.text}">${esc(t)}</text>`;
    inner += `<text x="${nx + 20}" y="${ny + 68}" font-family="${MONO}" font-size="13" fill="${C.muted}">${esc(d)}</text>`;
  });
  // zoomed detail: the real Live CSS Sync checkbox from the editor's CSS tab
  const detailY = 600;
  const detail = await plainShot(nx, detailY, nw, SHOTS.editorCss, {
    crop: { left: 1470, top: 900, width: 330, height: 58 },
  });
  inner += detail.svg;
  inner += `<text x="${nx}" y="${detailY + detail.h + 34}" font-family="${FONT}" font-size="14.5" fill="${C.muted}">CSS edits reach the open tab in ~0.1s,</text>`;
  inner += `<text x="${nx}" y="${detailY + detail.h + 54}" font-family="${FONT}" font-size="14.5" fill="${C.muted}">with no page reload.</text>`;
  inner += caption(452, 170 + shot.h + 32, "Actual rule editor — the rule used in the screenshots above");
  await render("screenshot-4-editor-1280x800.png", W, H, inner);
}

// ---- 7) SCREENSHOT 5 — MCP BRIDGE --------------------------------------
{
  const W = 1280, H = 800;
  let inner = "";
  inner += heading("Let an AI agent drive your browser", "A local Model Context Protocol bridge over WebSocket — nothing leaves your machine.", {
    x: W / 2,
    y: 92,
    align: "middle",
  });
  // architecture row
  const boxes = [
    ["code", "AI Agent", "Claude · Cursor · Antigravity", C.purple],
    ["bridge", "MCP Bridge", "ws://localhost:3000/mcp", C.blue],
    ["grid", "Your Browser", "Chrome · Whale", C.green],
  ];
  const bw = 300, bh = 132, gap = 84, by = 176;
  const x0 = (W - (bw * 3 + gap * 2)) / 2;
  boxes.forEach(([ic, t, d, col], i) => {
    const x = x0 + i * (bw + gap);
    inner += rrect(x, by, bw, bh, 20, C.cardFill, col, 1.5);
    inner += icon(ic, x + bw / 2 - 15, by + 20, 30, col);
    inner += `<text x="${x + bw / 2}" y="${by + 84}" font-family="${FONT}" font-size="23" font-weight="700" fill="${C.text}" text-anchor="middle">${esc(t)}</text>`;
    inner += `<text x="${x + bw / 2}" y="${by + 110}" font-family="${FONT}" font-size="14.5" fill="${C.muted}" text-anchor="middle">${esc(d)}</text>`;
    if (i < 2) {
      const lx = x + bw, ly = by + bh / 2;
      inner += `<path d="M${lx + 12} ${ly}h${gap - 26}" stroke="${C.blue}" stroke-width="2.5" stroke-dasharray="2 8" stroke-linecap="round"/>`;
      inner += `<path d="M${lx + gap - 20} ${ly - 7} l10 7 -10 7" fill="none" stroke="${C.blue}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  });
  // real MCP panel, cropped straight out of the dashboard capture
  const pw = 480, ph = 357;
  const panel = await sharp(SHOTS.dashboard)
    .extract({ left: 2030, top: 110, width: 700, height: 520 })
    .resize(pw, ph, { fit: "fill" })
    .png()
    .toBuffer();
  const px = 100, py = 364;
  inner += rrect(px - 7, py - 7, pw + 14, ph + 14, 20, "rgba(255,255,255,0.055)", C.cardBorder, 1);
  inner += `<defs><clipPath id="mcpPanel"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12"/></clipPath></defs>`;
  inner += `<image href="${b64(panel)}" x="${px}" y="${py}" width="${pw}" height="${ph}" clip-path="url(#mcpPanel)"/>`;
  inner += caption(px + pw / 2, py + ph + 36, "Actual MCP panel in the options dashboard");
  // config snippet + tool list
  const cx = 660, cy = 364, cw = 530;
  inner += rrect(cx, cy, cw, 176, 16, "#0a1424", C.cardBorder, 1);
  inner += `<text x="${cx + 24}" y="${cy + 32}" font-family="${FONT}" font-size="14" fill="${C.muted}">claude_desktop_config.json</text>`;
  const code = [
    '{ "mcpServers": {',
    '    "js-injection": {',
    '      "command": "npx",',
    '      "args": ["-y", "js-injection-mcp"] } } }',
  ];
  code.forEach((l, i) => {
    // xml:space keeps the JSON indentation from collapsing
    inner += `<text xml:space="preserve" x="${cx + 24}" y="${cy + 66 + i * 26}" font-family="${MONO}" font-size="16" fill="${C.cyan}">${esc(l)}</text>`;
  });
  const tools = ["listRules", "addRule", "deleteRule", "injectScriptOnActiveTab"];
  inner += `<text x="${cx}" y="${cy + 216}" font-family="${FONT}" font-size="16" fill="${C.muted}">Tools exposed to the agent</text>`;
  let tx = cx;
  let ty = cy + 236;
  for (const t of tools) {
    const p = pill(tx, ty, t, { size: 15, col: C.text });
    if (tx + p.w > cx + cw) {
      tx = cx;
      ty += 46;
      inner += pill(tx, ty, t, { size: 15, col: C.text }).svg;
      tx += p.w + 10;
    } else {
      inner += p.svg;
      tx += p.w + 10;
    }
  }
  await render("screenshot-5-mcp-1280x800.png", W, H, inner);
}

console.log("\nAll store images written to STOREIMG/store/");
