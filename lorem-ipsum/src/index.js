// Privacy-First Lorem Ipsum Generator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://lorem-ipsum-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lorem Ipsum Generator Online — Free &amp; Private</title>
<meta name="description" content="Generate lorem ipsum placeholder text — paragraphs, sentences, or words — free, privacy-first API with zero tracking. More free developer tools on formatho.com.">
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
.cta{display:inline-block;margin:.25rem 0 .35rem;padding:.65rem 1.1rem;border-radius:8px;background:#0a7d3c;color:#fff !important;font-weight:600;text-decoration:none}.cta:hover{background:#086b33}.cta-sub{color:#888;font-size:.85rem;margin:0 0 1.5rem}.related{margin-top:2rem}.related h2{font-size:1.05rem;margin:0 0 .4rem}.related ul{display:flex;flex-wrap:wrap;gap:.45rem;list-style:none;padding:0;margin:0}.related a{display:inline-block;padding:.25rem .7rem;border:1px solid #8884;border-radius:999px;font-size:.85rem;text-decoration:none}</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Lorem Ipsum Generator Online — Free & Private",
  "url": "https://lorem-ipsum-formatho.filesformatho.workers.dev/",
  "description": "Generate lorem ipsum placeholder text — paragraphs, sentences, or words — free, privacy-first API with zero tracking. More free developer tools on formatho.com.",
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
  <h1>Lorem Ipsum Generator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<a class="cta" href="https://formatho.com/tools">Browse 100+ free browser tools &#8594;</a>
<p class="cta-sub">Free, no signup, runs entirely in your browser &#8212; your data never leaves your device.</p>

<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?paragraphs=3"</code></pre>
<p>Parameters: <code>paragraphs</code> (default 3), <code>sentences</code> per paragraph (default 4-6 random), <code>format</code> = json | text | html. Classic "Lorem ipsum dolor sit amet..." opening.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> no input data to track — text is generated deterministically at the edge. No logs, no cookies.</div>
<h2>More free tools</h2>
<p>Browse 100+ free client-side developer tools: <a href="${FULL_TOOL}">formatho.com/tools</a>.</p>
<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<nav class="related" aria-label="Related tools">
<h2>Related free edge tools</h2>
<ul><li><a href="https://uuid-generator-formatho.filesformatho.workers.dev/" title="RFC 4122 v4 UUIDs, bulk up to 100.">UUID Generator</a></li><li><a href="https://random-string-formatho.filesformatho.workers.dev/" title="Crypto-secure random strings, 4 charsets.">Random String Generator</a></li><li><a href="https://password-generator-formatho.filesformatho.workers.dev/" title="Crypto-secure passwords, 8–128 chars, custom charsets, bulk.">Password Generator</a></li><li><a href="https://ulid-generator-formatho.filesformatho.workers.dev/" title="Sortable 26-char ULIDs — bulk up to 100, monotonic mode, decode &amp; validate.">ULID Generator</a></li></ul>
</nav>
<footer>© formatho.com · <a href="${HOST}/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${HOST}/api</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;

const VOCAB = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra est eros bibendum elit nec luctus magna felis sollicitudin mauris integer in mauris eu nibh euismod dapibus'.split(' ');

function rnd() { return Math.random(); }

function sentence() {
  const n = 6 + Math.floor(rnd() * 8);
  const w = [];
  for (let i = 0; i < n; i++) w.push(VOCAB[Math.floor(rnd() * VOCAB.length)]);
  const s = w.join(' ');
  return s[0].toUpperCase() + s.slice(1) + '.';
}

function paragraph(first, sentenceCount) {
  const parts = [];
  if (first) parts.push('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
  const n = sentenceCount || (4 + Math.floor(rnd() * 3));
  for (let i = parts.length; i < n; i++) parts.push(sentence());
  return parts.join(' ');
}

function handleApi(request) {
  const url = new URL(request.url);
  const paragraphs = Math.min(Math.max(parseInt(url.searchParams.get('paragraphs') || '3', 10) || 3, 1), 50);
  const sentences = Math.min(Math.max(parseInt(url.searchParams.get('sentences') || '0', 10) || 0, 0), 20);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  const paras = [];
  for (let i = 0; i < paragraphs; i++) paras.push(paragraph(i === 0, sentences));
  if (format === 'text') return new Response(paras.join('\n\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...JSON_HEADERS } });
  if (format === 'html') return new Response(paras.map(p => `<p>${p}</p>`).join('\n'), { headers: { 'Content-Type': 'text/html; charset=utf-8', ...JSON_HEADERS } });
  return Response.json({
    paragraphs: paras,
    count: paragraphs,
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

const LLMS_TXT = "# Lorem Ipsum Generator Online — Free & Private\n\n> Generate lorem ipsum placeholder text — paragraphs, sentences, or words — free, privacy-first API with zero tracking. More free developer tools on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://lorem-ipsum-formatho.filesformatho.workers.dev/\n- [JSON API]: https://lorem-ipsum-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [All Formatho browser tools]: https://formatho.com/tools\n- [All 71 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

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
if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
        if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
