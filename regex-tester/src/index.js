// Privacy-First Regex Tester API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/regex-tester';
const HOST = 'https://regex-tester-formatho.filesformatho.workers.dev';

const MAX_TEXT = 100000;
const MAX_PATTERN = 1000;
const MAX_MATCHES = 1000;
const ALLOWED_FLAGS = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);

function runRegex(pattern, flags, text) {
  // Validate flags
  const flagSet = new Set(flags.split(''));
  for (const f of flagSet) {
    if (!ALLOWED_FLAGS.has(f)) throw new Error(`Unsupported flag "${f}". Allowed: d g i m s u v y`);
  }
  if (flags.includes('v') && (flags.includes('u'))) {
    throw new Error('Flags "u" and "v" cannot be combined');
  }

  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    return { error: e.message };
  }

  const matches = [];
  let truncated = false;

  if (flags.includes('g')) {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (matches.length >= MAX_MATCHES) { truncated = true; break; }
      matches.push({
        match: m[0],
        index: m.index,
        end: m.index + m[0].length,
        groups: m.length > 1 ? m.slice(1).map(g => g === undefined ? null : g) : undefined,
        named_groups: m.groups || undefined,
      });
      if (m[0] === '') re.lastIndex++; // avoid infinite loops on empty matches
    }
  } else {
    const m = re.exec(text);
    if (m !== null) {
      matches.push({
        match: m[0],
        index: m.index,
        end: m.index + m[0].length,
        groups: m.length > 1 ? m.slice(1).map(g => g === undefined ? null : g) : undefined,
        named_groups: m.groups || undefined,
      });
    }
  }

  return { matches, truncated };
}

async function api(request) {
  try {
    const url = new URL(request.url);
    const pattern = url.searchParams.get('pattern') || url.searchParams.get('regex') || '';
    const flags = url.searchParams.get('flags') || 'g';
    let text = url.searchParams.get('text') || url.searchParams.get('test') || '';
    if (request.method === 'POST') text = await request.text();

    if (!pattern) {
      throw new Error("Missing 'pattern' parameter. Usage: ?pattern=\\d+&flags=g&text=abc123");
    }
    if (pattern.length > MAX_PATTERN) throw new Error(`Pattern too long (max ${MAX_PATTERN} chars)`);
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);

    const result = runRegex(pattern, flags, text);
    if (result.error) {
      return new Response(JSON.stringify({
        valid: false, error: `Invalid regular expression: ${result.error}`,
        pattern, flags, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
      }, null, 2), { status: 400, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify({
      valid: true,
      pattern,
      flags,
      match_count: result.matches.length,
      truncated: result.truncated || undefined,
      matches: result.matches,
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
<title>Regex Tester Online — Free &amp; Private API</title>
<meta name="description" content="Test regular expressions instantly — matches, capture groups, named groups and indices returned as JSON. Free privacy-first edge API, zero tracking. Full regex tool on formatho.com.">
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
</style>
</head>
<body>
<header>
  <h1>Regex Tester — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl "https://regex-tester-formatho.filesformatho.workers.dev/api?pattern=%5Cd%2B&flags=g&text=abc%20123%20xyz"

# Named groups + POST body (recommended for long text):
curl -X POST --data-binary @input.txt \\
  "https://regex-tester-formatho.filesformatho.workers.dev/api?pattern=(%3F%3Cyear%3E%5Cd%7B4%7D)-(%3F%3Cmonth%3E%5Cd%7B2%7D)&flags=g"</code></pre>

<h2>Parameters</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td><code>pattern</code></td><td><em>required</em></td><td>The regular expression (max 1,000 chars). Alias: <code>regex</code>.</td></tr>
<tr><td><code>flags</code></td><td><code>g</code></td><td>Any of <code>d g i m s u v y</code> (global by default).</td></tr>
<tr><td><code>text</code></td><td><code>""</code></td><td>Test text via GET (max 100,000 chars) — or POST the body. Alias: <code>test</code>.</td></tr>
</table>

<p>Each match returns its <code>index</code>, <code>end</code>, capture <code>groups</code> and <code>named_groups</code>. Invalid patterns return HTTP 400 with the exact parser error.</p>

<p>Live response: <a href="https://regex-tester-formatho.filesformatho.workers.dev/api?pattern=%5Cd%2B&flags=g&text=abc%20123">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. Your text and patterns never touch a disk.
</div>

<h2>What it handles</h2>
<p>Global and non-global matching, capture groups, <strong>named groups</strong> (<code>(?&lt;name&gt;…)</code>), all standard flags including <code>s</code> (dotAll) and <code>u</code>/<code>v</code> (Unicode), and up to 1,000 matches per request with a <code>truncated</code> flag when the cap is hit.</p>

<h2>Full browser tool</h2>
<p>Prefer a UI with live highlighting? Use the complete client-side version — your data never even leaves your browser: <a href="https://formatho.com/tools/regex-tester">Regex Tester on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://regex-tester-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
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
