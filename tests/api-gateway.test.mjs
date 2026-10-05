// Local edge tests: api-gateway (Phase A proxy) — run: node tests/api-gateway.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gw = (await import('../api-gateway/src/index.js')).default;

let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; } catch (e) { fail++; console.error('FAIL:', name, '\n ', e.message); } };

// Mock env: every binding echoes the incoming request (url/method/body) as JSON.
function mockEnv() {
  const env = {};
  const toml = readFileSync(new URL('../api-gateway/wrangler.toml', import.meta.url), 'utf8');
  for (const m of toml.matchAll(/binding = "(\w+)"\n\s*service = "([\w-]+)"/g)) {
    env[m[1]] = {
      service: m[2],
      async fetch(req) {
        const body = req.method === 'GET' || req.method === 'HEAD' ? null : await req.text();
        return new Response(JSON.stringify({ echoed_url: req.url, method: req.method, body, content_type: req.headers.get('content-type') }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      },
    };
  }
  return env;
}
const env = mockEnv();
const req = (path, init) => new Request(`https://gw.dev${path}`, init);
const ROUTE_COUNT = 14;

// ---------- route directory ----------
await t('GET /v1 directory: 200, 14 routes, envelope fields', async () => {
  const r = await gw.fetch(req('/v1'), env);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.name, 'formatho-api');
  assert.equal(j.version, 'v1');
  assert.equal(j.routes.length, ROUTE_COUNT);
  for (const rt of j.routes) {
    assert.match(rt.path, /^\/v1\/[\w-]+$/);
    assert.ok(rt.description && rt.legacy_endpoint.includes('.workers.dev/api'));
  }
});

await t('GET /api aliases the directory (for landing href consistency)', async () => {
  const a = await gw.fetch(req('/v1'), env);
  const b = await gw.fetch(req('/api'), env);
  assert.equal(await a.text(), await b.text());
});

await t('wrangler.toml bindings ⇄ ROUTES table parity (no drift)', async () => {
  const toml = readFileSync(new URL('../api-gateway/wrangler.toml', import.meta.url), 'utf8');
  const bindings = [...toml.matchAll(/binding = "(\w+)"/g)].map(m => m[1]);
  const services = [...toml.matchAll(/service = "([\w-]+)"/g)].map(m => m[1]);
  assert.equal(bindings.length, ROUTE_COUNT);
  assert.equal(services.length, ROUTE_COUNT);
  const mod = (await import('../api-gateway/src/index.js')).default;
  // reach ROUTES via directory JSON: every service in toml must appear as a legacy endpoint and vice versa
  const dir = await (await mod.fetch(req('/v1'), env)).json();
  const dirServices = dir.routes.map(r => r.legacy_endpoint.match(/^https:\/\/([\w-]+)\./)[1]).sort();
  assert.deepEqual(dirServices, [...services].sort());
});

// ---------- proxy behavior ----------
await t('GET /v1/md5?text=hello → rewrites to /api, query preserved', async () => {
  const r = await gw.fetch(req('/v1/md5?text=hello'), env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('X-Formatho-Gateway'), 'v1-preview');
  const j = await r.json();
  assert.equal(new URL(j.echoed_url).pathname, '/api');
  assert.equal(new URL(j.echoed_url).search, '?text=hello');
  assert.equal(j.method, 'GET');
});

await t('POST /v1/json-format: body + content-type passthrough', async () => {
  const r = await gw.fetch(req('/v1/json-format', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"json":"{\\"a\\":1}"}' }), env);
  const j = await r.json();
  assert.equal(j.method, 'POST');
  assert.equal(j.body, '{"json":"{\\"a\\":1}"}');
  assert.equal(j.content_type, 'application/json');
  assert.equal(new URL(j.echoed_url).pathname, '/api');
});

await t('proxied response keeps upstream CORS header', async () => {
  const r = await gw.fetch(req('/v1/uuid?count=1'), env);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
});

await t('trailing slash tolerated: /v1/lorem/', async () => {
  const r = await gw.fetch(req('/v1/lorem/?paragraphs=1'), env);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(new URL(j.echoed_url).pathname, '/api');
});

// ---------- errors ----------
await t('unknown /v1 route → 404 error envelope', async () => {
  const r = await gw.fetch(req('/v1/does-not-exist'), env);
  assert.equal(r.status, 404);
  const j = await r.json();
  assert.equal(j.error.code, 'not_found');
  assert.ok(j.error.docs.endsWith('/v1'));
});

await t('unknown path → 404 HTML pointing at / and /v1', async () => {
  const r = await gw.fetch(req('/nope'), env);
  assert.equal(r.status, 404);
  assert.match(await r.text(), /\/v1/);
});

// ---------- fleet surface ----------
await t('OPTIONS preflight → 204 + CORS headers + Max-Age', async () => {
  const r = await gw.fetch(req('/v1/md5', { method: 'OPTIONS' }), env);
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
  assert.ok(r.headers.get('Access-Control-Allow-Headers').includes('x-api-key'));
  assert.equal(r.headers.get('Access-Control-Max-Age'), '86400');
});

await t('GET / → HTML landing w/ title + formatho.com backlinks', async () => {
  const r = await gw.fetch(req('/'), env);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<title>Formatho API — Free Developer Tool APIs at the Edge<\/title>/);
  assert.ok(html.includes('https://formatho.com/'));
  assert.ok(html.includes('https://formatho.com/tools/json-viewer'));
  assert.match(html, /application\/ld\+json/);
  // every route visible in the landing table
  for (const p of ['json-format', 'base64', 'url-encode', 'md5', 'sha256', 'hash', 'uuid', 'random-string', 'slug', 'timestamp', 'jwt-decode', 'cron-parse', 'case-convert', 'lorem']) {
    assert.ok(html.includes(`/v1/${p}`), `landing missing /v1/${p}`);
  }
});

await t('sitemap.xml → 2 locs, max-age=300', async () => {
  const r = await gw.fetch(req('/sitemap.xml'), env);
  assert.equal(r.status, 200);
  const xml = await r.text();
  assert.equal((xml.match(/<loc>/g) || []).length, 2);
  assert.equal(r.headers.get('Cache-Control'), 'public, max-age=300');
});

await t('llms.txt → text/plain, all 14 routes listed', async () => {
  const r = await gw.fetch(req('/llms.txt'), env);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('Content-Type'), /text\/plain/);
  const txt = await r.text();
  assert.equal((txt.match(/\/v1\//g) || []).length, ROUTE_COUNT);
  assert.ok(txt.includes('https://formatho.com/'));
});

console.log(`\napi-gateway: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
