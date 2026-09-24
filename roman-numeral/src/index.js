// Privacy-First Roman Numeral Converter API — formatho.com
// Convert integers to Roman numerals and back, with strict validation.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://roman-numeral-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/roman-numeral-converter';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roman Numeral Converter Online (Numbers ⇄ Roman) — Free &amp; Private</title>
<meta name="description" content="Convert numbers to Roman numerals and Roman numerals to numbers — 1 to 3,999 with strict canonical validation. Free, privacy-first API with zero tracking. Full tool on formatho.com.">
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
  <h1>Roman Numeral Converter Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># number → Roman
curl "${HOST}/api?number=2026"</code></pre>
<pre><code># Roman → number
curl "${HOST}/api?roman=MMXXVI"</code></pre>
<p>Provide one or both parameters — validation is strict canonical subtractive notation (1–3,999; non-standard forms like IIII are rejected).</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> values are converted in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Convert Roman numerals entirely client-side: <a href="${FULL_TOOL}">Roman Numerals Converter on formatho.com</a>.</p>
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

const TABLE = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
const ROMAN_TOKEN_RE = /^(M|CM|D|CD|C|XC|L|XL|X|IX|V|IV|I)+$/;

function toRoman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999) throw new Error('number must be an integer between 1 and 3,999');
  let out = '';
  for (const [v, s] of TABLE) while (n >= v) { out += s; n -= v; }
  return out;
}

function fromRoman(str) {
  const s = str.trim().toUpperCase();
  if (!s || !ROMAN_TOKEN_RE.test(s)) throw new Error('roman contains characters that are not part of Roman numerals');
  let i = 0, total = 0;
  outer: while (i < s.length) {
    for (const [v, sym] of TABLE) {
      if (s.startsWith(sym, i)) { total += v; i += sym.length; continue outer; }
    }
    throw new Error('roman is not a valid Roman numeral');
  }
  // Canonical-form check: greedy parse must re-serialize to the identical string.
  // Rejects non-standard forms like IIII, VIIII, IC.
  if (toRoman(total) !== s) throw new Error(`roman is not canonical subtractive notation (e.g. IIII → use IV)`);
  return total;
}

function handleApi(request) {
  const url = new URL(request.url);
  const numberParam = url.searchParams.get('number');
  const romanParam = url.searchParams.get('roman');
  if (!numberParam && !romanParam) {
    return Response.json({ error: 'Missing parameter: provide number (integer 1-3999) and/or roman (e.g. MMXXVI)' }, { status: 400, headers: JSON_HEADERS });
  }
  const body = { converted_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL };
  try {
    if (numberParam !== null) {
      if (!/^-?\d+$/.test(numberParam.trim())) throw new Error('number must be an integer');
      body.input_number = parseInt(numberParam, 10);
      body.roman = toRoman(body.input_number);
    }
    if (romanParam !== null) {
      body.input_roman = romanParam.trim().toUpperCase();
      body.number = fromRoman(romanParam);
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS });
  }
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
