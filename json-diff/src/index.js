// JSON Diff — structural diff of two JSON documents — formatho.com
// Landing at /, API at /api, sitemap.xml, llms.txt. Zero tracking, zero data collection.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://json-diff-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/json-diff';
const MAX_INPUT = 1024 * 1024; // 1MB per document

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}
function ptr(path) {
  if (path.length === 0) return '';
  return '/' + path.map((s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

function diffValues(a, b, path, out) {
  const ta = typeOf(a);
  const tb = typeOf(b);
  if (ta !== tb) {
    out.push({ path: ptr(path), op: 'type_changed', before: a, after: b });
    return;
  }
  if (ta === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of keys) {
      const inA = Object.hasOwn(a, k);
      const inB = Object.hasOwn(b, k);
      const p = [...path, k];
      if (inA && inB) diffValues(a[k], b[k], p, out);
      else if (inA) out.push({ path: ptr(p), op: 'removed', before: a[k] });
      else out.push({ path: ptr(p), op: 'added', after: b[k] });
    }
    return;
  }
  if (ta === 'array') {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const p = [...path, String(i)];
      if (i < a.length && i < b.length) diffValues(a[i], b[i], p, out);
      else if (i < a.length) out.push({ path: ptr(p), op: 'removed', before: a[i] });
      else out.push({ path: ptr(p), op: 'added', after: b[i] });
    }
    return;
  }
  if (a !== b) out.push({ path: ptr(path), op: 'changed', before: a, after: b });
}

function toPatch(diff) {
  return diff.map((d) => {
    if (d.op === 'added') return { op: 'add', path: d.path, value: d.after };
    if (d.op === 'removed') return { op: 'remove', path: d.path };
    return { op: 'replace', path: d.path, value: d.after };
  });
}

// Mini RFC 6902 applier (add/remove/replace) used to verify patch correctness.
function applyPatch(doc, patch) {
  let cur = structuredClone(doc);
  for (const op of patch) {
    if (typeof op.path !== 'string') throw new Error('bad path: ' + op.path);
    if (op.path !== '' && !op.path.startsWith('/')) throw new Error('bad path: ' + op.path);
    const segs = op.path.slice(1).split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
    if (op.op === 'add' && op.path === '') { cur = op.value; continue; }
    if (op.op === 'replace' && op.path === '') { cur = op.value; continue; }
    let node = cur;
    for (let i = 0; i < segs.length - 1; i++) {
      const s = segs[i];
      if (node == null || !(s in Object(node))) throw new Error('path not found: ' + op.path);
      node = node[s];
    }
    const key = segs[segs.length - 1];
    if (op.op === 'add') {
      if (Array.isArray(node)) {
        const idx = key === '-' ? node.length : Number(key);
        if (!Number.isInteger(idx) || idx < 0 || idx > node.length) throw new Error('bad add index: ' + op.path);
        node.splice(idx, 0, op.value);
      } else {
        if (node == null || typeof node !== 'object') throw new Error('add target not an object: ' + op.path);
        node[key] = op.value;
      }
    } else if (op.op === 'remove') {
      if (node == null || !(key in Object(node))) throw new Error('remove path not found: ' + op.path);
      if (Array.isArray(node)) {
        const idx = Number(key);
        if (!Number.isInteger(idx) || idx < 0 || idx >= node.length) throw new Error('bad remove index: ' + op.path);
        node.splice(idx, 1);
      } else delete node[key];
    } else if (op.op === 'replace') {
      if (node == null || !(key in Object(node))) throw new Error('replace path not found: ' + op.path);
      node[key] = op.value;
    } else throw new Error('unknown op: ' + op.op);
  }
  return cur;
}

function deepEqual(a, b) {
  if (a === b) return true;
  const ta = typeOf(a);
  if (ta !== typeOf(b)) return false;
  if (ta === 'array') {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (ta === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

function parseJsonParam(raw, name) {
  if (typeof raw !== 'string') throw new Error(name + ' is required (a JSON document as a string)');
  if (raw.length > MAX_INPUT) throw new Error(name + ' exceeds the 1MB limit (' + raw.length + ' chars)');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(name + ' is not valid JSON: ' + e.message);
  }
}

async function readParams(request, url) {
  let a = url.searchParams.get('a');
  let b = url.searchParams.get('b');
  let patch = url.searchParams.get('patch');
  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      let body;
      try { body = await request.json(); } catch (e) { throw new Error('request body is not valid JSON'); }
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        if (typeof body.a === 'string') a = a ?? body.a;
        if (typeof body.b === 'string') b = b ?? body.b;
        if (typeof body.a === 'object') a ??= JSON.stringify(body.a);
        if (typeof body.b === 'object') b ??= JSON.stringify(body.b);
        if (typeof body.patch === 'boolean') patch = patch ?? body.patch;
      }
    }
  }
  return { a, b, patch: patch === 'true' || patch === true };
}

async function handleApi(request) {
  const url = new URL(request.url);
  let p;
  try { p = await readParams(request, url); }
  catch (e) { return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS }); }

  let va, vb;
  try {
    va = parseJsonParam(p.a, 'a');
    vb = parseJsonParam(p.b, 'b');
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS });
  }

  const diff = [];
  diffValues(va, vb, [], diff);
  const counts = { added: 0, removed: 0, changed: 0, type_changed: 0 };
  for (const d of diff) counts[d.op]++;

  const out = {
    tool: 'json-diff',
    equal: diff.length === 0,
    counts,
    total_changes: diff.length,
    diff,
  };

  if (p.patch) {
    const patchOps = toPatch(diff);
    let verified = false;
    try { verified = deepEqual(applyPatch(va, patchOps), vb); }
    catch (e) { verified = false; }
    out.patch = patchOps;
    out.patch_applies_clean = verified;
  }

  return Response.json(out, { headers: JSON_HEADERS });
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JSON Diff Online — Compare Two JSON Files, Free &amp; Private</title>
<meta name="description" content="Free JSON diff tool &amp; API. Compare two JSON documents structurally — added, removed, changed and type-changed paths, optional RFC 6902 JSON Patch output. Private and unlimited.">
<link rel="canonical" href="${HOST}/">
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a202c}h1{font-size:1.6rem}pre{background:#f6f8fa;padding:.8rem;border-radius:8px;overflow:auto;font-size:.85rem}code{background:#f6f8fa;padding:.1rem .3rem;border-radius:4px}</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"JSON Diff","url":"${HOST}/","description":"Compare two JSON documents structurally — added, removed, changed and type-changed paths, optional RFC 6902 JSON Patch output. Free, private, no tracking.","applicationCategory":"DeveloperApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"publisher":{"@type":"Organization","name":"Formatho","url":"https://formatho.com"}}
</script>
</head>
<body>
<h1>JSON Diff — compare two JSON documents</h1>
<p>Structural comparison of any two JSON values: objects are compared key-by-key (order-independent), arrays index-by-index. Every difference is reported with its <strong>JSON Pointer path</strong> (<code>/users/1/email</code>) and the before/after values. Ask for <code>patch=true</code> to also get an <strong>RFC 6902 JSON Patch</strong>, verified to transform <code>a</code> into <code>b</code>.</p>

<h2>API — GET /api</h2>
<pre>curl "https://json-diff-formatho.filesformatho.workers.dev/api?a=%7B%22a%22%3A1%7D&amp;b=%7B%22a%22%3A2%7D"

curl -X POST https://json-diff-formatho.filesformatho.workers.dev/api \\
  -H 'Content-Type: application/json' \\
  -d '{"a":"{\\"v\\":1,\\"keep\\":true}","b":"{\\"v\\":2,\\"keep\\":true,\\"new\\":[1,2]}","patch":true}'</pre>

<p>Parameters: <code>a</code>, <code>b</code> — JSON documents as strings (POST may also send pre-parsed objects); <code>patch</code> — <code>true</code> to include RFC 6902 ops. Limit 1MB per document.</p>

<h2>Example response</h2>
<pre>{"equal":false,"counts":{"added":1,"removed":0,"changed":1,"type_changed":0},
 "diff":[{"path":"/v","op":"changed","before":1,"after":2},
         {"path":"/new","op":"added","after":[1,2]}]}</pre>

<h2>Private by design</h2>
<p>Runs on Cloudflare's edge — no accounts, no logging, no cookies. For fully in-browser diffing use the <a href="${FULL_TOOL}">full JSON diff tool on formatho.com</a>.</p>

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

const LLMS_TXT = "# JSON Diff — Free & Private\n\n> Structurally compare two JSON documents: objects key-by-key (order-independent), arrays index-by-index. Returns every difference with its JSON Pointer path and before/after values — added, removed, changed, type_changed — plus optional RFC 6902 JSON Patch output that is verified to transform a into b. Free, privacy-first API on Cloudflare's edge: no tracking, no signup, no cookies. 1MB per document.\n\n- [Use this tool]: https://json-diff-formatho.filesformatho.workers.dev/\n- [JSON API]: https://json-diff-formatho.filesformatho.workers.dev/api — GET and POST (a, b, patch), CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/json-diff\n- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

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
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
