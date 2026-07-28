/**
 * Chrome Web Store / Whale Store listing image generator.
 * Composes the real UI captures in STOREIMG/raw (produced by scripts/capture-ui.mjs)
 * into 4 screenshots (1280x800), a marquee promo tile (1400x560) and a small
 * promo tile (440x280) via SVG -> sharp PNG.
 * English copy only (font-safe, no emoji). Brand blue #336699 sampled from the logo.
 */
import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, "..");
const RAW = resolve(ROOT, "STOREIMG/raw");
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
    case "bolt":
      return S(`<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="${col}" fill-opacity="0.18"/>`);
    case "unlock":
      return S(`<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0"/><circle cx="12" cy="16" r="1.4" fill="${col}"/>`);
    default:
      return "";
  }
}

const b64 = (buf) => "data:image/png;base64," + buf.toString("base64");

/**
 * Loads a raw capture, optionally cropping it by fractions of its own size
 * (so it stays correct whatever pixel density it was captured at), and returns
 * the buffer plus the source aspect ratio.
 */
async function capture(name, crop) {
  let img = sharp(resolve(RAW, name));
  const { width, height } = await img.metadata();
  if (crop) {
    const left = Math.round(width * (crop.x ?? 0));
    const top = Math.round(height * (crop.y ?? 0));
    const w = Math.round(width * (crop.w ?? 1));
    const h = Math.round(height * (crop.h ?? 1));
    img = img.extract({ left, top, width: Math.min(w, width - left), height: Math.min(h, height - top) });
  }
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  return { buf, ratio: meta.width / meta.height };
}

/**
 * Places a capture inside a box, contain-fit and centered, in a rounded frame.
 * `box.align: "top"` pins it to the top of the box instead of centering it.
 */
async function screen(cap, box, id) {
  let w = box.w;
  let h = w / cap.ratio;
  if (h > box.h) {
    h = box.h;
    w = h * cap.ratio;
  }
  const x = Math.round(box.x + (box.w - w) / 2);
  const y = Math.round(box.align === "top" ? box.y : box.y + (box.h - h) / 2);
  w = Math.round(w);
  h = Math.round(h);
  const resized = await sharp(cap.buf).resize(w * 2, h * 2, { fit: "fill" }).png().toBuffer();
  return {
    x, y, w, h,
    svg:
      `<defs><clipPath id="clip${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/></clipPath></defs>` +
      rrect(x - 7, y - 7, w + 14, h + 14, 19, "rgba(255,255,255,0.06)", C.cardBorder, 1) +
      `<image href="${b64(resized)}" x="${x}" y="${y}" width="${w}" height="${h}" clip-path="url(#clip${id})"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>`,
  };
}

const heading = (x, y, s) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="40" font-weight="800" fill="${C.text}">${esc(s)}</text>`;
const sub = (x, y, s) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="20" fill="${C.muted}">${esc(s)}</text>`;
const caption = (cx, y, s) =>
  `<text x="${cx}" y="${y}" font-family="${FONT}" font-size="16" fill="${C.blueDim}" text-anchor="middle">${esc(s)}</text>`;

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
  return sharp(Buffer.from(tileSvg)).composite([{ input: logo, gravity: "center" }]).png().toBuffer();
}

async function render(name, w, h, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg(w, h)}${inner}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(OUT, name));
  console.log("  ✓", name, `${w}x${h}`);
}

// ---- main ----------------------------------------------------------------
const TILE = b64(await logoTile(512));

// ============ 1) MARQUEE 1400x560 ============
{
  const W = 1400, H = 560;
  const ts = 190, tx = 120, ty = (H - ts) / 2;
  const textX = tx + ts + 70;
  let inner = `<image href="${TILE}" x="${tx}" y="${ty}" width="${ts}" height="${ts}" />`;
  inner += `<text x="${textX}" y="${ty + 60}" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.blue}" letter-spacing="2">JS-INJECTION</text>`;
  inner += `<text x="${textX}" y="${ty + 128}" font-family="${FONT}" font-size="60" font-weight="800" fill="${C.text}">JavaScript &amp; CSS Injection</text>`;
  inner += `<text x="${textX}" y="${ty + 176}" font-family="${FONT}" font-size="30" font-weight="500" fill="${C.muted}">+ AI Model Context Protocol bridge for Chromium</text>`;
  let px = textX;
  const py = ty + ts - 4;
  for (const p of ["Manifest V3", "React 19", "MCP Bridge", "KO / EN"]) {
    const pw = 34 + p.length * 11;
    inner += rrect(px, py, pw, 40, 20, C.cardFill, C.cardBorder, 1);
    inner += `<text x="${px + pw / 2}" y="${py + 26}" font-family="${FONT}" font-size="17" fill="${C.text}" text-anchor="middle">${esc(p)}</text>`;
    px += pw + 14;
  }
  await render("marquee-1400x560.png", W, H, inner);
}

// ============ 2) SMALL PROMO 440x280 ============
{
  const W = 440, H = 280, ts = 120;
  let inner = `<image href="${TILE}" x="${(W - ts) / 2}" y="42" width="${ts}" height="${ts}" />`;
  inner += `<text x="${W / 2}" y="212" font-family="${FONT}" font-size="34" font-weight="800" fill="${C.text}" text-anchor="middle">Js-Injection</text>`;
  inner += `<text x="${W / 2}" y="244" font-family="${FONT}" font-size="16" fill="${C.muted}" text-anchor="middle">JS / CSS Injection + AI MCP</text>`;
  await render("small-promo-440x280.png", W, H, inner);
}

// ============ 3) SCREENSHOT 1 — HERO + REAL POPUP ============
{
  const W = 1280, H = 800;
  const popup = await capture("popup.png", { h: 0.8 }); // drops empty space below the last rule
  const frame = await screen(popup, { x: 760, y: 96, w: 450, h: 610 }, "pop");

  let inner = `<image href="${TILE}" x="80" y="60" width="104" height="104" />`;
  inner += `<text x="204" y="102" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.blue}" letter-spacing="2">JS-INJECTION</text>`;
  inner += `<text x="204" y="148" font-family="${FONT}" font-size="27" font-weight="600" fill="${C.muted}">Chrome &amp; Whale extension</text>`;
  inner += `<text x="80" y="248" font-family="${FONT}" font-size="50" font-weight="800" fill="${C.text}">Inject JS &amp; CSS</text>`;
  inner += `<text x="80" y="306" font-family="${FONT}" font-size="50" font-weight="800" fill="${C.text}">into any site</text>`;
  inner += sub(80, 352, "Save a rule once — it runs automatically on every match.");

  const rows = [
    ["bridge", C.purple, "AI MCP Bridge", "Let Claude, Cursor or Antigravity drive the browser"],
    ["bolt", C.cyan, "Live CSS Sync", "CSS changes land instantly — no page reload"],
    ["unlock", C.green, "Unlock Right-Click", "Bypass copy, selection and context-menu locks"],
  ];
  rows.forEach(([ic, col, t, d], i) => {
    const y = 412 + i * 98;
    inner += rrect(80, y, 56, 56, 15, "rgba(255,255,255,0.05)", "none");
    inner += icon(ic, 94, y + 14, 28, col);
    inner += `<text x="156" y="${y + 26}" font-family="${FONT}" font-size="24" font-weight="700" fill="${C.text}">${esc(t)}</text>`;
    inner += `<text x="156" y="${y + 52}" font-family="${FONT}" font-size="17" fill="${C.muted}">${esc(d)}</text>`;
  });
  inner += `<text x="80" y="742" font-family="${FONT}" font-size="17" fill="${C.blueDim}">Manifest V3 · React 19 · Korean &amp; English · No data collected</text>`;
  inner += frame.svg;
  inner += caption(frame.x + frame.w / 2, frame.y + frame.h + 32, "Toolbar popup");
  await render("screenshot-1-hero-1280x800.png", W, H, inner);
}

// ============ 4) SCREENSHOT 2 — REAL OPTIONS DASHBOARD ============
{
  const W = 1280, H = 800;
  // trims the outer page margin and the empty area under the shorter column
  const dash = await capture("options.png", { x: 0.035, y: 0.05, w: 0.94, h: 0.58 });
  const frame = await screen(dash, { x: 70, y: 176, w: 1140, h: 540 }, "dash");

  let inner = heading(80, 96, "Everything in one dashboard");
  inner += sub(80, 134, "Rule list, live status and the AI bridge — side by side.");
  inner += frame.svg;
  inner += caption(W / 2, frame.y + frame.h + 44, "Actual options page — 4 rules, master switch on, MCP bridge ready");
  await render("screenshot-2-dashboard-1280x800.png", W, H, inner);
}

// ============ 5) SCREENSHOT 3 — REAL RULE EDITOR + MCP CARD ============
{
  const W = 1280, H = 800;
  const editor = await capture("editor-css.png", { h: 0.6 });
  const mcp = await capture("mcp-card.png");
  const ef = await screen(editor, { x: 70, y: 196, w: 700, h: 520, align: "top" }, "ed");
  const mf = await screen(mcp, { x: 830, y: 196, w: 330, h: 520, align: "top" }, "mcp");

  let inner = heading(80, 96, "Write a rule — or let an AI write it");
  inner += sub(80, 134, "Domain matching, tags, run-at timing, JS + CSS, live CSS preview.");
  inner += ef.svg + mf.svg;
  inner += caption(ef.x + ef.w / 2, ef.y + ef.h + 40, "Rule editor with Live CSS Sync");
  inner += caption(mf.x + mf.w / 2, mf.y + mf.h + 40, "MCP bridge setup");
  await render("screenshot-3-editor-1280x800.png", W, H, inner);
}

// ============ 6) SCREENSHOT 4 — REAL INJECTION ON A PAGE ============
{
  const W = 1280, H = 800;
  const page = await capture("in-action.png");
  const frame = await screen(page, { x: 120, y: 176, w: 1040, h: 560 }, "act");

  let inner = `<text x="${W / 2}" y="92" font-family="${FONT}" font-size="40" font-weight="800" fill="${C.text}" text-anchor="middle">Your code, running on the page</text>`;
  inner += `<text x="${W / 2}" y="132" font-family="${FONT}" font-size="20" fill="${C.muted}" text-anchor="middle">A dark-reading rule injecting CSS and JS at document_start.</text>`;
  inner += frame.svg;
  inner += caption(W / 2, frame.y + frame.h + 44, "Actual capture — the rule fires on page load, no clicks needed");
  await render("screenshot-4-in-action-1280x800.png", W, H, inner);
}

// ============ 7) SCREENSHOT 5 — BILINGUAL UI ============
{
  const W = 1280, H = 800;
  const crop = { h: 0.8 }; // same trim as the hero popup
  const en = await capture("popup.png", crop);
  const ko = await capture("popup-ko.png", crop);
  const ef = await screen(en, { x: 130, y: 210, w: 480, h: 470, align: "top" }, "en");
  const kf = await screen(ko, { x: 670, y: 210, w: 480, h: 470, align: "top" }, "ko");

  let inner = `<text x="${W / 2}" y="96" font-family="${FONT}" font-size="40" font-weight="800" fill="${C.text}" text-anchor="middle">English and Korean, built in</text>`;
  inner += `<text x="${W / 2}" y="136" font-family="${FONT}" font-size="20" fill="${C.muted}" text-anchor="middle">Follows your browser language on install — switch anytime from the header.</text>`;
  inner += ef.svg + kf.svg;
  inner += caption(ef.x + ef.w / 2, ef.y + ef.h + 40, "English — every locale outside Korean");
  inner += caption(kf.x + kf.w / 2, kf.y + kf.h + 40, "한국어 — Korean browsers");
  await render("screenshot-5-languages-1280x800.png", W, H, inner);
}

console.log("\nStore images written to STOREIMG/store/");
