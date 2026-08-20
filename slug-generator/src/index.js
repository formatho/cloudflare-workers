// Privacy-First Slug Generator API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/slug-generator';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>URL Slug Generator Online — Free &amp; Private</title>
<meta name="description" content="Turn any title into a clean, SEO-friendly URL slug — diacritics folded to ASCII. Free, privacy-first, zero tracking. Tool on formatho.com.">
<link rel="canonical" href="https://slug-generator-formatho.filesformatho.workers.dev/">
<link rel="alternate" type="application/json" href="https://slug-generator-formatho.filesformatho.workers.dev/api">
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
</style>
</head>
<body>
<header>
  <h1>Slug Generator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl &quot;https://slug-generator-formatho.filesformatho.workers.dev/api?text=Caf%C3%A9%20Menu%20%26%20Drinks&quot;</code></pre>
<pre><code># {"slug":"cafe-menu-drinks",...}</code></pre>
<p>Full parameter reference and live response: <a href="https://slug-generator-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. See the <a href="https://formatho.com">Formatho privacy philosophy</a>.
</div>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — your data never even leaves your browser: <a href="https://formatho.com/slug-generator">Slug Generator Online on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://slug-generator-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://slug-generator-formatho.filesformatho.workers.dev/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://slug-generator-formatho.filesformatho.workers.dev/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

async function api(request) {
try {
  const url = new URL(request.url);
  const text = url.searchParams.get('text');
  const separator = (url.searchParams.get('separator') || '-').slice(0, 1);

  if (!text) {
    return new Response(JSON.stringify({
      error: 'Missing text parameter',
      usage: '?text=Hello World!',
      privacy: 'Zero tracking, zero data collection',
      full_tool: FULL_TOOL,
    }, null, 2), { headers: JSON_HEADERS });
  }

  const slug = text
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');

  return new Response(JSON.stringify({
    slug, input: text,
    privacy: 'Zero tracking, zero data collection',
    full_tool: FULL_TOOL,
  }, null, 2), {
    headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=3600' },
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
