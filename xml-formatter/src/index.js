// Privacy-First XML Formatter API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://xml-formatter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/xml-formatter';
const MAX_BYTES = 262144; // 256 KB

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>XML Formatter Online (Pretty Print &amp; Minify) — Free &amp; Private</title>
<meta name="description" content="Format, validate, pretty-print and minify XML at the edge — free API with zero tracking. Validates well-formedness with line/column error positions. Full tool on formatho.com.">
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
  <h1>XML Formatter Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?xml=%3Croot%3E%3Citem%3Ehello%3C/item%3E%3C/root%3E"

curl -X POST "${HOST}/api" \\
  -H 'Content-Type: application/json' \\
  -d '{"xml":"&lt;root&gt;&lt;item&gt;hello&lt;/item&gt;&lt;/root&gt;"}'</code></pre>
<p>Pretty-prints (default) or minifies XML and reports well-formedness errors with line/column positions. Optional params: <code>indent</code> (0–8, default 2), <code>mode</code> (<code>pretty</code> | <code>minify</code>). GET query limit 8 KB — use POST for larger documents (max 256 KB).</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> XML is formatted in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Format XML entirely client-side: <a href="${FULL_TOOL}">XML Formatter on formatho.com</a>.</p>
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

// --- XML parser (well-formedness validating, no dependencies) ---

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

// --- Serializer ---

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decodeEnt(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return m; } })
    .replace(/&#(\d+);/g, (m, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return m; } })
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ENT[n]);
}
function escText(s) {
  // escape bare ampersands (not part of an entity reference), < and >
  return s.replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return escText(s).replace(/"/g, '&quot;');
}

function stats(doc) {
  let elements = 0;
  let maxDepth = 0;
  (function walk(node, depth) {
    if (node.type === 'element') {
      elements++;
      maxDepth = Math.max(maxDepth, depth);
      node.children.forEach((c) => walk(c, depth + 1));
    } else if (node.type === 'doc') {
      node.children.forEach((c) => walk(c, depth));
    }
  })(doc, 1);
  return { elements, max_depth: maxDepth };
}

function serialize(node, indentStr, level, mode) {
  const pad = mode === 'minify' ? '' : indentStr.repeat(level);
  const nl = mode === 'minify' ? '' : '\n';
  switch (node.type) {
    case 'doc':
      return node.children.map((c) => serialize(c, indentStr, level, mode)).join(nl) + (mode === 'minify' ? '' : '\n');
    case 'pi':
      return `${pad}<?${node.text}?>`;
    case 'doctype':
      return `${pad}<!DOCTYPE ${node.text}>`;
    case 'comment':
      return `${pad}<!--${mode === 'minify' ? node.text : ' ' + node.text + ' '}-->`;
    case 'cdata':
      return `${pad}<![CDATA[${node.text}]]>`;
    case 'text':
      return pad + escText(node.text.trim());
    case 'element': {
      const attrs = node.attrs.map((a) => ` ${a.name}="${escAttr(a.text !== undefined ? a.text : a.value)}"`).join('');
      const kids = node.children;
      if (!kids.length) return `${pad}<${node.name}${attrs}/>`;
      const onlyText = kids.every((k) => k.type === 'text' || k.type === 'cdata');
      if (onlyText) {
        const inner = kids
          .map((k) => (k.type === 'cdata' ? `<![CDATA[${k.text}]]>` : escText(k.text.trim())))
          .join(mode === 'minify' ? '' : ' ');
        return `${pad}<${node.name}${attrs}>${inner}</${node.name}>`;
      }
      const inner = kids.map((k) => serialize(k, indentStr, level + 1, mode)).join(nl);
      return `${pad}<${node.name}${attrs}>${nl}${inner}${nl}${pad}</${node.name}>`;
    }
    default:
      return '';
  }
}

async function getXml(request, url) {
  const fromQuery = url.searchParams.get('xml');
  if (fromQuery !== null) {
    if (fromQuery.length > 8192) return { error: 'GET "xml" query param limited to 8 KB — POST { "xml": ... } instead' };
    return { xml: fromQuery };
  }
  try {
    const body = await request.json();
    if (!body || typeof body.xml !== 'string') return { error: 'Missing required field: xml' };
    if (body.xml.length > MAX_BYTES) return { error: `XML exceeds ${MAX_BYTES} byte limit` };
    return { xml: body.xml, mode: body.mode, indent: body.indent };
  } catch {
    return { error: 'Invalid JSON body — expected { "xml": "..." }' };
  }
}

async function handleApi(request, url) {
  const parsed = await getXml(request, url);
  if (parsed.error) return Response.json({ error: parsed.error }, { status: 400, headers: JSON_HEADERS });
  const modeParam = parsed.mode !== undefined ? parsed.mode : url.searchParams.get('mode') || 'pretty';
  if (modeParam !== 'pretty' && modeParam !== 'minify') {
    return Response.json({ error: 'Invalid mode — use pretty or minify' }, { status: 400, headers: JSON_HEADERS });
  }
  const indentRaw = parsed.indent !== undefined ? parsed.indent : url.searchParams.get('indent') ?? '2';
  const indentParam = parseInt(indentRaw, 10);
  if (Number.isNaN(indentParam) || indentParam < 0 || indentParam > 8) {
    return Response.json({ error: 'Invalid indent — use 0 to 8' }, { status: 400, headers: JSON_HEADERS });
  }
  const { xml } = parsed;
  try {
    const doc = parseXml(xml);
    const output = serialize(doc, ' '.repeat(indentParam), 0, modeParam);
    return Response.json(
      Object.assign(
        {
          valid: true,
          mode: modeParam,
          indent: indentParam,
          input_bytes: xml.length,
          output_bytes: output.length,
          output,
          decoded_by: 'Formatho edge API — zero tracking',
          full_tool: FULL_TOOL,
        },
        stats(doc)
      ),
      { headers: JSON_HEADERS }
    );
  } catch (e) {
    return Response.json(
      { valid: false, error: e.message, position: e.position || null },
      { status: 400, headers: JSON_HEADERS }
    );
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api' && request.method === 'GET' && !url.searchParams.has('xml') && ![...url.searchParams.keys()].length) {
      return Response.json({
        usage: 'GET /api?xml=<urlencoded xml up to 8KB>  |  POST /api {"xml":"...","mode":"pretty|minify","indent":2}',
        params: { xml: 'required — the XML document', mode: 'pretty (default) | minify', indent: '0-8, default 2 (pretty mode only)' },
        example: `curl "${HOST}/api?xml=%3Croot%3E%3Citem%3Ehello%3C/item%3E%3C/root%3E"`,
      }, { headers: JSON_HEADERS });
    }
    if (url.pathname === '/api') return handleApi(request, url);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
