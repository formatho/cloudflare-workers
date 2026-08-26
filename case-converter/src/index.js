// Privacy-First Case Converter API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://case-converter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/case-converter';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Case Converter Online (camelCase, snake_case, kebab-case) — Free &amp; Private</title>
<meta name="description" content="Convert text between camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE and more — free, privacy-first API with zero tracking. Full tool on formatho.com.">
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
  <h1>Case Converter Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?text=hello%20world"</code></pre>
<p>Returns the text converted to camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case, UPPER, lower, and dot.case — all in one response.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> text is converted in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Convert case entirely client-side: <a href="${FULL_TOOL}">Case Converter on formatho.com</a>.</p>
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

function words(text) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

function handleApi(request) {
  const url = new URL(request.url);
  const text = url.searchParams.get('text');
  if (!text) return Response.json({ error: 'Missing required parameter: text' }, { status: 400, headers: JSON_HEADERS });
  const w = words(text);
  if (!w.length) return Response.json({ error: 'No convertible words found in text' }, { status: 400, headers: JSON_HEADERS });
  const lower = w.map(x => x.toLowerCase());
  const pascal = lower.map(x => x[0].toUpperCase() + x.slice(1)).join('');
  return Response.json({
    input: text,
    camelCase: pascal[0].toLowerCase() + pascal.slice(1),
    PascalCase: pascal,
    snake_case: lower.join('_'),
    'kebab-case': lower.join('-'),
    CONSTANT_CASE: lower.join('_').toUpperCase(),
    'dot.case': lower.join('.'),
    'Title Case': lower.map(x => x[0].toUpperCase() + x.slice(1)).join(' '),
    'UPPER CASE': lower.join(' ').toUpperCase(),
    'lower case': lower.join(' '),
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
