// Privacy-First List Converter API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://list-converter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/list-converter';

const DELIMS = {
  comma: ',', semicolon: ';', tab: '\t', pipe: '|', space: ' ',
};
const DELIM_ALIASES = {
  csv: 'comma', comma: 'comma', ',': 'comma',
  semicolon: 'semicolon', ';': 'semicolon',
  tab: 'tab', tsv: 'tab', '\t': 'tab',
  pipe: 'pipe', '|': 'pipe',
  space: 'space', ' ': 'space', whitespace: 'space',
  newline: 'newline', nl: 'newline', line: 'newline', lines: 'newline', br: 'newline', '\\n': 'newline', crlf: 'newline', lf: 'newline',
};
const OUT_MODES = new Set(['comma', 'semicolon', 'tab', 'pipe', 'space', 'newline', 'json', 'html']);
const QUOTES = { none: '', single: "'", double: '"', backtick: '`' };

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>List Converter Online — Free &amp; Private</title>
<meta name="description" content="Convert lists between comma-separated, newline, semicolon, tab, pipe, JSON array or HTML — with dedupe, sort and quoting. Free privacy-first edge API, zero tracking.">
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
  "name": "List Converter Online — Free & Private",
  "url": "https://list-converter-formatho.filesformatho.workers.dev/",
  "description": "Convert lists between comma-separated, newline, semicolon, tab, pipe, JSON array or HTML — with dedupe, sort and quoting. Free privacy-first edge API, zero tracking.",
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
  <h1>List Converter — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — column to comma-separated</h2>
<pre><code>curl "${HOST}/api?text=apple%0Abanana%0Acherry"</code></pre>
<p>Newline lists become <code>apple,banana,cherry</code> in one call. Input delimiters are auto-detected (newline, comma, semicolon, tab, pipe or space).</p>
<h2>Usage — comma list to JSON, deduped and sorted</h2>
<pre><code>curl "${HOST}/api?text=b,a,a&amp;to=json&amp;dedupe=true&amp;sort=asc"</code></pre>
<p>Output modes: <code>comma</code>, <code>newline</code>, <code>semicolon</code>, <code>tab</code>, <code>pipe</code>, <code>space</code>, <code>json</code>, <code>html</code> (a <code>&lt;ul&gt;</code> list). Add <code>quote=double</code>, <code>spacing=true</code>, <code>dedupe=ci</code> (case-insensitive) or <code>sort=length</code>.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> conversion runs in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Paste, click, copy with a full UI: <a href="${FULL_TOOL}">List Converter on formatho.com</a>.</p>
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

const LLMS_TXT = "# List Converter Online — Free & Private\n\n> Convert lists between comma-separated, newline, semicolon, tab, pipe, JSON array or HTML — with dedupe, sort and quoting. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://list-converter-formatho.filesformatho.workers.dev/\n- [JSON API]: https://list-converter-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/list-converter\n- [All 53 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

function resolveFrom(raw, text) {
  if (!raw) return 'auto';
  const key = String(raw).toLowerCase().trim();
  if (key === 'auto') return 'auto';
  return DELIM_ALIASES[key] || null;
}

function detectDelimiter(text) {
  if (/\r?\n/.test(text)) return 'newline';
  if (text.includes(',')) return 'comma';
  if (text.includes(';')) return 'semicolon';
  if (text.includes('\t')) return 'tab';
  if (text.includes('|')) return 'pipe';
  if (text.includes(' ')) return 'space';
  return 'newline'; // single item
}

function splitItems(text, from) {
  const mode = from === 'auto' ? detectDelimiter(text) : from;
  if (mode === 'newline') return { items: text.split(/\r\n|\r|\n/), detected: mode };
  return { items: text.split(DELIMS[mode]), detected: mode };
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function handleApi(request) {
  let raw;
  if (request.method === 'POST') {
    raw = await request.json().catch(() => ({ __bad: true }));
    if (raw === null || raw === undefined || raw.__bad) return err400('POST body must be JSON, e.g. {"text": "a\\nb\\nc", "to": "comma", "dedupe": true}');
  } else {
    const url = new URL(request.url);
    raw = {};
    for (const [k, v] of url.searchParams.entries()) raw[k.toLowerCase()] = v;
  }

  const text = raw.text ?? raw.input ?? raw.list;
  if (typeof text !== 'string' || !text.trim()) return err400(`Parameter "text" is required — the list to convert, e.g. ?text=${encodeURIComponent('apple\nbanana\ncherry')}`);
  if (text.length > 1_048_576) return err400('Input exceeds the 1 MB limit.');

  const from = resolveFrom(raw.from, text);
  if (from === null) return err400(`Unknown "from" delimiter "${raw.from}". Valid: auto (default), newline, comma, semicolon, tab, pipe, space.`);

  const to = String(raw.to ?? raw.to_delimiter ?? 'comma').toLowerCase().trim();
  if (!OUT_MODES.has(to)) return err400(`Unknown "to" mode "${raw.to}". Valid: ${[...OUT_MODES].join(', ')}.`);

  const quote = String(raw.quote ?? 'none').toLowerCase().trim();
  if (!(quote in QUOTES)) return err400(`Unknown "quote" mode "${raw.quote}". Valid: none, single, double, backtick.`);

  const sort = String(raw.sort ?? 'none').toLowerCase().trim();
  if (!['none', 'asc', 'desc', 'length'].includes(sort)) return err400(`Unknown "sort" mode "${raw.sort}". Valid: none, asc, desc, length.`);

  const dedupeRaw = String(raw.dedupe ?? raw.dedupe?.toString?.() ?? 'false').toLowerCase();
  let dedupe = dedupeRaw === 'true' || dedupeRaw === '1';
  let dedupeCI = false;
  if (dedupeRaw === 'ci' || dedupeRaw === 'case-insensitive') { dedupe = true; dedupeCI = true; }
  if (raw.dedupe === true) dedupe = true;

  const doTrim = String(raw.trim ?? 'true').toLowerCase() !== 'false';
  const dropEmpty = String(raw.drop_empty ?? raw.dropempty ?? 'true').toLowerCase() !== 'false';
  const spacing = String(raw.spacing ?? 'false').toLowerCase() === 'true';

  const { items: rawItems, detected } = splitItems(text, from);
  const rawCount = rawItems.length;

  let items = rawItems.map(it => (doTrim ? it.trim() : it));
  const trimmedCount = rawItems.filter((it, i) => it !== items[i]).length;
  if (dropEmpty) items = items.filter(it => it !== '');
  const droppedEmpty = rawCount - items.length;

  let duplicatesRemoved = 0;
  if (dedupe) {
    const seen = new Set();
    const kept = [];
    for (const it of items) {
      const key = dedupeCI ? it.toLowerCase() : it;
      if (seen.has(key)) { duplicatesRemoved++; continue; }
      seen.add(key);
      kept.push(it);
    }
    items = kept;
  }

  if (sort === 'asc') items.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  else if (sort === 'desc') items.sort((a, b) => a < b ? 1 : a > b ? -1 : 0);
  else if (sort === 'length') items.sort((a, b) => a.length - b.length || (a < b ? -1 : 1));

  const q = QUOTES[quote];
  let outText;
  if (to === 'json') outText = JSON.stringify(items, null, 2);
  else if (to === 'html') outText = `<ul>\n${items.map(it => `  <li>${escHtml(it)}</li>`).join('\n')}\n</ul>`;
  else if (to === 'newline') outText = items.map(it => q + it + q).join('\n');
  else {
    const d = DELIMS[to];
    const joiner = spacing && (to === 'comma' || to === 'semicolon') ? d + ' ' : d;
    outText = items.map(it => q + it + q).join(joiner);
  }

  return Response.json({
    input: { delimiter_used: from === 'auto' ? `auto → ${detected}` : from, item_count: rawCount },
    output: { mode: to, count: items.length, text: outText, items: to === 'json' ? undefined : items },
    changes: { trimmed: trimmedCount, dropped_empty: droppedEmpty, duplicates_removed: duplicatesRemoved, sorted: sort !== 'none' },
    full_tool: FULL_TOOL,
    generated_by: 'Formatho edge API — zero tracking',
  }, { headers: JSON_HEADERS });
}

const API_HELP = {
  description: 'Convert any list between delimiters and formats. Input auto-detects newline/comma/semicolon/tab/pipe/space.',
  example_get: `${HOST}/api?text=${encodeURIComponent('apple\nbanana\ncherry')}&to=comma`,
  example_post: `curl -X POST ${HOST}/api -H 'Content-Type: application/json' -d '{"text":"b, a, a","from":"comma","to":"json","dedupe":true,"sort":"asc"}'`,
  params: {
    text: 'required — the list to convert (GET query or POST JSON body); 1 MB max',
    from: 'input delimiter: auto (default), newline, comma, semicolon, tab, pipe, space',
    to: 'output mode: comma (default), newline, semicolon, tab, pipe, space, json, html',
    quote: 'wrap items: none (default), single, double, backtick',
    dedupe: 'true, or ci for case-insensitive dedupe (default false)',
    sort: 'none (default), asc, desc, length',
    trim: 'trim whitespace around items (default true)',
    drop_empty: 'remove empty items (default true)',
    spacing: 'add a space after comma/semicolon in output (default false)',
  },
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
      if (url.searchParams.toString() === '' && request.method === 'GET') return Response.json(API_HELP, { headers: JSON_HEADERS });
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
