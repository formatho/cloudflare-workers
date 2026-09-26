// Privacy-First JSON to CSV Converter API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/json-csv';
const HOST = 'https://json-to-csv-formatho.filesformatho.workers.dev';

function csvEscape(value, delim) {
  const v = value === null || value === undefined ? '' : String(value);
  if (v.includes('"') || v.includes(delim) || v.includes('\n') || v.includes('\r')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function jsonToCsv(data, delimiter, headerRow) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('input must be a non-empty JSON array of objects or arrays');
  }
  const d = delimiter === 'tab' ? '\t' : (delimiter || ',');
  const delim = d.length === 1 ? d : ',';

  const arrayOfArrays = Array.isArray(data[0]);

  let lines;
  if (arrayOfArrays) {
    lines = data.map(row => row.map(cell => csvEscape(cell, delim)).join(delim));
  } else {
    const fields = [...new Set(data.flatMap(obj => (obj && typeof obj === 'object') ? Object.keys(obj) : ['value']))];
    const rows = data.map(obj => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return fields.map(f => csvEscape(obj[f], delim)).join(delim);
      }
      return csvEscape(obj, delim);
    });
    lines = headerRow ? [fields.map(f => csvEscape(f, delim)).join(delim), ...rows] : rows;
  }

  return { csv: lines.join('\n'), row_count: arrayOfArrays ? data.length : data.length + (headerRow ? 1 : 0) };
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JSON to CSV Converter Online — Free &amp; Private API</title>
<meta name="description" content="Convert JSON arrays to CSV instantly — auto headers, RFC 4180 escaping, custom delimiters. Free privacy-first edge API, zero tracking. Full tool on formatho.com.">
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
  <h1>JSON to CSV Converter — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl "https://json-to-csv-formatho.filesformatho.workers.dev/api?json=%5B%7B%22name%22%3A%22Alice%22%2C%22age%22%3A30%7D%5D"

# POST a JSON body (recommended for large arrays):
curl -X POST -H "Content-Type: application/json" \\
  --data '[{"name":"Alice","age":30},{"name":"Bob, Jr","age":25}]' \\
  "https://json-to-csv-formatho.filesformatho.workers.dev/api?delimiter=,"</code></pre>

<h2>Parameters</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td><code>json</code></td><td><code>""</code></td><td>JSON array via GET (max 100,000 chars) — or POST the body.</td></tr>
<tr><td><code>delimiter</code></td><td><code>,</code></td><td>Field delimiter: <code>,</code> <code>;</code> <code>\\t</code> or <code>tab</code>.</td></tr>
<tr><td><code>header</code></td><td><code>1</code></td><td><code>1</code> writes a header row from object keys, <code>0</code> omits it.</td></tr>
</table>

<p>Full parameter reference and live response: <a href="https://json-to-csv-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. Your JSON never touches a disk.
</div>

<h2>What it handles</h2>
<p>Arrays of objects (keys become the header row, union of all keys in order) and arrays of arrays. Values containing <strong>commas, quotes or newlines</strong> are escaped per <strong>RFC 4180</strong> (<code>"</code> → <code>""</code>, wrapped in quotes). Semicolon and tab delimiters supported for Excel locales.</p>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — your data never even leaves your browser: <a href="https://formatho.com/tools/json-csv">JSON to CSV Converter on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://json-to-csv-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
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

async function api(request) {
  try {
    const url = new URL(request.url);
    let raw = url.searchParams.get('json') || '';
    if (request.method === 'POST') raw = await request.text();
    raw = raw.slice(0, 100000);

    if (!raw) throw new Error("provide a JSON array via 'json' query param or POST body");

    let data;
    try { data = JSON.parse(raw); }
    catch { throw new Error('input is not valid JSON'); }

    const delimiter = (url.searchParams.get('delimiter') || ',').toLowerCase();
    if (delimiter.length !== 1 && delimiter !== 'tab' && delimiter !== '\\t') {
      throw new Error("delimiter must be a single character, 'tab', or '\\t'");
    }
    const header = url.searchParams.get('header') !== '0';

    const result = {
      ...jsonToCsv(data, delimiter, header),
      delimiter: delimiter === 'tab' || delimiter === '\\t' ? '\\t' : delimiter,
      header_row: header,
      privacy: 'Zero tracking, zero data collection',
      full_tool: FULL_TOOL,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
    }, null, 2), { status: 400, headers: JSON_HEADERS });
  }
}

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
