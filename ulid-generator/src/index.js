// Privacy-First ULID Generator API — formatho.com
// Spec: github.com/ulid/spec — 128-bit, Crockford Base32, 26 chars.
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/ulid-generator';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford Base32 (no I, L, O, U)
const DECODE_MAP = (() => {
  const m = {};
  [...ALPHABET].forEach((c, i) => {
    m[c] = i; m[c.toLowerCase()] = i;
  });
  // Crockford-style non-canonical aliases
  m['I'] = 1; m['i'] = 1; m['L'] = 1; m['l'] = 1; m['O'] = 0; m['o'] = 0;
  return m;
})();

function encodeUlid(ts, rand) { // rand: Uint8Array(10), ts: int < 2^48
  let v = BigInt(ts) << 80n;
  for (let i = 0; i < 10; i++) v |= BigInt(rand[i]) << BigInt(8 * (9 - i));
  let out = '';
  for (let i = 0; i < 26; i++) { out = ALPHABET[Number(v & 31n)] + out; v >>= 5n; }
  return out;
}

function randomBytes() {
  const r = new Uint8Array(10);
  crypto.getRandomValues(r);
  return r;
}

// Monotonic within a batch: same ms ⇒ increment randomness; overflow ⇒ next ms.
function generateBatch(count, monotonic) {
  const ulids = [];
  let lastTs = 0, lastRand = 0n;
  for (let i = 0; i < count; i++) {
    let ts = Date.now();
    if (monotonic && ts === lastTs && lastRand !== 0n) {
      lastRand += 1n;
      if (lastRand >= (1n << 80n)) { ts += 1; lastTs = ts; lastRand = 0n; }
    } else {
      lastTs = ts; lastRand = 0n;
    }
    let rand = randomBytes();
    if (lastRand > 0n) {
      rand = new Uint8Array(10);
      let r = lastRand;
      for (let j = 9; j >= 0; j--) { rand[j] = Number(r & 255n); r >>= 8n; }
    }
    if (monotonic) {
      // remember current random value
      let rr = 0n;
      for (let j = 0; j < 10; j++) rr = (rr << 8n) | BigInt(rand[j]);
      lastRand = rr;
    }
    ulids.push(encodeUlid(ts, rand));
  }
  return ulids;
}

function decodeUlid(input) {
  const s = String(input).trim();
  if (s.length !== 26) {
    return { ulid: s, valid: false, error: `ULID must be exactly 26 characters (got ${s.length})` };
  }
  let v = 0n, canonical = true;
  for (const ch of s) {
    const d = DECODE_MAP[ch];
    if (d === undefined) return { ulid: s, valid: false, error: `Invalid character "${ch}" — ULID uses Crockford Base32 (0-9, A-H, J, K, M, N, P-T, V-Z)` };
    if (ALPHABET.indexOf(ch) === -1) canonical = false;
    v = (v << 5n) | BigInt(d);
  }
  const ts = Number(v >> 80n);
  if (ts >= 2 ** 48) return { ulid: s, valid: false, error: 'Timestamp overflow (must be < 2^48)' };
  const randBig = v & ((1n << 80n) - 1n);
  let randHex = randBig.toString(16).toUpperCase().padStart(20, '0');
  return {
    ulid: s.toUpperCase(),
    valid: true,
    canonical,
    timestamp_ms: ts,
    datetime_iso: new Date(ts).toISOString(),
    randomness_hex: randHex,
  };
}

async function api(request) {
try {
  const url = new URL(request.url);
  const ulid = url.searchParams.get('ulid');

  if (ulid) {
    const decoded = decodeUlid(ulid);
    return new Response(JSON.stringify({
      ...decoded, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
    }, null, 2), { headers: JSON_HEADERS });
  }

  const count = Math.min(Math.max(parseInt(url.searchParams.get('count') || '1', 10) || 1, 1), 100);
  const monotonic = ['true', '1', 'yes'].includes((url.searchParams.get('monotonic') || '').toLowerCase());

  const ulids = generateBatch(count, monotonic);
  return new Response(JSON.stringify({
    ulids, count: ulids.length, monotonic,
    spec: 'github.com/ulid/spec — 48-bit ms timestamp + 80-bit randomness, Crockford Base32',
    privacy: 'Zero tracking, zero data collection',
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
<title>ULID Generator Online — Free &amp; Private</title>
<meta name="description" content="Generate ULIDs instantly — sortable, 128-bit, Crockford Base32 IDs with crypto-secure randomness. Decode &amp; validate ULIDs too. Free, privacy-first, zero tracking.">
<link rel="canonical" href="https://ulid-generator-formatho.filesformatho.workers.dev/">
<link rel="alternate" type="application/json" href="https://ulid-generator-formatho.filesformatho.workers.dev/api">
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
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "ULID Generator Online — Free & Private",
  "url": "https://ulid-generator-formatho.filesformatho.workers.dev/",
  "description": "Generate ULIDs instantly — sortable, 128-bit, Crockford Base32 IDs with crypto-secure randomness. Decode & validate ULIDs too. Free, privacy-first, zero tracking.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Free edge API",
    "Zero tracking",
    "No data collection",
    "No signup required"
  ],
  "publisher": {
    "@type": "Organization",
    "name": "Formatho",
    "url": "https://formatho.com"
  }
}
</script>
</head>
<body>
<header>
  <h1>ULID Generator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl &quot;https://ulid-generator-formatho.filesformatho.workers.dev/api?count=5&quot;</code></pre>
<pre><code>curl "https://ulid-generator-formatho.filesformatho.workers.dev/api?count=5&amp;monotonic=true"</code></pre>
<pre><code>curl "https://ulid-generator-formatho.filesformatho.workers.dev/api?ulid=01ARZ3NDEKTSV4RRFFQ69G5FAV"</code></pre>
<p>Full parameter reference and live response: <a href="https://ulid-generator-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<h2>What is a ULID?</h2>
<p>A ULID (Universally Unique Lexicographically Sortable Identifier) is a 128-bit identifier that encodes a 48-bit millisecond timestamp plus 80 bits of crypto-secure randomness, written as 26 Crockford Base32 characters like <code>01ARZ3NDEKTSV4RRFFQ69G5FAV</code>. ULIDs sort chronologically (great for database keys and URLs), are case-insensitive, and contain no confusing I/L/O/U characters.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. See the <a href="https://formatho.com">Formatho privacy philosophy</a>.
</div>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — generation happens right in your browser: <a href="https://formatho.com/tools/ulid-generator">ULID Generator on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://ulid-generator-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ulid-generator-formatho.filesformatho.workers.dev/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ulid-generator-formatho.filesformatho.workers.dev/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

const LLMS_TXT = "# ULID Generator Online — Free & Private\n\n> Generate ULIDs instantly — sortable, 128-bit, Crockford Base32 IDs with crypto-secure randomness. Decode & validate ULIDs too. Free, privacy-first, zero tracking. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://ulid-generator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://ulid-generator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/ulid-generator\n- [All 38 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

export default {
  async fetch(request) {
    const url = new URL(request.url);
if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
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
