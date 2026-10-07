// Privacy-First XML ⇄ JSON Converter API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://xml-json-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/xml-json';
const MAX_BYTES = 262144; // 256 KB

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>XML to JSON Converter Online (Both Directions) — Free &amp; Private</title>
<meta name="description" content="Convert XML to JSON and JSON back to XML at the edge — free API with zero tracking. Attributes as @keys, arrays for repeated elements, round-trip-safe typing. Full tool on formatho.com.">
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
  "name": "XML to JSON Converter Online (Both Directions) — Free & Private",
  "url": "https://xml-json-formatho.filesformatho.workers.dev/",
  "description": "Convert XML to JSON and JSON back to XML at the edge — free API with zero tracking. Attributes as @keys, arrays for repeated elements, round-trip-safe typing. Full tool on formatho.com.",
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
  <h1>XML ⇄ JSON Converter Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># XML → JSON
curl "${HOST}/api?xml=%3Croot%3E%3Citem%3Ehello%3C/item%3E%3C/root%3E"

# JSON → XML
curl "${HOST}/api?json=%7B%22item%22%3A%5B1%2C2%5D%7D"

curl -X POST "${HOST}/api" \\
  -H 'Content-Type: application/json' \\
  -d '{"json":{"item":[1,2],"@lang":"en"},"root":"catalog","indent":2}'</code></pre>
<p>Direction is auto-detected: pass <code>xml</code> to convert to JSON, <code>json</code> to convert to XML. JSON→XML params: <code>root</code> (root element name, default <code>root</code>), <code>indent</code> (0–8, default 2; 0 = minified). Convention: attributes ⇄ <code>@keys</code>, mixed content ⇄ <code>#text</code>, repeated elements ⇄ arrays; <code>true</code>/<code>false</code>/round-trip-safe numbers auto-typed (zip codes &amp; big IDs stay strings). GET query limit 8 KB — POST for larger documents (max 256 KB).</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> documents are converted in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Convert XML ⇄ JSON entirely client-side: <a href="${FULL_TOOL}">XML ⇄ JSON Converter on formatho.com</a>.</p>
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

// --- XML parser (well-formedness validating, no dependencies) — shared with xml-formatter ---

function xmlError(msg, idx, input) {
  const upto = input.slice(0, idx);
  const line = (upto.match(/\n/g) || []).length + 1;
  const col = idx - upto.lastIndexOf('\n');
  return Object.assign(new Error(msg), { position: `line ${line}, column ${col}` });
}

function parseXml(input) {
  let i = 0;
  const len = input.length;
  const doc = { type: 'doc', children: [] };
  const stack = [doc];
  const push = (node) => stack[stack.length - 1].children.push(node);

  while (i < len) {
    if (input[i] !== '<') {
      const next = input.indexOf('<', i);
      const end = next === -1 ? len : next;
      const text = decodeEnt(input.slice(i, end));
      if (text.trim()) push({ type: 'text', text });
      i = end;
      continue;
    }
    if (input.startsWith('<!--', i)) {
      const end = input.indexOf('-->', i + 4);
      if (end === -1) throw xmlError('Unterminated comment', i, input);
      push({ type: 'comment', text: input.slice(i + 4, end).trim() });
      i = end + 3;
      continue;
    }
    if (input.startsWith('<![CDATA[', i)) {
      const end = input.indexOf(']]>', i + 9);
      if (end === -1) throw xmlError('Unterminated CDATA section', i, input);
      push({ type: 'cdata', text: input.slice(i + 9, end) });
      i = end + 3;
      continue;
    }
    const close = input.indexOf('>', i);
    if (close === -1) throw xmlError('Unterminated tag (missing ">")', i, input);
    const raw = input.slice(i + 1, close);

    if (raw.startsWith('?')) {
      const endq = raw.lastIndexOf('?');
      if (endq === 0) throw xmlError('Malformed processing instruction', i, input);
      push({ type: 'pi', text: raw.slice(1, endq).trim() });
      i = close + 1;
      continue;
    }
    if (raw.startsWith('!')) {
      if (/^!DOCTYPE/i.test(raw)) {
        let depth = (raw.match(/\[/g) || []).length - (raw.match(/\]/g) || []).length;
        let j = close;
        while (depth > 0) {
          j = input.indexOf('>', j + 1);
          if (j === -1) throw xmlError('Unterminated DOCTYPE internal subset', i, input);
          const seg = input.slice(close + 1, j);
          depth += (seg.match(/\[/g) || []).length - (seg.match(/\]/g) || []).length;
        }
        push({ type: 'doctype', text: input.slice(i + 2, j).trim() });
        i = j + 1;
        continue;
      }
      throw xmlError('Unsupported declaration <!' + raw.slice(1, 12), i, input);
    }
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim();
      const top = stack[stack.length - 1];
      if (top.type !== 'element' || top.name !== name) {
        const expected = top.type === 'element' ? `, expected </${top.name}>` : ' — no open element';
        throw xmlError(`Mismatched closing tag </${name}>${expected}`, i, input);
      }
      stack.pop();
      i = close + 1;
      continue;
    }

    const m = raw.match(/^([A-Za-z_:][\w.:-]*)([\s\S]*)$/);
    if (!m) throw xmlError('Malformed start tag', i, input);
    const name = m[1];
    let rest = m[2];
    const selfClose = /\/\s*$/.test(rest);
    if (selfClose) rest = rest.replace(/\/\s*$/, '');
    if (/\S/.test(rest.replace(/([A-Za-z_:][\w.:-]*)\s*=\s*("[^"]*"|'[^']*')/g, ''))) {
      throw xmlError('Malformed or unquoted attributes in <' + name + '>', i, input);
    }
    const attrs = [];
    const attrRe = /([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let am;
    while ((am = attrRe.exec(rest)) !== null) {
      attrs.push({ name: am[1], value: decodeEnt(am[3] !== undefined ? am[3] : am[4]) });
    }
    const seen = new Set();
    for (const a of attrs) {
      if (seen.has(a.name)) throw xmlError(`Duplicate attribute "${a.name}" in <${name}>`, i, input);
      seen.add(a.name);
    }
    const el = { type: 'element', name, attrs, children: [], selfClose };
    stack[stack.length - 1].children.push(el);
    if (!selfClose) stack.push(el);
    i = close + 1;
  }

  if (stack.length !== 1) {
    throw xmlError(`Unclosed tag <${stack[stack.length - 1].name}>`, Math.max(0, len - 1), input);
  }
  const roots = doc.children.filter((c) => c.type === 'element');
  if (roots.length === 0) throw xmlError('No root element found', 0, input);
  if (roots.length > 1) throw xmlError('Multiple root elements found — XML allows exactly one', 0, input);
  return doc;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeEnt(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return m; } })
    .replace(/&#(\d+);/g, (m, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return m; } })
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ENT[n]);
}
function escText(s) {
  return s.replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return escText(s).replace(/"/g, '&quot;');
}

// --- XML → JSON ---

function coerce(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  const n = Number(s);
  if (s !== '' && String(n) === s && Number.isFinite(n)) return n; // round-trip-safe numbers only ("007", "1e3", big IDs stay strings)
  return s;
}

function elementToJson(el, stats, depth) {
  stats.elements++;
  stats.maxDepth = Math.max(stats.maxDepth, depth);
  const attrs = {};
  for (const a of el.attrs) attrs['@' + a.name] = coerce(a.value);
  const texts = [];
  const groups = {};
  const order = [];
  for (const c of el.children) {
    if (c.type === 'text') {
      const t = c.text.trim();
      if (t) texts.push(t);
    } else if (c.type === 'cdata') {
      texts.push(c.text);
    } else if (c.type === 'element') {
      if (!groups[c.name]) { groups[c.name] = []; order.push(c.name); }
      groups[c.name].push(elementToJson(c, stats, depth + 1));
    } else {
      stats.skippedNodes++;
    }
  }
  const hasAttrs = el.attrs.length > 0;
  const hasKids = order.length > 0;
  const textVal = texts.length === 0 ? null : texts.length === 1 ? coerce(texts[0]) : texts.map(coerce);

  if (!hasAttrs && !hasKids) return textVal === null ? null : textVal; // <x/> → null; <x>hi</x> → "hi"
  if (!hasKids) return Object.assign(textVal === null ? {} : { '#text': textVal }, attrs); // attrs [+ text]
  const out = Object.assign({}, attrs);
  for (const name of order) out[name] = groups[name].length > 1 ? groups[name] : groups[name][0];
  if (textVal !== null) out['#text'] = textVal;
  return out;
}

function docToJson(doc) {
  const stats = { elements: 0, maxDepth: 0, skippedNodes: 0 };
  const rootEl = doc.children.find((c) => c.type === 'element');
  const json = { [rootEl.name]: elementToJson(rootEl, stats, 1) };
  return { json, stats };
}

// --- JSON → XML ---

const NAME_RE = /^[A-Za-z_:][\w.:-]*$/;
function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

function jsonToXml(value, name, indentStr, level, stats) {
  const pad = indentStr ? indentStr.repeat(level) : '';
  const nl = indentStr ? '\n' : '';
  let attrs = '';
  let text = null;
  const kids = [];

  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('@')) {
        const an = k.slice(1);
        if (!NAME_RE.test(an)) throw new Error(`Invalid attribute name "${an}" — must match ${NAME_RE}`);
        if (v === null || typeof v === 'object') throw new Error(`Attribute "@${an}" value must be a string, number or boolean`);
        attrs += ` ${an}="${escAttr(String(v))}"`;
      } else if (k === '#text') {
        const parts = Array.isArray(v) ? v : [v];
        text = parts.map((t) => escText(String(t))).join(' ');
      } else {
        if (!NAME_RE.test(k)) throw new Error(`Invalid element name "${k}" — must match ${NAME_RE}`);
        for (const val of Array.isArray(v) ? v : [v]) kids.push(jsonToXml(val, k, indentStr, level + 1, stats));
      }
    }
  } else if (Array.isArray(value)) {
    throw new Error('Nested arrays are not convertible — array values must sit under an object key');
  } else if (value === null || value === undefined) {
    return `${pad}<${name}${attrs}/>`;
  } else {
    text = escText(String(value));
  }

  if (!kids.length) {
    const inner = text === null ? '' : text;
    return inner === '' ? `${pad}<${name}${attrs}/>` : `${pad}<${name}${attrs}>${inner}</${name}>`;
  }
  stats.elements += kids.length;
  const inner = [text === null ? null : pad + indentStr + text, ...kids].filter((x) => x !== null).join(nl);
  return `${pad}<${name}${attrs}>${nl}${inner}${nl}${pad}</${name}>`;
}

function valueToXml(value, rootName, indentStr) {
  const stats = { elements: 1 };
  const xml = jsonToXml(value, rootName, indentStr, 0, stats) + '\n';
  return { xml, stats };
}

// --- Input handling ---

async function getInput(request, url) {
  const qXml = url.searchParams.get('xml');
  const qJson = url.searchParams.get('json');
  if (qXml !== null && qJson !== null) return { error: 'Pass either xml or json, not both' };
  if (qXml !== null) {
    if (qXml.length > 8192) return { error: 'GET "xml" query param limited to 8 KB — POST { "xml": ... } instead' };
    return { xml: qXml };
  }
  if (qJson !== null) {
    if (qJson.length > 8192) return { error: 'GET "json" query param limited to 8 KB — POST { "json": ... } instead' };
    return { json: qJson };
  }
  try {
    const body = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return { error: 'Body must be a JSON object: { "xml": "..." } or { "json": ... , "root": "...", "indent": 2 }' };
    }
    if (body.xml !== undefined && body.json !== undefined) return { error: 'Pass either xml or json, not both' };
    if (typeof body.xml === 'string') {
      if (body.xml.length > MAX_BYTES) return { error: `XML exceeds ${MAX_BYTES} byte limit` };
      return { xml: body.xml };
    }
    if (body.json !== undefined) {
      let value = body.json;
      if (typeof value === 'string') {
        if (value.length > MAX_BYTES) return { error: `JSON exceeds ${MAX_BYTES} byte limit` };
        try { value = JSON.parse(value); } catch (e) { return { error: `Invalid JSON: ${e.message}` }; }
      }
      return { json: value, root: body.root, indent: body.indent };
    }
    return { error: 'Missing required field: xml or json' };
  } catch {
    return { error: 'Invalid JSON body — expected { "xml": "..." } or { "json": ... }' };
  }
}

async function handleApi(request, url) {
  const input = await getInput(request, url);
  if (input.error) return Response.json({ error: input.error }, { status: 400, headers: JSON_HEADERS });

  if (input.xml !== undefined) {
    try {
      const doc = parseXml(input.xml);
      const { json, stats } = docToJson(doc);
      return Response.json({
        ok: true,
        direction: 'xml→json',
        elements: stats.elements,
        max_depth: stats.maxDepth,
        skipped_nodes: stats.skippedNodes,
        json,
        decoded_by: 'Formatho edge API — zero tracking',
        full_tool: FULL_TOOL,
      }, { headers: JSON_HEADERS });
    } catch (e) {
      return Response.json({ ok: false, error: e.message, position: e.position || null }, { status: 400, headers: JSON_HEADERS });
    }
  }

  // json → xml
  const rootParam = input.root !== undefined ? input.root : url.searchParams.get('root') || 'root';
  if (typeof rootParam !== 'string' || !NAME_RE.test(rootParam)) {
    return Response.json({ error: `Invalid root element name "${rootParam}" — must match ${NAME_RE}` }, { status: 400, headers: JSON_HEADERS });
  }
  const indentRaw = input.indent !== undefined ? input.indent : url.searchParams.get('indent') ?? '2';
  const indent = parseInt(indentRaw, 10);
  if (Number.isNaN(indent) || indent < 0 || indent > 8) {
    return Response.json({ error: 'Invalid indent — use 0 to 8 (0 = minified)' }, { status: 400, headers: JSON_HEADERS });
  }
  if (Array.isArray(input.json)) {
    return Response.json({ error: 'Root JSON value cannot be an array — wrap it in an object, e.g. { "item": [...] }' }, { status: 400, headers: JSON_HEADERS });
  }
  try {
    const { xml, stats } = valueToXml(input.json, rootParam, indent ? ' '.repeat(indent) : '');
    return Response.json({
      ok: true,
      direction: 'json→xml',
      root: rootParam,
      elements: stats.elements,
      xml,
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    }, { headers: JSON_HEADERS });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 400, headers: JSON_HEADERS });
  }
}

const LLMS_TXT = "# XML to JSON Converter Online (Both Directions) — Free & Private\n\n> Convert XML to JSON and JSON back to XML at the edge — free API with zero tracking. Attributes as @keys, arrays for repeated elements, round-trip-safe typing. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://xml-json-formatho.filesformatho.workers.dev/\n- [JSON API]: https://xml-json-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/xml-json\n- [All 49 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (url.pathname === '/api' && request.method === 'GET' && ![...url.searchParams.keys()].length) {
      return Response.json({
        usage: 'GET /api?xml=<urlencoded xml>  |  GET /api?json=<urlencoded json>  |  POST /api {"xml":"..."} or {"json":{...},"root":"catalog","indent":2}',
        params: {
          xml: 'XML document → converts to JSON (attributes as @keys, repeated elements as arrays, #text for mixed content)',
          json: 'JSON value (object) → converts to XML',
          root: 'JSON→XML root element name, default "root"',
          indent: 'JSON→XML indent 0-8, default 2 (0 = minified)',
        },
        example: `curl "${HOST}/api?xml=%3Croot%3E%3Citem%3Ehello%3C/item%3E%3C/root%3E"`,
      }, { headers: JSON_HEADERS });
    }
    if (url.pathname === '/api') return handleApi(request, url);
    if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
