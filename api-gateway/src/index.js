// Formatho API Gateway — Phase A (pure proxy, plan §7 of PAID-API-TIER-PLAN.md)
// One prefix /v1/* → service-bound tool workers' /api endpoints.
// No auth, no rate limits yet (Phase B: anon limits; Phase C: D1 keys).
// Privacy: proxies pass through; gateway itself logs nothing, stores nothing.

const HOST = 'https://api-gateway-formatho.filesformatho.workers.dev';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};

// Route table (plan §2) — query params pass through 1:1 to each tool's /api.
const ROUTES = {
  'json-format':   { binding: 'TOOL_JSON_FORMAT',   service: 'json-formatter-formatho',      desc: 'Format, minify and validate JSON (json, indent)' },
  'base64':        { binding: 'TOOL_BASE64',        service: 'base64-formatho',              desc: 'Base64 encode/decode text (text, mode)' },
  'url-encode':    { binding: 'TOOL_URL_ENCODE',    service: 'url-encoder-formatho',         desc: 'URL encode/decode (text, mode)' },
  'md5':           { binding: 'TOOL_MD5',           service: 'md5-generator-formatho',       desc: 'MD5 hash of text (text)' },
  'sha256':        { binding: 'TOOL_SHA256',        service: 'sha256-generator-formatho',    desc: 'SHA-256 hash of text (text)' },
  'hash':          { binding: 'TOOL_HASH',          service: 'hash-generator-formatho',      desc: 'Hash text with a chosen algorithm (algorithm, text)' },
  'uuid':          { binding: 'TOOL_UUID',          service: 'uuid-generator-formatho',      desc: 'Generate UUID v4 (count, uppercase)' },
  'random-string': { binding: 'TOOL_RANDOM_STRING', service: 'random-string-formatho',       desc: 'Random string generator (length, charset)' },
  'slug':          { binding: 'TOOL_SLUG',          service: 'slug-generator-formatho',      desc: 'Slugify text into URL-safe form (text)' },
  'timestamp':     { binding: 'TOOL_TIMESTAMP',     service: 'timestamp-converter-formatho', desc: 'Unix ⇄ ISO timestamp conversion (unix or iso)' },
  'jwt-decode':    { binding: 'TOOL_JWT_DECODE',    service: 'jwt-decoder-formatho',         desc: 'Decode JWT header/payload (token)' },
  'cron-parse':    { binding: 'TOOL_CRON_PARSE',    service: 'cron-parser-formatho',         desc: 'Explain a cron expression, next runs (expr)' },
  'case-convert':  { binding: 'TOOL_CASE_CONVERT',  service: 'case-converter-formatho',      desc: 'camel/snake/kebab/upper/lower case (text, to)' },
  'lorem':         { binding: 'TOOL_LOREM',         service: 'lorem-ipsum-formatho',         desc: 'Lorem ipsum paragraphs/words (paragraphs, words)' },
};

const routeList = () => Object.entries(ROUTES).map(([path, r]) => ({
  path: `/v1/${path}`,
  method: 'GET, POST',
  description: r.desc,
  legacy_endpoint: `https://${r.service}.filesformatho.workers.dev/api`,
}));

const directory = () => JSON.stringify({
  name: 'formatho-api',
  version: 'v1',
  status: 'preview',
  description: 'Free, privacy-first developer tool APIs on Cloudflare\'s edge. No signup required during preview; query params pass through 1:1 to each tool. Zero tracking, zero payload logging.',
  routes: routeList(),
  docs: `${HOST}/`,
}, null, 2);

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Formatho API — Free Developer Tool APIs at the Edge</title>
<meta name="description" content="One versioned prefix, 14 privacy-first developer tool APIs — JSON, hashes, Base64, UUID, JWT, cron and more. Free during preview, no signup, zero tracking.">
<link rel="canonical" href="${HOST}/">
<link rel="alternate" type="application/json" href="${HOST}/v1">
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 820px; margin: 0 auto; padding: 1.5rem 1rem 3rem; line-height: 1.6; }
header { border-bottom: 1px solid #8884; margin-bottom: 1.5rem; padding-bottom: 1rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.tagline { color: #888; margin: 0; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: .9rem; }
th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid #8883; vertical-align: top; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85em; background: #8882; padding: .1em .35em; border-radius: 4px; }
pre { background: #8882; padding: .8rem 1rem; border-radius: 8px; overflow-x: auto; font-size: .85rem; }
a { color: #06c; }
.badges { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1rem 0; }
.badge { background: #8882; border-radius: 999px; padding: .15rem .7rem; font-size: .8rem; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Formatho API",
  "url": "${HOST}/",
  "description": "One versioned prefix, 14 privacy-first developer tool APIs on Cloudflare's edge. Free during preview, no signup, zero tracking.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["14 tool APIs under /v1", "GET and POST", "CORS-enabled", "Zero tracking", "No payload logging"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
<h1>Formatho API</h1>
<p class="tagline">14 privacy-first developer tool APIs behind one versioned prefix — free during preview, no signup.</p>
<div class="badges"><span class="badge">/v1</span><span class="badge">GET + POST</span><span class="badge">CORS *</span><span class="badge">Zero tracking</span><span class="badge">Edge (Cloudflare)</span></div>
</header>

<p>Every endpoint proxies the battle-tested API of a live <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho edge tool</a>. Query parameters pass through 1:1 — the same params each tool documents on its own <code>/api</code> endpoint. The full machine-readable route list is <a href="/v1"><code>GET /v1</code></a>.</p>

<table>
<tr><th>Endpoint</th><th>What it does</th><th>Params</th></tr>
<tr><td><code>/v1/json-format</code></td><td>Format, minify, validate JSON</td><td><code>json</code>, <code>indent</code></td></tr>
<tr><td><code>/v1/base64</code></td><td>Base64 encode / decode</td><td><code>text</code>, <code>mode</code></td></tr>
<tr><td><code>/v1/url-encode</code></td><td>URL encode / decode</td><td><code>text</code>, <code>mode</code></td></tr>
<tr><td><code>/v1/md5</code></td><td>MD5 hash</td><td><code>text</code></td></tr>
<tr><td><code>/v1/sha256</code></td><td>SHA-256 hash</td><td><code>text</code></td></tr>
<tr><td><code>/v1/hash</code></td><td>Hash with any algorithm</td><td><code>algorithm</code>, <code>text</code></td></tr>
<tr><td><code>/v1/uuid</code></td><td>UUID v4 generator</td><td><code>count</code>, <code>uppercase</code></td></tr>
<tr><td><code>/v1/random-string</code></td><td>Random string</td><td><code>length</code>, <code>charset</code></td></tr>
<tr><td><code>/v1/slug</code></td><td>Slugify text</td><td><code>text</code></td></tr>
<tr><td><code>/v1/timestamp</code></td><td>Unix ⇄ ISO conversion</td><td><code>unix</code> or <code>iso</code></td></tr>
<tr><td><code>/v1/jwt-decode</code></td><td>Decode JWT parts</td><td><code>token</code></td></tr>
<tr><td><code>/v1/cron-parse</code></td><td>Explain cron, next runs</td><td><code>expr</code></td></tr>
<tr><td><code>/v1/case-convert</code></td><td>camel/snake/kebab case</td><td><code>text</code>, <code>to</code></td></tr>
<tr><td><code>/v1/lorem</code></td><td>Lorem ipsum generator</td><td><code>paragraphs</code>, <code>words</code></td></tr>
</table>

<h2>Example</h2>
<pre><code>curl "https://api-gateway-formatho.filesformatho.workers.dev/v1/md5?text=hello"
curl -X POST "https://api-gateway-formatho.filesformatho.workers.dev/v1/json-format" \\
  -H "Content-Type: application/json" -d '{"json":"{\\"a\\":1}","indent":2}'</code></pre>

<div class="privacy"><strong>Privacy-first, always.</strong> The gateway logs request <em>counts</em> at the infrastructure level only — never payloads, never keys, never IP-linked history. Every proxied tool runs on Cloudflare Workers with zero data collection. See <a href="https://formatho.com/">formatho.com</a>.</div>

<h2>Roadmap</h2>
<p><strong>Now (preview):</strong> unmetered free access via <code>/v1/*</code>. <strong>Next:</strong> per-IP anonymous rate limits, then optional API keys with higher limits for automated pipelines. The legacy per-tool <code>*.workers.dev/api</code> URLs stay free and unchanged forever.</p>

<footer>Formatho — privacy-first developer tools. <a href="https://formatho.com/">Main site</a> · <a href="https://formatho.com/tools/json-viewer">Browser tools</a> · <a href="https://formatho-tools.filesformatho.workers.dev/">All edge tools</a></footer>
</body>
</html>`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>weekly</changefreq></url>
  <url><loc>${HOST}/v1</loc><changefreq>weekly</changefreq></url>
</urlset>`;

const LLMS_TXT = `# Formatho API

> One versioned prefix (${HOST}/v1) fronting 14 privacy-first developer tool APIs on Cloudflare's edge. Free during preview, no signup, GET+POST, CORS *. Zero tracking, zero payload logging. Legacy per-tool /api URLs remain free and unchanged.

- [API directory]: ${HOST}/v1 — machine-readable route list
${routeList().map(r => `- [${r.path.replace('/v1/', '')}]: ${HOST}${r.path} — ${r.description}`).join('\n')}
- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/
- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools
`;

function jsonError(status, code, message) {
  return new Response(JSON.stringify({ error: { code, message, docs: `${HOST}/v1` } }, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

async function proxy(request, url, route) {
  const binding = request.env_binding[route.binding];
  if (!binding) return jsonError(502, 'binding_unavailable', `Upstream ${route.service} is not bound in this deployment.`);

  // Rewrite /v1/<route> → /api, pass method/query/headers/body through 1:1.
  const targetUrl = `https://${route.service}.internal/api${url.search}`;
  const init = { method: request.method, headers: [...request.headers] };
  if (request.method !== 'GET' && request.method !== 'HEAD') init.body = await request.arrayBuffer();
  const target = new Request(targetUrl, init);

  const upstream = await binding.fetch(target);
  const resp = new Response(upstream.body, upstream);
  if (!resp.headers.has('Access-Control-Allow-Origin')) resp.headers.set('Access-Control-Allow-Origin', '*');
  resp.headers.set('X-Formatho-Gateway', 'v1-preview');
  return resp;
}

export default {
  async fetch(request, env) {
    request.env_binding = env; // service bindings live on env; stash for proxy()
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (path === '/' && request.method === 'GET') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Privacy-Policy': 'Zero tracking, zero data collection' } });
    }

    if ((path === '/v1' || path === '/api') && request.method === 'GET') {
      return new Response(directory(), { headers: JSON_HEADERS });
    }

    if (path === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (path === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    if (path.startsWith('/v1/')) {
      const name = path.slice(4);
      const route = ROUTES[name];
      if (!route) return jsonError(404, 'not_found', `Unknown route ${request.method} ${path}. GET /v1 lists all routes.`);
      return proxy(request, url, route);
    }

    return new Response('Not found. See <a href="/">the API page</a> or <a href="/v1">/v1</a>.', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
};
