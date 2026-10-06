// Privacy-First CSV Counter (rows, columns & column stats) API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://csv-counter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/csv-counter';
const MAX_BYTES = 1_048_576; // 1 MB

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CSV Row &amp; Column Counter Online — Free &amp; Private</title>
<meta name="description" content="Count CSV rows, columns and per-column fill/distinct stats with a free, privacy-first edge API. RFC 4180 quoted fields, delimiter auto-detect. Zero tracking.">
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
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "CSV Row & Column Counter Online — Free & Private",
  "url": "https://csv-counter-formatho.filesformatho.workers.dev/",
  "description": "Count CSV rows, columns and per-column fill/distinct stats with a free, privacy-first edge API. RFC 4180 quoted fields, delimiter auto-detect. Zero tracking.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["Free edge API", "Zero tracking", "No data collection", "No signup required"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
  <h1>CSV Row &amp; Column Counter — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — count rows &amp; columns</h2>
<pre><code>curl -X POST "${HOST}/api?header=true" \\
  -H 'Content-Type: text/csv' --data-binary @data.csv</code></pre>
<p>Or pass the CSV inline: <code>curl "${HOST}/api?header=true&amp;csv=name%2Cage%0AAlice%2C30"</code>. Returns data-row count, total rows, column count, names, and per-column filled/empty/distinct stats. Delimiter (comma, semicolon, tab, pipe) is auto-detected; quoted fields per RFC 4180 are handled correctly.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> counting runs in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Count entirely client-side: <a href="${FULL_TOOL}">CSV Counter on formatho.com</a>.</p>
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

const LLMS_TXT = "# CSV Row & Column Counter Online — Free & Private\n\n> Count CSV rows, columns and per-column fill/distinct stats with a free, privacy-first edge API. RFC 4180 quoted fields, delimiter auto-detect. Zero tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://csv-counter-formatho.filesformatho.workers.dev/\n- [JSON API]: https://csv-counter-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/csv-counter\n- [All 49 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

function detectDelimiter(text) {
  // Sniff counts of each candidate delimiter outside quotes on the first non-empty line.
  const line = text.split(/\r?\n/).find(l => l.trim() !== '') || '';
  let inQ = false;
  const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQ = !inQ;
    else if (!inQ && counts[ch] !== undefined) counts[ch]++;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : ',';
}

function parseCsv(text, delim) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n') {
      row.push(field); field = '';
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
    } else if (ch !== '\r') field += ch;
  }
  row.push(field);
  if (!(row.length === 1 && row[0] === '')) rows.push(row);
  return rows;
}

async function parseArgs(request) {
  const url = new URL(request.url);
  const delimiter = url.searchParams.get('delimiter') || 'auto';
  const headerParam = url.searchParams.get('header');
  let csv = url.searchParams.get('csv');
  if (request.method === 'POST') {
    const ct = (request.headers.get('Content-Type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === 'object' && typeof body.csv === 'string') csv = body.csv;
      else if (body && typeof body === 'object' && Object.keys(body).length && body.csv === undefined) return { __err: 'POST JSON must include a "csv" string field' };
      else return { __err: 'POST body must be JSON {"csv": "..."} or raw CSV (text/csv)' };
    } else {
      const raw = await request.text();
      if (raw.length) csv = raw;
    }
  }
  return { csv, delimiter, headerParam };
}

async function handleApi(request) {
  const { csv, delimiter, headerParam, __err } = await parseArgs(request);
  if (__err) return err400(__err);
  if (csv === null || csv === undefined || csv.trim() === '') return err400('Missing CSV data: POST raw text/csv body, POST {"csv": "..."} JSON, or GET ?csv=...');
  if (csv.length > MAX_BYTES) return err400(`CSV exceeds 1 MB limit (got ${(csv.length / 1024).toFixed(1)} KB) — trim the input or count locally`);

  let delim;
  if (delimiter === 'auto') delim = detectDelimiter(csv);
  else if (delimiter === 'comma' || delimiter === ',') delim = ',';
  else if (delimiter === 'semicolon' || delimiter === ';') delim = ';';
  else if (delimiter === 'tab' || delimiter === '\\t') delim = '\t';
  else if (delimiter === 'pipe' || delimiter === '|') delim = '|';
  else return err400(`Invalid delimiter "${delimiter}" — use auto, comma, semicolon, tab or pipe`);

  const rows = parseCsv(csv, delim);
  if (!rows.length) return err400('CSV contains no rows');

  const firstRow = rows[0].map(f => f.trim());
  const secondRow = rows[1];
  // Header default: explicit param wins; else auto-guess (first row non-empty and not all-numeric while some later row has numbers in same columns)
  let hasHeader;
  if (headerParam !== null) hasHeader = headerParam.toLowerCase() === 'true';
  else {
    const firstHasEmpty = firstRow.some(f => f === '');
    const firstAllNumeric = firstRow.length > 0 && firstRow.every(f => f !== '' && /^-?\d+(?:[.,]\d+)?$/.test(f));
    const secondNumericSomewhere = secondRow ? secondRow.some(f => /^-?\d+(?:[.,]\d+)?$/.test(f.trim())) : false;
    hasHeader = secondRow ? (!firstAllNumeric || firstHasEmpty || !secondNumericSomewhere) : true;
  }

  const width = Math.max(...rows.map(r => r.length));
  const headerRow = hasHeader ? rows[0] : [];
  const columnNames = [];
  for (let i = 0; i < width; i++) {
    const n = (headerRow[i] || '').trim();
    if (n) columnNames.push(columnNames.includes(n) ? `${n}_${i + 1}` : n);
    else columnNames.push(`column_${i + 1}`);
  }
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const columns = [];
  let cells = 0, emptyCells = 0;
  for (let c = 0; c < width; c++) {
    const values = dataRows.map(r => (r[c] !== undefined ? r[c] : '')).map(v => v.trim());
    const filled = values.filter(v => v !== '').length;
    cells += values.length;
    emptyCells += values.length - filled;
    const distinct = new Set(values.filter(v => v !== ''));
    let maxLen = 0, minLen = null;
    for (const v of values) {
      if (v.length > maxLen) maxLen = v.length;
      if (v !== '' && (minLen === null || v.length < minLen)) minLen = v.length;
    }
    columns.push({
      index: c + 1,
      name: columnNames[c],
      filled,
      empty: values.length - filled,
      distinct: distinct.size,
      max_length: maxLen,
      min_length: minLen,
    });
  }

  return Response.json({
    total_rows: rows.length,
    data_rows: dataRows.length,
    header_row: hasHeader ? 1 : 0,
    columns: width,
    column_names: columnNames,
    delimiter: delim === '\t' ? 'tab' : delim,
    delimiter_detected: delimiter === 'auto',
    cells: cells,
    empty_cells: emptyCells,
    column_stats: columns,
    ragged_rows: rows.filter(r => r.length !== width).length,
    parsed_by: 'Formatho edge API — RFC 4180 (quoted fields, embedded delimiters/newlines), zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

const API_HELP = {
  description: 'Count CSV rows, columns and per-column stats. RFC 4180 parsing (quoted fields, embedded commas/newlines). Delimiter auto-detected.',
  input: [
    `POST ${HOST}/api with raw text/csv body (recommended)`,
    `POST ${HOST}/api -H 'Content-Type: application/json' -d '{"csv": "a,b\\n1,2"}'`,
    `GET ${HOST}/api?csv=a%2Cb%0A1%2C2 (URL-encoded CSV)`,
  ],
  params: {
    delimiter: 'auto (default) | comma | semicolon | tab | pipe',
    header: 'true | false — treat first row as header (default: auto-guessed)',
  },
  example_response: { total_rows: 3, data_rows: 2, columns: 2, column_names: ['name', 'age'] },
  limits: '1 MB per request',
  full_tool: FULL_TOOL,
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (url.pathname === '/api') {
      if (request.method !== 'GET' && request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }), { status: 405, headers: { ...JSON_HEADERS, Allow: 'GET, POST, OPTIONS' } });
      if (request.method === 'GET' && !url.search) return Response.json(API_HELP, { headers: JSON_HEADERS });
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
