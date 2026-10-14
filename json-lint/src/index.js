// Privacy-First JSON Lint API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://json-lint-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/json-lint';
const MAX_BYTES = 262144;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JSON Lint Online — Validate JSON &amp; Find Errors | Free &amp; Private</title>
<meta name="description" content="Lint JSON online: exact line/column error positions, duplicate key detection, trailing comma and comment detection, nesting stats. Free, privacy-first edge API. Full tool on formatho.com.">
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
  "name": "JSON Lint Online — Free & Private",
  "url": "https://json-lint-formatho.filesformatho.workers.dev/",
  "description": "Lint JSON online: exact line/column error positions, duplicate key detection, trailing comma and comment detection, nesting stats. Free, privacy-first edge API. Full tool on formatho.com.",
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
  <h1>JSON Lint — Validate JSON &amp; Find Errors</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — catch a trailing comma with its exact position</h2>
<pre><code>curl "${HOST}/api?json=%7B%22a%22%3A%201%2C%7D"</code></pre>
<p>Returns <code>valid: false</code> with <code>{"line":1,"column":9,"message":"Trailing comma before '}'"}</code> — plus the offending context.</p>
<h2>Usage — duplicate key detection</h2>
<pre><code>curl -X POST "${HOST}/api" -d '{"id": 1, "name": "a", "name": "b"}'</code></pre>
<p>Strict JSON.parse accepts this (last key silently wins) — the linter flags <code>$.name</code> as a duplicate with both line numbers.</p>
<h2>What it checks</h2>
<ul>
  <li>Strict JSON syntax with <strong>line/column positions</strong> and context snippets</li>
  <li>Trailing commas, <code>//</code> and <code>/* */</code> comments, BOM — the three classic paste errors</li>
  <li>Duplicate keys per object (with full paths like <code>$.users[0].name</code>)</li>
  <li>Stats: bytes, lines, max nesting depth, object/array/key counts</li>
</ul>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> linting runs in-memory at the edge; nothing you send is logged or stored.</div>
<h2>Full browser tool</h2>
<p>Lint JSON entirely client-side: <a href="${FULL_TOOL}">JSON Lint on formatho.com</a>.</p>
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

const LLMS_TXT = "# JSON Lint Online — Free & Private\n\n> Lint JSON: exact line/column error positions, duplicate key detection, trailing comma and comment detection, nesting stats. Free, privacy-first edge API. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://json-lint-formatho.filesformatho.workers.dev/\n- [JSON API]: https://json-lint-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/json-lint\n- [All 71 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

const byteLen = (s) => new TextEncoder().encode(s).length;

// Build 0-based line start offsets for line/col lookup.
function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}
function lineCol(starts, pos) {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
  return { line: lo + 1, column: pos - starts[lo] + 1 };
}

// Single-pass string-aware scanner: finds comments, trailing commas, duplicate keys,
// and collects structural stats. Returns { errors, warnings, stats }.
function scan(text) {
  const errors = [];
  const warnings = [];
  const stats = { chars: text.length, lines: 1, max_depth: 0, objects: 0, arrays: 0, keys: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0 };
  const starts = lineStarts(text);
  stats.lines = starts.length;

  // Frame stack for duplicate-key detection with JSON-path-style reporting.
  // Frame: { isObj, path, seen: Map<key, line[]>, pendingKey, expectKey }
  const stack = [];
  const root = { isObj: false, path: '$', seen: new Map(), pendingKey: null, expectKey: false };
  stack.push(root);
  let lastSig = '';   // last significant char outside strings
  let lastSigPos = -1;

  const addError = (message, pos, upto = 0) => {
    const { line, column } = lineCol(starts, pos);
    errors.push({ message, position: pos, line, column, context: text.slice(Math.max(0, pos - 30), Math.min(text.length, pos + 30 + upto)).replace(/\n/g, '\\n') });
  };

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'") {
      if (c === "'") { addError(`Single quotes are not valid JSON (strings must use double quotes)`, i); i++; continue; }
      // scan string
      const strStart = i;
      i++;
      let closed = false;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === '"') { closed = true; break; }
        if (text[i] === '\n') break; // unterminated
        i++;
      }
      if (!closed && (i >= text.length || text[i] === '\n')) {
        addError('Unterminated string', strStart);
        i++;
        continue;
      }
      const tok = text.slice(strStart + 1, i);
      i++;
      // key or value?
      let j = i;
      while (j < text.length && /\s/.test(text[j])) j++;
      const frame = stack[stack.length - 1];
      if (frame.isObj && frame.expectKey && text[j] === ':') {
        // KEY
        const { line } = lineCol(starts, strStart);
        const keyPath = frame.path === '$' ? '$.' + tok : frame.path + '.' + tok;
        if (frame.seen.has(tok)) {
          frame.seen.get(tok).push(line);
        } else {
          frame.seen.set(tok, [line]);
        }
        frame.pendingKey = tok;
        frame.pendingKeyPath = keyPath;
        frame.expectKey = false;
        stats.keys++;
      } else {
        stats.strings++;
      }
      lastSig = '"'; lastSigPos = strStart;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') { addError('Comments are not allowed in JSON (found // — use JSONC or strip comments first)', i); const nl = text.indexOf('\n', i); i = nl === -1 ? text.length : nl; continue; }
    if (c === '/' && text[i + 1] === '*') { addError('Comments are not allowed in JSON (found /* ... */ block comment)', i); const end = text.indexOf('*/', i); i = end === -1 ? text.length : end + 2; continue; }
    if (c === '{' || c === '[') {
      const frame = stack[stack.length - 1];
      const isObj = c === '{';
      const childPath = stack.length === 1
        ? '$'
        : frame.isObj
          ? (frame.pendingKeyPath ?? frame.path + '.?')
          : frame.path + '[' + (frame.arrIndex ?? 0) + ']';
      stack.push({ isObj, path: childPath, seen: new Map(), pendingKey: null, pendingKeyPath: null, expectKey: isObj, arrIndex: 0 });
      stats[isObj ? 'objects' : 'arrays']++;
      stats.max_depth = Math.max(stats.max_depth, stack.length - 1);
      lastSig = c; lastSigPos = i;
      i++;
      continue;
    }
    if (c === '}' || c === ']') {
      if (lastSig === ',') addError(`Trailing comma before '${c}'`, lastSigPos);
      const frame = stack.pop() || root;
      // report duplicates for the object being closed
      if (frame.isObj) {
        for (const [key, lines] of frame.seen) {
          if (lines.length > 1) warnings.push({ message: `Duplicate key "${key}" — later values silently overwrite earlier ones (JSON.parse keeps the last)`, path: frame.path + '.' + key, lines });
        }
      }
      lastSig = c; lastSigPos = i;
      i++;
      continue;
    }
    if (c === ',') {
      const frame = stack[stack.length - 1];
      if (frame.isObj) frame.expectKey = true;
      else frame.arrIndex = (frame.arrIndex ?? 0) + 1;
      lastSig = ','; lastSigPos = i;
      i++;
      continue;
    }
    if (/[0-9-]/.test(c) && !/\w/.test(lastSig)) {
      const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
      if (m) { stats.numbers++; i += m[0].length; lastSig = '0'; lastSigPos = i - 1; continue; }
    }
    if (/[a-z]/i.test(c)) {
      const rest = text.slice(i, i + 5).toLowerCase();
      if (rest.startsWith('true')) { stats.booleans++; i += 4; lastSig = 't'; lastSigPos = i - 1; continue; }
      if (rest.startsWith('false')) { stats.booleans++; i += 5; lastSig = 't'; lastSigPos = i - 1; continue; }
      if (rest.startsWith('null')) { stats.nulls++; i += 4; lastSig = 't'; lastSigPos = i - 1; continue; }
    }
    i++;
  }

  return { errors, warnings, stats };
}

async function parseArgs(request) {
  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object' || body.json === undefined && body.input === undefined) return { __bad: true };
      return { json: body.json !== undefined ? body.json : body.input };
    }
    return { json: await request.text() };
  }
  const url = new URL(request.url);
  return { json: url.searchParams.get('json') ?? url.searchParams.get('q') };
}

async function handleApi(request) {
  const { json, __bad } = await parseArgs(request);
  if (__bad) return err400('POST body must be JSON: {"json": "..."} (or send the raw JSON as text body)');
  if (json === null || json === undefined || String(json) === '') return err400('Missing required parameter: json (the JSON text to lint)');

  let text = String(json);
  // Strip UTF-8 BOM with a precise note (BOM makes strict parsers fail).
  let bom = false;
  if (text.charCodeAt(0) === 0xfeff) { text = text.slice(1); bom = true; }
  if (byteLen(text) > MAX_BYTES) return err400(`Input too large: ${byteLen(text)} bytes (max ${MAX_BYTES} = 256KB).`);

  const { errors, warnings, stats } = scan(text);

  if (errors.length > 0) {
    return Response.json({ valid: false, errors: errors.slice(0, 10), error_count: errors.length, warnings, stats, bom, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  }

  try {
    const parsed = JSON.parse(text);
    return Response.json({ valid: true, errors: [], warnings, stats, bom, type: Array.isArray(parsed) ? 'array' : parsed === null ? 'null' : typeof parsed, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  } catch (e) {
    // Scanner missed it (e.g. missing colon, bad escape): fall back to V8's position.
    const m = /position (\d+)/.exec(e.message || '');
    const first = { message: (e.message || String(e)).slice(0, 300) };
    if (m) {
      const pos = Math.min(Number(m[1]), text.length);
      const starts = lineStarts(text);
      Object.assign(first, lineCol(starts, pos), { position: pos, context: text.slice(Math.max(0, pos - 30), Math.min(text.length, pos + 30)).replace(/\n/g, '\\n') });
    }
    return Response.json({ valid: false, errors: [first], error_count: 1, warnings, stats, bom, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  }
}

// /api directory listing (GET without params)
function apiIndex(request) {
  if (new URL(request.url).searchParams.has('json')) return null;
  return Response.json({
    tool: 'JSON Lint', method: 'GET/POST',
    params: { json: 'URL-encoded JSON text (GET ?json=...)', 'POST body': 'raw JSON text, or {"json": "..."}' },
    returns: { valid: 'boolean', errors: '[{message, line, column, position, context}] (max 10)', warnings: '[{message, path, lines}] — duplicate keys', stats: '{chars, lines, max_depth, objects, arrays, keys, strings, numbers, booleans, nulls}', bom: 'true if a UTF-8 BOM was stripped' },
    limits: { max_bytes: MAX_BYTES },
    example: `${HOST}/api?json=%7B%22a%22%3A1%7D`,
    calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

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
      if (request.method === 'GET') { const idx = apiIndex(request); if (idx) return idx; }
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
