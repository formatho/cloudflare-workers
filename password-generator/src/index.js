// Privacy-First Password Generator API — formatho.com
// Crypto-secure generation on Cloudflare's edge. No tracking, no storage, no logging.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/password-generator';

const SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
};
const AMBIGUOUS = new Set('il1Lo0O`\'"|;:.,'.split(''));

function secureRandomInt(maxExclusive) {
  // Unbiased rejection sampling with crypto randomness.
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return v % maxExclusive;
}

function buildPool(opts) {
  const active = {};
  let pool = '';
  for (const [name, chars] of Object.entries(SETS)) {
    if (!opts[name]) continue;
    const filtered = opts.excludeAmbiguous ? [...chars].filter((c) => !AMBIGUOUS.has(c)).join('') : chars;
    if (filtered) { active[name] = filtered; pool += filtered; }
  }
  return { pool, active };
}

function generateOne(length, pool, activeSetNames, active) {
  const chars = [];
  // Guarantee at least one char from each requested set.
  for (const name of activeSetNames) {
    const set = active[name];
    chars.push(set[secureRandomInt(set.length)]);
  }
  while (chars.length < length) chars.push(pool[secureRandomInt(pool.length)]);
  // Fisher–Yates shuffle with crypto randomness.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.slice(0, length).join('');
}

async function api(request) {
  try {
    const url = new URL(request.url);
    const length = Math.min(Math.max(parseInt(url.searchParams.get('length') || '20', 10) || 20, 8), 128);
    const count = Math.min(Math.max(parseInt(url.searchParams.get('count') || '1', 10) || 1, 1), 100);
    const flag = (name, def) => {
      const raw = url.searchParams.get(name);
      return raw === null ? def : raw !== '0';
    };
    const opts = {
      lowercase: flag('lowercase', true),
      uppercase: flag('uppercase', true),
      numbers: flag('numbers', true),
      symbols: flag('symbols', true),
      excludeAmbiguous: flag('excludeAmbiguous', false),
    };

    const { pool, active } = buildPool(opts);
    const setNames = Object.keys(active);
    if (!pool) throw new Error('Enable at least one character set (lowercase/uppercase/numbers/symbols)');
    if (setNames.length > length) throw new Error(`length must be >= ${setNames.length} to include every requested set`);

    const passwords = [];
    for (let i = 0; i < count; i++) passwords.push(generateOne(length, pool, setNames, active));

    const entropyBits = Math.round(length * Math.log2(pool.length));
    const strength = entropyBits >= 128 ? 'very strong' : entropyBits >= 80 ? 'strong' : entropyBits >= 60 ? 'moderate' : 'weak';

    return new Response(JSON.stringify({
      passwords, count, length,
      charsets: setNames,
      pool_size: pool.length,
      entropy_bits: entropyBits,
      strength,
      generated_with: 'crypto.getRandomValues — cryptographically secure randomness',
      privacy: 'Zero tracking, zero data collection, never stored or logged',
      full_tool: FULL_TOOL,
    }, null, 2), {
      headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
    });
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
<title>Password Generator Online — Secure, Free &amp; Private</title>
<meta name="description" content="Generate cryptographically secure passwords (8–128 chars, custom charsets, bulk up to 100) — free and privacy-first. Nothing is stored, logged or transmitted onward.">
<link rel="canonical" href="https://password-generator-formatho.filesformatho.workers.dev/">
<link rel="alternate" type="application/json" href="https://password-generator-formatho.filesformatho.workers.dev/api">
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
</style>
</head>
<body>
<header>
  <h1>Password Generator — Secure, Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔐 Crypto-secure</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 Never stored or logged</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl &quot;https://password-generator-formatho.filesformatho.workers.dev/api?length=24&amp;count=3&amp;symbols=1&quot;

curl &quot;https://password-generator-formatho.filesformatho.workers.dev/api?length=16&amp;symbols=0&amp;excludeAmbiguous=1&quot;</code></pre>

<h2>Parameters</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td><code>length</code></td><td><code>20</code></td><td>Password length, 8–128.</td></tr>
<tr><td><code>count</code></td><td><code>1</code></td><td>How many passwords, 1–100.</td></tr>
<tr><td><code>lowercase</code> / <code>uppercase</code> / <code>numbers</code> / <code>symbols</code></td><td><code>1</code></td><td>Enable/disable each charset (<code>0</code> to disable).</td></tr>
<tr><td><code>excludeAmbiguous</code></td><td><code>0</code></td><td><code>1</code> drops look-alike chars (<code>il1Lo0O</code>, quotes, etc.).</td></tr>
</table>

<p>Every password uses <code>crypto.getRandomValues</code> with unbiased rejection sampling; each requested charset is guaranteed at least one character. Response includes pool size, entropy bits and a strength rating. Full reference: <a href="https://password-generator-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> passwords are generated in-memory on Cloudflare's edge and answered immediately — never stored, never logged, never transmitted anywhere else. Most "free" password sites track you and run ads; this one does neither. See the <a href="https://formatho.com">Formatho privacy philosophy</a>.
</div>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — passwords are generated locally in your browser and never touch any server: <a href="https://formatho.com/password-generator">Password Generator on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://password-generator-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://password-generator-formatho.filesformatho.workers.dev/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://password-generator-formatho.filesformatho.workers.dev/api</loc>
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
