// Privacy-First Number Base Converter API — formatho.com
// Convert integers between binary, octal, decimal, hexadecimal and any base 2-36 (BigInt-safe).

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://base-converter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/integer-base-converter';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Number Base Converter Online (Binary, Decimal, Hex, Octal) — Free &amp; Private</title>
<meta name="description" content="Convert numbers between binary, octal, decimal, hexadecimal and any base 2-36 — BigInt-safe, free, privacy-first API with zero tracking. Full tool on formatho.com.">
<link rel="canonical" href="${HOST}/">
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
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
</style>
</head>
<body>
<header>
  <h1>Number Base Converter Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?value=255&amp;from=10"</code></pre>
<p>Returns binary, octal, decimal, hexadecimal and base36 in one response. Add <code>&amp;to=5</code> for any base 2-36.</p>
<pre><code>curl "${HOST}/api?value=deadbeef&amp;from=16&amp;to=36"</code></pre>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> numbers are converted in-memory at the edge and never logged or stored. Works with arbitrarily large integers (BigInt).</div>
<h2>Full browser tool</h2>
<p>Convert bases entirely client-side: <a href="${FULL_TOOL}">Integer Base Converter on formatho.com</a>.</p>
<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>
<footer>© formatho.com · <a href="${HOST}/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${HOST}/api</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

function toBigInt(value, from) {
  const neg = value.startsWith('-');
  if (neg) value = value.slice(1);
  if (!value || !/^[0-9a-z]+$/i.test(value)) throw new Error(`value contains invalid characters for base ${from}`);
  let n = 0n;
  const base = BigInt(from);
  for (const ch of value.toLowerCase()) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= from) throw new Error(`digit "${ch}" is not valid in base ${from}`);
    n = n * base + BigInt(d);
  }
  return neg ? -n : n;
}

function fromBigInt(n, to) {
  const neg = n < 0n;
  if (neg) n = -n;
  if (n === 0n) return '0';
  const base = BigInt(to);
  let out = '';
  while (n > 0n) {
    out = DIGITS[Number(n % base)] + out;
    n /= base;
  }
  return (neg ? '-' : '') + out;
}

function handleApi(request) {
  const url = new URL(request.url);
  const value = url.searchParams.get('value');
  if (!value) return Response.json({ error: 'Missing required parameter: value (e.g. value=255&from=10)' }, { status: 400, headers: JSON_HEADERS });
  const from = parseInt(url.searchParams.get('from') || '10', 10);
  if (!(from >= 2 && from <= 36)) return Response.json({ error: 'from must be an integer between 2 and 36' }, { status: 400, headers: JSON_HEADERS });
  const to = url.searchParams.get('to') ? parseInt(url.searchParams.get('to'), 10) : null;
  if (to !== null && !(to >= 2 && to <= 36)) return Response.json({ error: 'to must be an integer between 2 and 36' }, { status: 400, headers: JSON_HEADERS });

  let n;
  try {
    n = toBigInt(value.trim(), from);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS });
  }

  const body = {
    input: value,
    input_base: from,
    negative: n < 0n,
    decimal: n.toString(),
    binary: fromBigInt(n, 2),
    octal: fromBigInt(n, 8),
    hexadecimal: fromBigInt(n, 16),
    base36: fromBigInt(n, 36),
    bit_length: (n < 0n ? -n : n).toString(2).length,
    converted_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  };
  if (to !== null) body.result = { base: to, value: fromBigInt(n, to) };
  return Response.json(body, { headers: JSON_HEADERS });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname === '/api/') return handleApi(request);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found. See <a href="/">the tool page</a> or <a href="/api">/api</a>.', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
};
