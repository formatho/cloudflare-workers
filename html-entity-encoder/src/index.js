// Privacy-First HTML Entity Encoder/Decoder API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/html-entity-encoder';

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  deg: '°', plusmn: '±', times: '×', divide: '÷', micro: 'µ', para: '¶',
  sect: '§', middot: '·', sup2: '²', sup3: '³', frac12: '½', frac14: '¼',
  eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', uuml: 'ü', ouml: 'ö',
  auml: 'ä', szlig: 'ß', ntilde: 'ñ', aacute: 'á', iacute: 'í', oacute: 'ó',
  uacute: 'ú', euro: '€', pound: '£', yen: '¥', cent: '¢', curr: '¤',
};

function encodeHtml(text, all) {
  let out = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  if (all) {
    out = out.replace(/[\u00A0-\uFFFF]/g, (ch) =>
      '&#x' + ch.codePointAt(0).toString(16).toUpperCase() + ';'
    );
  }
  return out;
}

function decodeHtml(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body) => {
    if (body[0] === '#') {
      let code;
      if (body[1] === 'x' || body[1] === 'X') code = parseInt(body.slice(2), 16);
      else code = parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return m;
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : m;
  });
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HTML Entity Encoder / Decoder Online — Free &amp; Private</title>
<meta name="description" content="Encode text to HTML entities or decode entity references back to text — free, privacy-first, Unicode-aware. Zero tracking. Full tool on formatho.com.">
<link rel="canonical" href="https://html-entity-encoder-formatho.filesformatho.workers.dev/">
<link rel="alternate" type="application/json" href="https://html-entity-encoder-formatho.filesformatho.workers.dev/api">
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
  <h1>HTML Entity Encoder / Decoder — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl &quot;https://html-entity-encoder-formatho.filesformatho.workers.dev/api?text=Cafe&amp;copy;&amp;mode=encode&quot;

curl &quot;https://html-entity-encoder-formatho.filesformatho.workers.dev/api?text=&amp;amp;lt;div&amp;amp;gt;&amp;mode=decode&quot;</code></pre>

<h2>Parameters</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td><code>text</code></td><td><code>""</code></td><td>Text to convert (max 100,000 chars).</td></tr>
<tr><td><code>mode</code></td><td><code>both</code></td><td><code>encode</code>, <code>decode</code>, or <code>both</code>.</td></tr>
<tr><td><code>all</code></td><td><code>0</code></td><td><code>1</code> also encodes all non-ASCII characters as numeric entities (<code>&amp;#xHH;</code>).</td></tr>
</table>

<p>Full parameter reference and live response: <a href="https://html-entity-encoder-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. See the <a href="https://formatho.com">Formatho privacy philosophy</a>.
</div>

<h2>Why encode HTML entities?</h2>
<p>Entity encoding prevents broken markup and <strong>XSS injection</strong> when user-supplied text is embedded in HTML: <code>&lt;</code> becomes <code>&amp;lt;</code>, <code>&amp;</code> becomes <code>&amp;amp;</code>, quotes become <code>&amp;quot;</code> / <code>&amp;#39;</code>. Decoding reverses named (<code>&amp;copy;</code>), decimal (<code>&amp;#169;</code>) and hex (<code>&amp;#xA9;</code>) references, Unicode-aware.</p>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — your data never even leaves your browser: <a href="https://formatho.com/html-entity-encoder">HTML Entity Encoder on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://html-entity-encoder-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://html-entity-encoder-formatho.filesformatho.workers.dev/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://html-entity-encoder-formatho.filesformatho.workers.dev/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

async function api(request) {
  try {
    const url = new URL(request.url);
    const text = (url.searchParams.get('text') || '').slice(0, 100000);
    const mode = (url.searchParams.get('mode') || 'both').toLowerCase();
    const all = url.searchParams.get('all') === '1';

    if (!['encode', 'decode', 'both'].includes(mode)) throw new Error("mode must be 'encode', 'decode', or 'both'");

    const result = { input_length: text.length, mode, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL };
    if (mode === 'encode' || mode === 'both') result.encoded = encodeHtml(text, all);
    if (mode === 'decode' || mode === 'both') result.decoded = decodeHtml(text);

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
