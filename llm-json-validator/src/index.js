// Privacy-First LLM JSON Validator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://llm-json-validator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/llm-json-validator';
const MAX_BYTES = 262144;

const FENCE_RE = /```(?:json|jsonc|javascript|js)?\s*([\s\S]*?)```/i;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LLM JSON Validator Online — Free &amp; Private</title>
<meta name="description" content="Validate and repair JSON from LLM output: strip markdown fences and prose, remove trailing commas, fix single quotes, unquoted keys and Python None/True/False. Free, privacy-first edge API. Full tool on formatho.com.">
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
  "name": "LLM JSON Validator Online — Free & Private",
  "url": "https://llm-json-validator-formatho.filesformatho.workers.dev/",
  "description": "Validate and repair JSON from LLM output: strip markdown fences and prose, remove trailing commas, fix single quotes, unquoted keys and Python None/True/False. Free, privacy-first edge API. Full tool on formatho.com.",
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
  <h1>LLM JSON Validator — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — repair an LLM response</h2>
<pre><code>curl "${HOST}/api?json=Here%20is%20the%20JSON%3A%20%60%60%60json%0A%7B%20%27name%27%3A%20%27test%27%2C%20%27count%27%3A%20None%2C%20%7D%0A%60%60%60"</code></pre>
<p>Strips <code>Here is the JSON:</code> and the markdown fence, quotes the keys, fixes <code>None</code> → <code>null</code>, drops the trailing comma — and returns the parsed object with a list of every repair applied.</p>
<h2>Usage — strict validation</h2>
<pre><code>curl "${HOST}/api?mode=validate&amp;json=%7B%27a%27%3A1%7D"</code></pre>
<p><code>mode=validate</code> only extracts fenced blocks, then strict-parses — no repairs, exact error position (line/column) on failure.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> parsing runs in-memory at the edge; nothing you send is logged or stored.</div>
<h2>Full browser tool</h2>
<p>Validate LLM output entirely client-side: <a href="${FULL_TOOL}">LLM JSON Validator on formatho.com</a>.</p>
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

const LLMS_TXT = "# LLM JSON Validator Online — Free & Private\n\n> Validate and repair JSON from LLM output: strip markdown fences and prose, remove trailing commas, fix single quotes, unquoted keys and Python None/True/False. Free, privacy-first edge API. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://llm-json-validator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://llm-json-validator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/llm-json-validator\n- [All 46 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

const byteLen = (s) => new TextEncoder().encode(s).length;

// --- extraction ---
function extract(raw, repairs) {
  let s = raw;
  const m = FENCE_RE.exec(s);
  if (m) {
    s = m[1].trim();
    repairs.push({ fix: 'stripped_markdown_fence', count: 1 });
  }
  const first = s.search(/[{[]/);
  if (first > 0) {
    s = s.slice(first);
    repairs.push({ fix: 'stripped_leading_prose', count: 1 });
  }
  const lastBrace = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (lastBrace !== -1 && lastBrace < s.length - 1) {
    s = s.slice(0, lastBrace + 1);
    repairs.push({ fix: 'stripped_trailing_prose', count: 1 });
  }
  return s;
}

// --- repairs ---
function removeTrailingCommas(s) {
  let count = 0;
  const out = s.replace(/,(\s*[}\]])/g, (_, t) => { count++; return t; });
  return { out, count };
}

// String-aware Python constant fix: None/True/False → null/true/false outside string literals.
function fixPythonConstants(s) {
  let count = 0, out = '', inStr = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      out += c;
      if (c === '\\') { if (i + 1 < s.length) { out += s[i + 1]; i++; } }
      else if (c === inStr) inStr = null;
    } else if (c === '"' || c === "'") {
      inStr = c; out += c;
    } else {
      const rest = s.slice(i);
      let m = /^None(?![\w$])/.exec(rest) || /^True(?![\w$])/.exec(rest) || /^False(?![\w$])/.exec(rest);
      if (m) {
        out += m[0] === 'None' ? 'null' : m[0] === 'True' ? 'true' : 'false';
        count++;
        i += m[0].length - 1;
      } else out += c;
    }
  }
  return { out, count };
}

// String-aware quote normalization + unquoted-key quoting.
function fixQuotesAndKeys(s) {
  let out = '', inStr = null, quotedKeys = 0, convertedQuotes = 0;
  let prevSignificant = ''; // last non-whitespace char emitted (outside strings)
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') {
        const nxt = s[i + 1] ?? '';
        if (inStr === "'" && nxt === "'") { out += "'"; } // \' inside single-quoted → plain '
        else if (inStr === "'" && nxt === '"') { out += '\\"'; } // " inside single-quoted → escape for double
        else out += c + nxt;
        i++;
      } else if (c === inStr) {
        out += '"'; inStr = null; prevSignificant = '"';
      } else if (inStr === "'" && c === '"') {
        out += '\\"'; // raw " inside single-quoted string
      } else out += c;
    } else if (c === '"' || c === "'") {
      inStr = c;
      if (c === "'") convertedQuotes++;
      out += '"';
      prevSignificant = '"';
    } else if (c === '{' || c === '[' || c === ',') {
      // peek ahead: optional ws, identifier, ws, ':' → quote the identifier as a key
      if (c !== '[') {
        const m = /^\s*([A-Za-z_$][\w$-]*)\s*:/.exec(s.slice(i + 1));
        if (m) {
          const ws = m[0].slice(0, m[0].indexOf(m[1]));
          out += c + ws + '"' + m[1] + '"';
          i += m[0].length - 1;
          quotedKeys++;
          continue;
        }
      }
      out += c; prevSignificant = c;
    } else if (!/\s/.test(c)) {
      out += c; prevSignificant = c;
    } else out += c;
  }
  return { out, count: convertedQuotes + quotedKeys, quotedKeys, convertedQuotes };
}

// --- error position ---
function errorDetail(e, text) {
  const posMatch = /position (\d+)/.exec(e.message || '');
  const detail = { message: (e.message || String(e)).slice(0, 300) };
  if (posMatch) {
    const pos = Math.min(Number(posMatch[1]), text.length);
    const before = text.slice(0, pos);
    const lines = before.split('\n');
    detail.position = pos;
    detail.line = lines.length;
    detail.column = pos - before.lastIndexOf('\n');
    const ctxStart = Math.max(0, before.lastIndexOf('\n', pos - 41));
    detail.context = text.slice(ctxStart, Math.min(text.length, pos + 40)).replace(/\n/g, '\\n');
  }
  return detail;
}

async function parseArgs(request) {
  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return { __bad: true };
      return { json: body.json !== undefined ? body.json : body.input, mode: body.mode };
    }
    const text = await request.text();
    return { json: text, mode: new URL(request.url).searchParams.get('mode') };
  }
  const url = new URL(request.url);
  return { json: url.searchParams.get('json') ?? url.searchParams.get('q'), mode: url.searchParams.get('mode') };
}

async function handleApi(request) {
  const { json, mode, __bad } = await parseArgs(request);
  if (__bad) return err400('POST body must be JSON: {"json": "...", "mode": "repair"|"validate"}');
  if (mode !== null && mode !== undefined && !['repair', 'validate'].includes(mode)) return err400(`mode must be "repair" or "validate" (got "${mode}")`);
  if (json === null || json === undefined || String(json) === '') return err400('Missing required parameter: json (the raw LLM output to validate)');
  const raw = String(json);
  if (byteLen(raw) > MAX_BYTES) return err400(`Input too large: ${byteLen(raw)} bytes (max ${MAX_BYTES} = 256KB).`);

  const repairs = [];
  const extracted = extract(raw, repairs);

  // Strict parse of the extracted text.
  try {
    const parsed = JSON.parse(extracted);
    return Response.json({ valid: true, repaired: repairs.length > 0, repairs, original_length: raw.length, extracted_length: extracted.length, type: Array.isArray(parsed) ? 'array' : typeof parsed, parsed, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  } catch (e) {
    if (mode === 'validate') {
      return Response.json({ valid: false, repaired: false, repairs, original_length: raw.length, extracted_length: extracted.length, error: errorDetail(e, extracted), calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
    }
  }

  // Repair pipeline: stages apply cumulatively; stop as soon as the text parses.
  let current = extracted;
  const applied = [];
  const stages = [
    { name: 'removed_trailing_commas', run: removeTrailingCommas },
    { name: 'fixed_python_constants', run: fixPythonConstants },
    { name: 'converted_quotes_and_quoted_keys', run: fixQuotesAndKeys },
  ];
  for (const stage of stages) {
    try { JSON.parse(current); break; }
    catch { /* not valid yet */ }
    const { out, count } = stage.run(current);
    if (count === 0 || out === current) continue;
    current = out;
    applied.push({ fix: stage.name, count });
  }

  // Safety net: if the cumulative chain broke something, retry each stage alone.
  try { JSON.parse(current); } catch {
    for (const stage of stages) {
      const { out, count } = stage.run(extracted);
      if (!count) continue;
      try { JSON.parse(out); current = out; applied.length = 0; applied.push({ fix: stage.name, count }); break; } catch { /* next */ }
    }
  }

  try {
    const parsed = JSON.parse(current);
    const allRepairs = [...repairs, ...applied];
    return Response.json({ valid: true, repaired: true, repairs: allRepairs, original_length: raw.length, extracted_length: extracted.length, final_length: current.length, type: Array.isArray(parsed) ? 'array' : typeof parsed, parsed, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  } catch (e) {
    return Response.json({ valid: false, repaired: false, repairs, repairs_attempted: stages.map((s) => s.name), original_length: raw.length, extracted_length: extracted.length, error: errorDetail(e, current), calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  }
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
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
