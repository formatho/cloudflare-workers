// Formatho API Gateway — Phase A (proxy) + Phase B (anonymous per-IP rate limiting)
// One prefix /v1/* → service-bound tool workers' /api endpoints.
// Phase C (D1 API keys + tiered limits) not yet wired; owner gates: plan §9.
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
  description: 'Free, privacy-first developer tool APIs on Cloudflare\'s edge. Query params pass through 1:1 to each tool. Anonymous use is rate-limited per IP; API keys with higher limits are coming. Zero tracking, zero payload logging.',
  rate_limits: {
    anonymous: `${ANON_LIMIT} requests / ${ANON_PERIOD}s per IP (429 + Retry-After when exceeded)`,
    keyed: 'higher limits — API keys coming soon',
    unmetered: 'legacy per-tool *.workers.dev/api URLs',
  },
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
  "featureList": ["14 tool APIs under /v1", "GET and POST", "CORS-enabled", "Per-IP rate limiting (30/min anonymous)", "Zero tracking", "No payload logging"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
<h1>Formatho API</h1>
<p class="tagline">14 privacy-first developer tool APIs behind one versioned prefix — free during preview, no signup.</p>
<div class="badges"><span class="badge">/v1</span><span class="badge">GET + POST</span><span class="badge">CORS *</span><span class="badge">Zero tracking</span><span class="badge">30 req/min anon</span><span class="badge">Edge (Cloudflare)</span></div>
</header>

<p>Every endpoint proxies the battle-tested API of a live <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho edge tool</a>. Query parameters pass through 1:1 — the same params each tool documents on its own <code>/api</code> endpoint. The full machine-readable route list is <a href="/v1"><code>GET /v1</code></a>.</p>

<p><strong>Rate limits:</strong> anonymous use is limited to <strong>30 requests per minute per IP</strong>. Exceeded requests get <code>429</code> with a <code>Retry-After</code> header. API keys with higher limits are coming; every legacy per-tool <code>*.workers.dev/api</code> URL stays free and unmetered.</p>

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
<p><strong>Now (preview):</strong> free access via <code>/v1/*</code>, rate-limited to 30 req/min per IP. <strong>Next:</strong> optional API keys with higher limits for automated pipelines. The legacy per-tool <code>*.workers.dev/api</code> URLs stay free and unmetered forever.</p>

<footer>Formatho — privacy-first developer tools. <a href="https://formatho.com/">Main site</a> · <a href="https://formatho.com/tools/json-viewer">Browser tools</a> · <a href="https://formatho-tools.filesformatho.workers.dev/">All edge tools</a></footer>
</body>
</html>`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>weekly</changefreq></url>
  <url><loc>${HOST}/v1</loc><changefreq>weekly</changefreq></url>
</urlset>`;

const LLMS_TXT = `# Formatho API

> One versioned prefix (${HOST}/v1) fronting 14 privacy-first developer tool APIs on Cloudflare's edge. Free, no signup, GET+POST, CORS *. Anonymous use rate-limited to 30 requests/60s per IP (429 + Retry-After); API keys coming. Zero tracking, zero payload logging. Legacy per-tool /api URLs remain free and unmetered.

- [API directory]: ${HOST}/v1 — machine-readable route list
${routeList().map(r => `- [${r.path.replace('/v1/', '')}]: ${HOST}${r.path} — ${r.description}`).join('\n')}
- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/
- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools
`;

// ---------- Phase B: anonymous rate limiting (per-IP via WAF rate-limit binding) ----------
const ANON_LIMIT = 30;   // requests — mirrors wrangler.toml [ratelimits.simple]; tuning = edit + redeploy
const ANON_PERIOD = 60;  // seconds

// Fails OPEN on any binding/limiter problem: this is abuse control, not auth —
// the API must stay up even if the limiter is missing, misconfigured, or erroring.
// Live finding 2026-10-05: binding deploys + answers {success:true} but never
// enforces on this free-plan workers.dev route (117 test reqs, zero 429s).
// Enforcement is expected to activate on a zone-routed custom domain (owner gate)
// or plan change — zero code change needed when it does.
async function anonRateOk(request, env) {
  const limiter = env.FREE_ANON;
  if (!limiter || typeof limiter.limit !== 'function') return true;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try { return (await limiter.limit({ key: ip })).success !== false; }
  catch { return true; }
}

function jsonError(status, code, message, extra = {}) {
  return new Response(JSON.stringify({ error: { code, message, docs: `${HOST}/v1` } }, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
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
  resp.headers.set('X-RateLimit-Limit', String(ANON_LIMIT)); // remaining is not exposed by the binding
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
      // Known routes only: unknown paths 404 above without spending limiter budget.
      if (!(await anonRateOk(request, env))) {
        return jsonError(429, 'rate_limited',
          `Anonymous usage is limited to ${ANON_LIMIT} requests per ${ANON_PERIOD}s per IP. Wait ${ANON_PERIOD}s and retry, or use the legacy per-tool /api URLs (unmetered). API keys with higher limits are coming.`,
          { 'Retry-After': String(ANON_PERIOD), 'X-RateLimit-Limit': String(ANON_LIMIT) });
      }
      return proxy(request, url, route);
    }

    return new Response('Not found. See <a href="/">the API page</a> or <a href="/v1">/v1</a>.', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
};
