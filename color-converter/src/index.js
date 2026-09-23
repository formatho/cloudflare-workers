// Privacy-First Color Converter API — formatho.com
// HEX / RGB / HSL in, every format out. No tracking, no data collection.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/color-converter';
const HOST = 'https://color-converter-formatho.filesformatho.workers.dev';

// --- parsing -----------------------------------------------------------

function parseHex(s) {
  const m = s.match(/^#?([0-9a-f]{3,8})$/i);
  if (!m) return null;
  let h = m[1];
  let a = 1;
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map(c => c + c).join('');
  }
  if (h.length === 8) { a = parseInt(h.slice(6, 8), 16) / 255; h = h.slice(0, 6); }
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a };
}

function parseFunctional(s, prefix) {
  // rgb(1,2,3) / rgb(1 2 3 / 0.5) / rgba(...) / hsl(30,100%,50%) ...
  const re = new RegExp(`^${prefix}a?\\(\\s*([0-9.]+%?)\\s*[, ]\\s*([0-9.]+%?)\\s*[, ]\\s*([0-9.]+%?)(?:\\s*[/,]\\s*([0-9.]+%?))?\\s*\\)$`, 'i');
  const m = s.match(re);
  if (!m) return null;
  const num = (v, isPct) => v === undefined ? undefined : (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v));
  return { c1: m[1], c2: m[2], c3: m[3], a: m[4] === undefined ? 1 : num(m[4], true) };
}

function parseColor(input) {
  const s = input.trim().toLowerCase();
  let rgb = null, format = null, hslInput = null;

  const hex = parseHex(s);
  if (hex) return { ...hex, format: 'hex' };

  let f = parseFunctional(s, 'rgb');
  if (f) {
    const chan = (v) => v.endsWith('%') ? Math.round(parseFloat(v) / 100 * 255) : Math.round(parseFloat(v));
    rgb = { r: chan(f.c1), g: chan(f.c2), b: chan(f.c3), a: f.a };
    format = 'rgb';
  } else if ((f = parseFunctional(s, 'hsl'))) {
    const h = ((parseFloat(f.c1) % 360) + 360) % 360;
    const sat = f.c2.endsWith('%') ? parseFloat(f.c2) / 100 : parseFloat(f.c2);
    const lig = f.c3.endsWith('%') ? parseFloat(f.c3) / 100 : parseFloat(f.c3);
    rgb = { ...hslToRgb(h, sat, lig), a: f.a };
    format = 'hsl';
    hslInput = { h, s: sat, l: lig };
  }

  if (!rgb) {
    // bare "r,g,b" triple
    const m = s.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    if (m) {
      rgb = { r: +m[1], g: +m[2], b: +m[3], a: 1 };
      format = 'rgb';
    }
  }
  if (!rgb) return null;

  for (const k of ['r', 'g', 'b']) {
    if (!Number.isFinite(rgb[k]) || rgb[k] < 0 || rgb[k] > 255) return null;
  }
  return { ...rgb, format, hslInput };
}

// --- conversions --------------------------------------------------------

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r, g, b] = [0, 0, 0];
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    h *= 60;
  }
  return { h: Math.round(h), s: +s.toFixed(4), l: +l.toFixed(4) };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: +(max === 0 ? 0 : d / max).toFixed(4), v: +max.toFixed(4) };
}

function rgbToCmyk(r, g, b) {
  if (r === 0 && g === 0 && b === 0) return { c: 0, m: 0, y: 0, k: 1 };
  const c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255;
  const k = Math.min(c, m, y);
  return {
    c: +((c - k) / (1 - k)).toFixed(4),
    m: +((m - k) / (1 - k)).toFixed(4),
    y: +((y - k) / (1 - k)).toFixed(4),
    k: +k.toFixed(4),
  };
}

function luminance(r, g, b) {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return +(0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)).toFixed(4);
}

const hex2 = (n) => n.toString(16).padStart(2, '0');
const pct = (v) => `${Math.round(v * 100)}%`;

async function api(request) {
  try {
    const url = new URL(request.url);
    let color = url.searchParams.get('color') || url.searchParams.get('c') || '';
    if (request.method === 'POST') color = (await request.text()).trim();
    if (!color) throw new Error("Missing 'color' parameter. Usage: ?color=%23ff6600 or rgb(255,102,0) or hsl(30,100%,50%)");
    if (color.length > 64) color = color.slice(0, 64);

    const parsed = parseColor(color);
    if (!parsed) throw new Error(`Unrecognized color format: "${color}". Supported: #rgb, #rrggbb, #rrggbbaa, rgb(...), rgba(...), hsl(...), hsla(...), "r,g,b"`);

    const { r, g, b, a, format } = parsed;
    const hex = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
    const hsl = rgbToHsl(r, g, b);
    const hsv = rgbToHsv(r, g, b);
    const cmyk = rgbToCmyk(r, g, b);
    const lum = luminance(r, g, b);

    return new Response(JSON.stringify({
      input: color.trim(),
      format_detected: format,
      hex,
      hex_no_hash: hex.slice(1),
      rgb: { r, g, b },
      rgb_string: `rgb(${r}, ${g}, ${b})`,
      rgba: { r, g, b, a: +a.toFixed(4) },
      rgba_string: `rgba(${r}, ${g}, ${b}, ${+a.toFixed(4)})`,
      hsl: { h: hsl.h, s: hsl.s, l: hsl.l },
      hsl_string: `hsl(${hsl.h}, ${pct(hsl.s)}, ${pct(hsl.l)})`,
      hsla_string: `hsla(${hsl.h}, ${pct(hsl.s)}, ${pct(hsl.l)}, ${+a.toFixed(4)})`,
      hsv: { h: hsv.h, s: hsv.s, v: hsv.v },
      cmyk: { c: cmyk.c, m: cmyk.m, y: cmyk.y, k: cmyk.k },
      relative_luminance: lum,
      is_dark: lum < 0.179,
      privacy: 'Zero tracking, zero data collection',
      full_tool: FULL_TOOL,
    }, null, 2), { headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
    }, null, 2), { status: 400, headers: JSON_HEADERS });
  }
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Color Converter Online — HEX to RGB to HSL — Free &amp; Private API</title>
<meta name="description" content="Convert colors instantly — HEX to RGB, RGB to HSL, HSV, CMYK and luminance in one call. Free privacy-first edge API, zero tracking. Full color tool on formatho.com.">
<link rel="canonical" href="${HOST}/">
<link rel="alternate" type="application/json" href="${HOST}/api">
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem 3rem; line-height: 1.6; }
header { border-bottom: 1px solid #8884; margin-bottom: 1.5rem; padding-bottom: 1rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.tagline { color: #888; margin: 0; }
.badges { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1rem 0; }
.badge { background: #8882; border-radius: 999px; padding: .15rem .7rem; font-size: .8rem; }
pre { background: #8882; padding: .8rem 1rem; border-radius: 8px; overflow-x: auto; font-size: .85rem; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th, td { border: 1px solid #8884; padding: .35rem .6rem; text-align: left; }
.swatch { display: inline-block; width: 1em; height: 1em; border-radius: 3px; background: #f60; vertical-align: -0.1em; border: 1px solid #8884; }
</style>
</head>
<body>
<header>
  <h1>Color Converter — Free &amp; Private <span class="swatch"></span></h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code># HEX in — every format out:
curl "https://color-converter-formatho.filesformatho.workers.dev/api?color=%23ff6600"

# RGB or HSL in:
curl "https://color-converter-formatho.filesformatho.workers.dev/api?color=rgb(255,102,0)"
curl "https://color-converter-formatho.filesformatho.workers.dev/api?color=hsl(30,100%,50%)"</code></pre>

<h2>Parameters</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td><code>color</code></td><td><em>required</em></td><td>A color: <code>#f60</code>, <code>#ff6600</code>, <code>#ff6600aa</code>, <code>rgb(255,102,0)</code>, <code>rgba(...)</code>, <code>hsl(30,100%,50%)</code>, <code>hsla(...)</code> or bare <code>255,102,0</code>. Alias: <code>c</code>.</td></tr>
</table>

<p>One call returns <strong>HEX, RGB(A), HSL(A), HSV, CMYK</strong> plus WCAG relative luminance and an <code>is_dark</code> flag for contrast decisions.</p>

<p>Live response: <a href="https://color-converter-formatho.filesformatho.workers.dev/api?color=%23ff6600">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection.
</div>

<h2>What it handles</h2>
<p>3/4/6/8-digit hex (8-digit keeps alpha), percentage or 0–255 channel values, degrees or percentages for HSL, and transparent <code>rgba/hsla</code> alpha — all normalized to every common CSS color format.</p>

<h2>Full browser tool</h2>
<p>Prefer a UI with a live swatch and picker? Use the complete client-side version — it runs entirely in your browser: <a href="https://formatho.com/tools/color-converter">Color Converter on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://color-converter-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${HOST}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${HOST}/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/sitemap.xml') {
      return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/api' || url.pathname === '/api/') {
      return api(request);
    }
    if (url.pathname === '/') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Privacy-Policy': 'Zero tracking, zero data collection' } });
    }
    return new Response('Not found. See <a href="/">the tool page</a> or <a href="/api">/api</a>.', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
