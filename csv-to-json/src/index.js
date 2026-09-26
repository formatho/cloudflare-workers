// Privacy-First CSV to JSON Converter API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/json-csv';
const HOST = 'https://csv-to-json-formatho.filesformatho.workers.dev';

function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const d = delimiter === 'tab' ? '\t' : (delimiter || ',');
  const delim = d.length === 1 ? d : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = '';
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
    } else if (ch === '\r') {
      // skip; handled by \n
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (!(row.length === 1 && row[0] === '')) rows.push(row);
  return rows;
}

function csvToJson(csv, delimiter, headerRow) {
  const rows = parseCsv(csv, delimiter);
  if (!rows.length) return { fields: [], rows: [], row_count: 0 };

  let fields, dataRows;
  if (headerRow) {
    fields = rows[0].map((f, i) => (f.trim() || `column_${i + 1}`));
    dataRows = rows.slice(1);
  } else {
    const width = Math.max(...rows.map(r => r.length));
    fields = Array.from({ length: width }, (_, i) => `column_${i + 1}`);
    dataRows = rows;
  }

  const records = dataRows.map(r => {
    const obj = {};
    fields.forEach((f, i) => {
      const v = r[i] !== undefined ? r[i] : '';
      // auto-type: numbers and booleans, keep strings otherwise
      if (v !== '' && !isNaN(Number(v)) && v.trim() !== '') obj[f] = Number(v);
      else if (v === 'true') obj[f] = true;
      else if (v === 'false') obj[f] = false;
      else if (v.toLowerCase() === 'null') obj[f] = null;
      else obj[f] = v;
    });
    return obj;
  });

  return { fields, rows: records, row_count: records.length };
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CSV to JSON Converter Online — Free &amp; Private API</title>
<meta name="description" content="Convert CSV to JSON instantly — headers, quoted fields, custom delimiters, auto-typing. Free privacy-first edge API, zero tracking. Full tool on formatho.com.">
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
  <h1>CSV to JSON Converter — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl "https://csv-to-json-formatho.filesformatho.workers.dev/api?csv=name,age%0AAlice,30%0ABob,25"

# POST a file body (recommended for large CSVs):
curl -X POST --data-binary @data.csv \\
  "https://csv-to-json-formatho.filesformatho.workers.dev/api?delimiter=,"</code></pre>

<h2>Parameters</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td><code>csv</code></td><td><code>""</code></td><td>CSV text via GET (max 100,000 chars) — or POST the body.</td></tr>
<tr><td><code>delimiter</code></td><td><code>,</code></td><td>Field delimiter: <code>,</code> <code>;</code> <code>\\t</code> or <code>tab</code>.</td></tr>
<tr><td><code>header</code></td><td><code>1</code></td><td><code>1</code> first row is the header, <code>0</code> generates <code>column_N</code> keys.</td></tr>
</table>

<p>Full parameter reference and live response: <a href="https://csv-to-json-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. Your CSV never touches a disk.
</div>

<h2>What it handles</h2>
<p>Quoted fields with embedded <strong>commas and newlines</strong>, escaped double quotes (<code>""</code>), CRLF line endings, custom delimiters (semicolon, tab), and automatic typing — numbers, <code>true</code>/<code>false</code> and <code>null</code> become native JSON types.</p>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — your data never even leaves your browser: <a href="https://formatho.com/tools/json-csv">CSV to JSON Converter on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://csv-to-json-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
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
    let csv = url.searchParams.get('csv') || '';
    if (request.method === 'POST') csv = await request.text();
    csv = csv.slice(0, 100000);

    const delimiter = (url.searchParams.get('delimiter') || ',').toLowerCase();
    if (delimiter.length !== 1 && delimiter !== 'tab' && delimiter !== '\\t') {
      throw new Error("delimiter must be a single character, 'tab', or '\\t'");
    }
    const header = url.searchParams.get('header') !== '0';

    const result = {
      ...csvToJson(csv, delimiter, header),
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
