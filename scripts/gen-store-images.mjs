/**
 * Chrome Web Store / Whale Store listing image generator.
 * Renders marketing screenshots (1280x800), a marquee promo tile (1400x560),
 * and a small promo tile (440x280) via SVG -> sharp PNG.
 * English copy only (font-safe, no emoji). Brand blue #336699 sampled from the logo.
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const OUT = resolve(ROOT, "STOREIMG/store");
mkdirSync(OUT, { recursive: true });

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
};
const FONT = "sans-serif";

// ---- helpers -------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

async function b64(buf) {
  return "data:image/png;base64," + buf.toString("base64");
}

// ---- feature data --------------------------------------------------------
const FEATURES = [
  ["bridge", "AI MCP Bridge", "Let Claude, Cursor & Antigravity drive your browser via WebSocket."],
  ["toggle", "Master Switch", "One-click global on/off plus per-rule toggles."],
  ["bolt", "Live CSS Sync", "0.1s real-time CSS reload — no page refresh."],
  ["unlock", "Unlock Right-Click", "Bypass copy / selection / context-menu locks."],
  ["globe", "i18n: KO / EN", "Full Korean & English with instant switching."],
  ["layers", "CDN Presets", "One-click jQuery, Lodash, Axios, Day.js, Tailwind."],
  ["grid", "Options Dashboard", "Wide responsive dashboard to manage every rule."],
  ["sync", "3-Way Realtime Sync", "Popup, Side Panel & Options stay in sync."],
];

async function render(name, w, h, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg(w, h)}${inner}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(OUT, name));
  console.log("  ✓", name, `${w}x${h}`);
}

// ---- main ----------------------------------------------------------------
const tile = await logoTile(512);
const TILE = await b64(tile);

// small chrome-window mock used in hero/editor screenshots
function windowMock(x, y, w, h, title, bodyInner) {
  return `
    ${rrect(x, y, w, h, 14, "#0e1a2e", C.cardBorder, 1)}
    ${rrect(x, y, w, 40, 14, "#152640", "none")}
    <rect x="${x}" y="${y + 26}" width="${w}" height="14" fill="#152640"/>
    <circle cx="${x + 20}" cy="${y + 20}" r="5" fill="#e05561"/>
    <circle cx="${x + 38}" cy="${y + 20}" r="5" fill="#e0a13a"/>
    <circle cx="${x + 56}" cy="${y + 20}" r="5" fill="#4caf82"/>
    <text x="${x + 78}" y="${y + 25}" font-family="${FONT}" font-size="14" fill="${C.muted}">${esc(title)}</text>
    ${bodyInner(x, y + 40, w, h - 40)}`;
}

// ============ 1) MARQUEE 1400x560 ============
{
  const W = 1400, H = 560;
  const ts = 190, tx = 120, ty = (H - ts) / 2;
  let inner = "";
  inner += `<image href="${TILE}" x="${tx}" y="${ty}" width="${ts}" height="${ts}" />`;
  // subtle ring behind tile
  const cx = tx + ts / 2, cy = ty + ts / 2;
  const textX = tx + ts + 70;
  inner += `<text x="${textX}" y="${ty + 60}" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.blue}" letter-spacing="2">JS-INJECTION</text>`;
  inner += `<text x="${textX}" y="${ty + 128}" font-family="${FONT}" font-size="60" font-weight="800" fill="${C.text}">JavaScript &amp; CSS Injection</text>`;
  inner += `<text x="${textX}" y="${ty + 176}" font-family="${FONT}" font-size="30" font-weight="500" fill="${C.muted}">+ AI Model Context Protocol bridge for Chromium</text>`;
  // pills
  const pills = ["Manifest V3", "React 19", "MCP Bridge", "KO / EN"];
  let px = textX;
  const py = ty + ts - 4;
  for (const p of pills) {
    const pw = 34 + p.length * 11;
    inner += rrect(px, py, pw, 40, 20, C.cardFill, C.cardBorder, 1);
    inner += `<text x="${px + pw / 2}" y="${py + 26}" font-family="${FONT}" font-size="17" fill="${C.text}" text-anchor="middle">${esc(p)}</text>`;
    px += pw + 14;
  }
  await render("marquee-1400x560.png", W, H, inner);
}

// ============ 2) SMALL PROMO 440x280 ============
{
  const W = 440, H = 280;
  const ts = 120;
  let inner = "";
  inner += `<image href="${TILE}" x="${(W - ts) / 2}" y="42" width="${ts}" height="${ts}" />`;
  inner += `<text x="${W / 2}" y="212" font-family="${FONT}" font-size="34" font-weight="800" fill="${C.text}" text-anchor="middle">Js-Injection</text>`;
  inner += `<text x="${W / 2}" y="244" font-family="${FONT}" font-size="16" fill="${C.muted}" text-anchor="middle">JS / CSS Injection + AI MCP</text>`;
  await render("small-promo-440x280.png", W, H, inner);
}

// ============ 3) SCREENSHOT 1 — HERO 1280x800 ============
{
  const W = 1280, H = 800;
  const ts = 150;
  let inner = "";
  inner += `<image href="${TILE}" x="90" y="90" width="${ts}" height="${ts}" />`;
  inner += `<text x="270" y="150" font-family="${FONT}" font-size="26" font-weight="700" fill="${C.blue}" letter-spacing="2">JS-INJECTION</text>`;
  inner += `<text x="270" y="210" font-family="${FONT}" font-size="52" font-weight="800" fill="${C.text}">Inject JS &amp; CSS into any site</text>`;
  inner += `<text x="90" y="300" font-family="${FONT}" font-size="24" fill="${C.muted}">Automate the browser with your own scripts — and let a local AI agent drive it.</text>`;
  // three highlight cards
  const cards = [
    ["bridge", "AI MCP Bridge", "Claude / Cursor control"],
    ["bolt", "Live CSS Sync", "0.1s hot reload"],
    ["unlock", "Unlock Right-Click", "Beat copy locks"],
  ];
  const cw = 360, ch = 300, gap = 40, cy = 360;
  cards.forEach(([ic, t, d], i) => {
    const x = 90 + i * (cw + gap);
    inner += rrect(x, cy, cw, ch, 22, C.cardFill, C.cardBorder, 1);
    inner += rrect(x + 34, cy + 40, 68, 68, 18, "rgba(74,144,217,0.14)", "none");
    inner += icon(ic, x + 52, cy + 58, 32, C.blue);
    inner += `<text x="${x + 34}" y="${cy + 168}" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.text}">${esc(t)}</text>`;
    inner += `<text x="${x + 34}" y="${cy + 210}" font-family="${FONT}" font-size="20" fill="${C.muted}">${esc(d)}</text>`;
  });
  inner += `<text x="90" y="760" font-family="${FONT}" font-size="19" fill="${C.blueDim}">Manifest V3 · React 19 · Vite 6 · Chrome &amp; Whale · No data collected</text>`;
  await render("screenshot-1-hero-1280x800.png", W, H, inner);
}

// ============ 4) SCREENSHOT 2 — FEATURE GRID 1280x800 ============
{
  const W = 1280, H = 800;
  let inner = "";
  inner += `<text x="90" y="110" font-family="${FONT}" font-size="42" font-weight="800" fill="${C.text}">Everything in one extension</text>`;
  inner += `<text x="90" y="150" font-family="${FONT}" font-size="21" fill="${C.muted}">Eight focused tools for power users and developers.</text>`;
  const cols = 4, rows = 2, cw = 265, ch = 260, gx = 24, gy = 24, x0 = 90, y0 = 200;
  const accents = [C.blue, C.purple, C.cyan, C.green, C.blue, C.purple, C.cyan, C.green];
  FEATURES.forEach(([ic, t, d], i) => {
    const cx = x0 + (i % cols) * (cw + gx);
    const cyy = y0 + Math.floor(i / cols) * (ch + gy);
    const col = accents[i];
    inner += rrect(cx, cyy, cw, ch, 20, C.cardFill, C.cardBorder, 1);
    inner += rrect(cx + 26, cyy + 28, 58, 58, 16, "rgba(255,255,255,0.05)", "none");
    inner += icon(ic, cx + 41, cyy + 43, 28, col);
    // shrink long titles so they never overflow the card (usable width = cw - 52)
    const tf = Math.min(22, Math.floor((cw - 52) / (t.length * 0.6)));
    inner += `<text x="${cx + 26}" y="${cyy + 126}" font-family="${FONT}" font-size="${tf}" font-weight="700" fill="${C.text}">${esc(t)}</text>`;
    // wrap description ~ 26 chars
    const words = d.split(" ");
    let line = "", ln = 0;
    for (const w of words) {
      if ((line + " " + w).trim().length > 25) {
        inner += `<text x="${cx + 26}" y="${cyy + 162 + ln * 26}" font-family="${FONT}" font-size="16" fill="${C.muted}">${esc(line.trim())}</text>`;
        line = w; ln++;
      } else line += " " + w;
    }
    if (line.trim()) inner += `<text x="${cx + 26}" y="${cyy + 162 + ln * 26}" font-family="${FONT}" font-size="16" fill="${C.muted}">${esc(line.trim())}</text>`;
  });
  await render("screenshot-2-features-1280x800.png", W, H, inner);
}

// ============ 5) SCREENSHOT 3 — MCP BRIDGE 1280x800 ============
{
  const W = 1280, H = 800;
  let inner = "";
  inner += `<text x="90" y="110" font-family="${FONT}" font-size="42" font-weight="800" fill="${C.text}">AI drives your browser</text>`;
  inner += `<text x="90" y="150" font-family="${FONT}" font-size="21" fill="${C.muted}">A local Model Context Protocol bridge — nothing leaves your machine.</text>`;
  // three node boxes connected
  const boxes = [
    ["AI Agent", "Claude · Cursor · Antigravity", C.purple],
    ["MCP Bridge", "ws://localhost:3000", C.blue],
    ["Your Browser", "Chrome · Whale", C.green],
  ];
  const bw = 320, bh = 200, gap = 110, y = 300;
  const totalW = bw * 3 + gap * 2;
  const x0 = (W - totalW) / 2;
  boxes.forEach(([t, d, col], i) => {
    const x = x0 + i * (bw + gap);
    inner += rrect(x, y, bw, bh, 22, C.cardFill, col, 1.5);
    inner += rrect(x + bw / 2 - 34, y + 34, 68, 68, 18, "rgba(255,255,255,0.05)", "none");
    inner += icon(i === 1 ? "bridge" : i === 0 ? "code" : "grid", x + bw / 2 - 16, y + 50, 32, col);
    inner += `<text x="${x + bw / 2}" y="${y + 148}" font-family="${FONT}" font-size="26" font-weight="700" fill="${C.text}" text-anchor="middle">${esc(t)}</text>`;
    inner += `<text x="${x + bw / 2}" y="${y + 180}" font-family="${FONT}" font-size="16" fill="${C.muted}" text-anchor="middle">${esc(d)}</text>`;
    if (i < 2) {
      const lx = x + bw, lx2 = x + bw + gap;
      const ly = y + bh / 2;
      inner += `<path d="M${lx + 12} ${ly}h${gap - 24}" stroke="${C.blue}" stroke-width="2.5" stroke-dasharray="2 8" stroke-linecap="round"/>`;
      inner += `<path d="M${lx2 - 18} ${ly - 7} l10 7 -10 7" fill="none" stroke="${C.blue}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  });
  // config snippet
  const bx = (W - 760) / 2, by = 580, bwid = 760, bhei = 150;
  inner += rrect(bx, by, bwid, bhei, 16, "#0a1424", C.cardBorder, 1);
  const code = ['{  "mcpServers": {', '    "js-injection": { "command": "npx",', '                      "args": ["-y", "js-injection-mcp"] } } }'];
  code.forEach((l, i) => {
    inner += `<text x="${bx + 28}" y="${by + 44 + i * 34}" font-family="monospace" font-size="19" fill="${C.cyan}">${esc(l)}</text>`;
  });
  await render("screenshot-3-mcp-1280x800.png", W, H, inner);
}

// ============ 6) SCREENSHOT 4 — EDITOR MOCK 1280x800 ============
{
  const W = 1280, H = 800;
  let inner = "";
  inner += `<text x="90" y="110" font-family="${FONT}" font-size="42" font-weight="800" fill="${C.text}">Write a rule in seconds</text>`;
  inner += `<text x="90" y="150" font-family="${FONT}" font-size="21" fill="${C.muted}">Match a domain, paste your code, save. It runs automatically.</text>`;
  inner += windowMock(90, 200, W - 180, 540, "Js-Injection — Rule Editor", (x, y, w, h) => {
    let b = "";
    b += `<text x="${x + 30}" y="${y + 44}" font-family="${FONT}" font-size="16" fill="${C.blue}">Rule name</text>`;
    b += rrect(x + 30, y + 58, w - 60, 44, 10, "rgba(255,255,255,0.04)", C.cardBorder, 1);
    b += `<text x="${x + 44}" y="${y + 86}" font-family="${FONT}" font-size="17" fill="${C.text}">Naver dark tweak</text>`;
    b += `<text x="${x + 30}" y="${y + 138}" font-family="${FONT}" font-size="16" fill="${C.blue}">Target domain</text>`;
    b += rrect(x + 30, y + 152, w - 60, 44, 10, "rgba(255,255,255,0.04)", C.cardBorder, 1);
    b += `<text x="${x + 44}" y="${y + 180}" font-family="${FONT}" font-size="17" fill="${C.text}">https://www.naver.com</text>`;
    b += `<text x="${x + 30}" y="${y + 232}" font-family="${FONT}" font-size="16" fill="${C.blue}">Code</text>`;
    b += rrect(x + 30, y + 246, w - 60, 150, 10, "#0a1424", C.cardBorder, 1);
    const lines = ['document.body.style.filter = "invert(1) hue-rotate(180deg)";', 'document.title = "[dark] " + document.title;', 'console.log("[Js-Injection] rule applied");'];
    lines.forEach((l, i) => {
      b += `<text x="${x + 30 + 40}" y="${y + 284 + i * 34}" font-family="monospace" font-size="17" fill="${["#8fd3ff", "#c9a7ff", "#8fe3b0"][i]}">${esc(l)}</text>`;
      b += `<text x="${x + 30 + 14}" y="${y + 284 + i * 34}" font-family="monospace" font-size="17" fill="${C.muted}">${i + 1}</text>`;
    });
    b += rrect(x + w - 210, y + 420, 180, 48, 12, C.purple, "none");
    b += `<text x="${x + w - 120}" y="${y + 450}" font-family="${FONT}" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">Save rule</text>`;
    return b;
  });
  await render("screenshot-4-editor-1280x800.png", W, H, inner);
}

// ============ 7) SCREENSHOT 5 — REAL USAGE (injection running) ============
{
  const W = 1280, H = 800;
  // real capture: extension popup + injected alert() firing on naver.com
  const shotW = 1000, shotH = 625; // keeps the original 1.6 aspect ratio
  const sx = (W - shotW) / 2, sy = 150;
  const raw = await sharp(resolve(ROOT, "STOREIMG/제목 없음.png"))
    .resize(shotW, shotH, { fit: "fill" })
    .png()
    .toBuffer();
  let inner = "";
  inner += `<text x="${W / 2}" y="72" font-family="${FONT}" font-size="40" font-weight="800" fill="${C.text}" text-anchor="middle">Your code, running on a real site</text>`;
  inner += `<text x="${W / 2}" y="112" font-family="${FONT}" font-size="20" fill="${C.muted}" text-anchor="middle">Save a rule once — it fires automatically on every visit.</text>`;
  inner += `<defs><clipPath id="shotClip"><rect x="${sx}" y="${sy}" width="${shotW}" height="${shotH}" rx="14"/></clipPath></defs>`;
  inner += `<rect x="${sx - 6}" y="${sy - 6}" width="${shotW + 12}" height="${shotH + 12}" rx="20" fill="rgba(255,255,255,0.06)" stroke="${C.cardBorder}" stroke-width="1"/>`;
  inner += `<image href="${await b64(raw)}" x="${sx}" y="${sy}" width="${shotW}" height="${shotH}" clip-path="url(#shotClip)"/>`;
  inner += `<rect x="${sx}" y="${sy}" width="${shotW}" height="${shotH}" rx="14" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>`;
  inner += `<text x="${W / 2}" y="${sy + shotH + 44}" font-family="${FONT}" font-size="17" fill="${C.blueDim}" text-anchor="middle">Actual capture — rule editor open, injected script executing on the page</text>`;
  await render("screenshot-5-in-action-1280x800.png", W, H, inner);
}

// ============ 8) SCREENSHOT 6 — REAL POPUP (rule list) ============
{
  const W = 1280, H = 800;
  const scale = 1.45;
  const pw = Math.round(331 * scale), ph = Math.round(360 * scale);
  const px = 720, py = 180;
  const raw = await sharp(resolve(ROOT, "STOREIMG/제목 없음2.png"))
    .resize(pw, ph, { fit: "fill" })
    .png()
    .toBuffer();
  let inner = "";
  inner += `<text x="90" y="140" font-family="${FONT}" font-size="42" font-weight="800" fill="${C.text}">Manage every rule</text>`;
  inner += `<text x="90" y="184" font-family="${FONT}" font-size="21" fill="${C.muted}">from the toolbar popup</text>`;
  const bullets = [
    ["code", "Add rules per domain", "Unlimited rules, wildcards supported"],
    ["toggle", "Delete or edit instantly", "Every rule listed at a glance"],
    ["layers", "Backup & restore", "Export and import your whole setup"],
  ];
  bullets.forEach(([ic, t, d], i) => {
    const by = 270 + i * 130;
    inner += rrect(90, by, 54, 54, 15, "rgba(74,144,217,0.14)", "none");
    inner += icon(ic, 105, by + 15, 26, C.blue);
    inner += `<text x="166" y="${by + 26}" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.text}">${esc(t)}</text>`;
    inner += `<text x="166" y="${by + 56}" font-family="${FONT}" font-size="17" fill="${C.muted}">${esc(d)}</text>`;
  });
  inner += `<defs><clipPath id="popClip"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12"/></clipPath></defs>`;
  inner += `<rect x="${px - 6}" y="${py - 6}" width="${pw + 12}" height="${ph + 12}" rx="18" fill="rgba(255,255,255,0.06)" stroke="${C.cardBorder}" stroke-width="1"/>`;
  inner += `<image href="${await b64(raw)}" x="${px}" y="${py}" width="${pw}" height="${ph}" clip-path="url(#popClip)"/>`;
  inner += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>`;
  inner += `<text x="${px + pw / 2}" y="${py + ph + 42}" font-family="${FONT}" font-size="17" fill="${C.blueDim}" text-anchor="middle">Actual toolbar popup</text>`;
  await render("screenshot-6-popup-1280x800.png", W, H, inner);
}

console.log("\nAll store images written to STOREIMG/store/");
