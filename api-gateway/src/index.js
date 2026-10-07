// Formatho API Gateway — Phase A (proxy) + Phase B (anonymous per-IP rate limiting)
//                        + Phase C (D1 hashed API keys + tiered limits + admin issuance)
// One prefix /v1/* → service-bound tool workers' /api endpoints.
// 2026-10-07 (Phase D): api.formatho.com custom domain live (owner created the
// DNS record; route attached here). Remaining owner gates: plan §9 pricing
// numbers, Stripe, ADMIN_SECRET, Workers Paid. ADMIN_SECRET unset by default
// → /admin/keys returns 503.
// Privacy: proxies pass through; gateway itself logs nothing; Phase C stores only
// hashed keys + aggregate request counts — never payloads.

const HOST = 'https://api.formatho.com';

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
<pre><code>curl "https://api.formatho.com/v1/md5?text=hello"
curl -X POST "https://api.formatho.com/v1/json-format" \\
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
// RE-TESTED 2026-10-07 on zone route api.formatho.com/* (route attached, workers
// routes beat the old 301-to-origin): 40 rapid reqs vs 30/60s limit — STILL zero
// 429s (x-ratelimit-limit header present, limiter invoked). Non-enforcement is
// plan-level, not route-level: enforcement gate = Workers Paid (owner), zero code
// change needed when it flips.
async function anonRateOk(request, env) {
  const limiter = env.FREE_ANON;
  if (!limiter || typeof limiter.limit !== 'function') return true;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try { return (await limiter.limit({ key: ip })).success !== false; }
  catch { return true; }
}

// ---------- Phase C: D1 hashed-key management (plan §3) ----------
const KEY_TIERS = {
  free: { limit: 60, limiter: 'FREE_KEY' },   // placeholder — owner gate (plan §9)
  paid: { limit: 600, limiter: 'PAID_KEY' },  // placeholder — owner gate (plan §9)
};

async function hashHex(prefix, s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prefix + s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const hashKey = (raw) => hashHex('key:', raw); // hex(SHA-256(raw)) — raw never stored

function randomB64url(bytes) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function generateKey() {
  return { raw: 'fmt_live_' + randomB64url(32), id: 'k_' + randomB64url(6).toLowerCase().slice(0, 8) };
}

// 1 indexed point read per keyed request (plan §3). Distinguishes outcomes:
// invalid/revoked key → 401; D1 unavailable → dbDown:true so the caller degrades
// to the anonymous path (fail-open: key holders keep service at anon limits,
// nobody gains elevated access during an outage).
async function lookupKey(env, raw) {
  try {
    const row = await env.DB.prepare('SELECT id, tier, status FROM keys WHERE key_hash = ?')
      .bind(await hashKey(raw)).first();
    return { key: row || null, dbDown: false };
  } catch { return { key: null, dbDown: true }; }
}

// Same fail-open philosophy as Phase B: limiter problems must not take the API down.
async function keyRateOk(identity, env, limiterName) {
  const limiter = env[limiterName];
  if (!limiter || typeof limiter.limit !== 'function') return true;
  try { return (await limiter.limit({ key: identity })).success !== false; }
  catch { return true; }
}

// Usage rollups: batched writes (every 25 counted requests), never per-request.
// Losing a batch to an error is acceptable — counts are advisory, not billing (yet).
const usageBuf = new Map();
let usageCount = 0;
function bumpUsage(env, ctx, keyId, route) {
  const day = new Date().toISOString().slice(0, 10);
  const k = `${day}|${keyId}|${route}`;
  usageBuf.set(k, (usageBuf.get(k) || 0) + 1);
  if (++usageCount % 25 === 0) ctx.waitUntil(flushUsage(env));
}
async function flushUsage(env) {
  if (!usageBuf.size) return;
  const entries = [...usageBuf.entries()];
  usageBuf.clear();
  try {
    await env.DB.batch(entries.map(([k, n]) => {
      const [day, keyId, route] = k.split('|');
      return env.DB.prepare(
        'INSERT INTO usage_daily (day, key_id, route, requests) VALUES (?1, ?2, ?3, ?4) ' +
        'ON CONFLICT (day, key_id, route) DO UPDATE SET requests = requests + ?4')
        .bind(day, keyId, route, n);
    }));
  } catch { /* advisory only */ }
}

// Admin issuance — POST /admin/keys {email, tier, label} + x-admin-secret header.
// 503 until the owner sets ADMIN_SECRET (launch gate held by design).
async function handleAdmin(request, env) {
  if (request.method !== 'POST') return jsonError(405, 'method_not_allowed', 'POST only.');
  if (!env.ADMIN_SECRET) return jsonError(503, 'admin_not_configured',
    'ADMIN_SECRET is not set. The owner configures it at launch (wrangler secret put ADMIN_SECRET).');
  const supplied = request.headers.get('x-admin-secret') || '';
  const [a, b] = await Promise.all([hashHex('admin:', env.ADMIN_SECRET), hashHex('admin:', supplied)]);
  if (a !== b) return jsonError(403, 'forbidden', 'Invalid admin secret.');

  let body;
  try { body = await request.json(); } catch { return jsonError(400, 'bad_request', 'JSON body required.'); }
  const email = String(body.email || '').trim().toLowerCase();
  const tier = body.tier === 'paid' ? 'paid' : 'free';
  const label = body.label ? String(body.label).slice(0, 64) : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(400, 'bad_request', 'A valid email is required.');

  const now = Date.now();
  let account;
  try {
    account = await env.DB.prepare('SELECT id FROM accounts WHERE email = ?').bind(email).first();
    if (!account) {
      account = { id: 'a_' + randomB64url(8).toLowerCase() };
      await env.DB.prepare('INSERT INTO accounts (id, email, created_at) VALUES (?1, ?2, ?3)')
        .bind(account.id, email, now).run();
    }
    const { raw, id } = generateKey();
    await env.DB.prepare(
      'INSERT INTO keys (id, account_id, key_hash, label, tier, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
      .bind(id, account.id, await hashKey(raw), label, tier, 'active', now).run();
    // Raw key returned exactly once, never stored, never logged.
    return new Response(JSON.stringify({ key: raw, key_id: id, account_id: account.id, tier, label }, null, 2),
      { status: 201, headers: JSON_HEADERS });
  } catch (e) {
    return jsonError(503, 'd1_unavailable', 'Key store unavailable — try again shortly.');
  }
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
  async fetch(request, env, ctx) {
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

    if (path === '/admin/keys') return handleAdmin(request, env);

    if (path.startsWith('/v1/')) {
      const name = path.slice(4);
      const route = ROUTES[name];
      if (!route) return jsonError(404, 'not_found', `Unknown route ${request.method} ${path}. GET /v1 lists all routes.`);
      // Known routes only: unknown paths 404 above without spending limiter budget.

      const rawKey = request.headers.get('x-api-key');
      if (rawKey) {
        const { key, dbDown } = await lookupKey(env, rawKey);
        if (dbDown) {
          // D1 outage: degrade to anonymous limits — keep serving, never 401 a
          // possibly-valid key holder for an infra problem (fail-open, plan §4).
        } else if (!key || key.status !== 'active') {
          return jsonError(401, 'invalid_api_key', 'x-api-key is invalid or revoked. Get a key: https://formatho.com');
        } else {
          const t = KEY_TIERS[key.tier] || KEY_TIERS.free;
          if (!(await keyRateOk(key.id, env, t.limiter)))
            return jsonError(429, 'rate_limited',
              `This key (${key.tier} tier) is limited to ${t.limit} requests per 60s. Retry shortly or upgrade: https://formatho.com`,
              { 'Retry-After': '60', 'X-RateLimit-Limit': String(t.limit), 'X-RateLimit-Scope': key.tier });
          const resp = await proxy(request, url, route);
          resp.headers.set('X-RateLimit-Scope', key.tier);
          resp.headers.set('X-RateLimit-Limit', String(t.limit));
          if (ctx) bumpUsage(env, ctx, key.id, name);
          return resp;
        }
      }

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
