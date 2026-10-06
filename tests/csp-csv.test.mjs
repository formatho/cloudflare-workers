// Local tests for csp-generator + csv-counter workers (node --test tests/csp-csv.test.mjs)
import test from 'node:test';
import assert from 'node:assert';
import csp from '../csp-generator/src/index.js';
import csv from '../csv-counter/src/index.js';

const CSP = 'https://csp-generator-formatho.filesformatho.workers.dev';
const CSV = 'https://csv-counter-formatho.filesformatho.workers.dev';

function req(base, path, init) { return new Request(base + path, init); }

test('csp: basic enforce policy from query params', async () => {
  const r = await csp.fetch(req(CSP, `/api?default-src=self&script-src=self+https://cdn.example.com&object-src=none&base-uri=self`));
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.header, 'Content-Security-Policy');
  assert.ok(j.policy.includes("default-src 'self'"));
  assert.ok(j.policy.includes("script-src 'self' https://cdn.example.com"));
  assert.ok(j.policy.includes("object-src 'none'"));
  assert.ok(j.policy.includes("base-uri 'self'"));
});

test('csp: report-only mode + report-to flag', async () => {
  const r = await csp.fetch(req(CSP, `/api?default-src=none&report-only=true&report-to=csp-endpoint`));
  const j = await r.json();
  assert.equal(j.header, 'Content-Security-Policy-Report-Only');
  assert.equal(j.directives['report-to'][0], 'csp-endpoint');
});

test('csp: POST JSON directives + warnings for unsafe-inline/eval, *', async () => {
  const r = await csp.fetch(req(CSP, '/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ directives: { 'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", '*'] } }) }));
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.ok(j.warnings.some(w => w.includes("'unsafe-inline'")));
  assert.ok(j.warnings.some(w => w.includes("'unsafe-eval'")));
  assert.ok(j.warnings.some(w => w.includes('*')));
});

test('csp: unsafe-inline ignored alongside nonce warning', async () => {
  const r = await csp.fetch(req(CSP, `/api?script-src='nonce-abc123'+%27unsafe-inline%27`));
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.ok(j.warnings.some(w => w.includes("'unsafe-inline' is ignored")));
});

test('csp: none mixed with other tokens warns', async () => {
  const r = await csp.fetch(req(CSP, `/api?img-src='none'+data:`));
  const j = await r.json();
  assert.ok(j.warnings.some(w => w.includes("'none' must be the only source")));
});

test('csp: unknown directive → 400', async () => {
  const r = await csp.fetch(req(CSP, `/api?foo-src=self`));
  const j = await r.json();
  assert.equal(r.status, 400);
  assert.ok(j.error.includes('Unknown directive'));
});

test('csp: invalid token (semicolon / bare quote) → 400', async () => {
  const a = await csp.fetch(req(CSP, `/api?default-src=self%3Bimg-src=*`));
  assert.equal(a.status, 400);
  const b = await csp.fetch(req(CSP, `/api?script-src='self`));
  assert.equal(b.status, 400);
});

test('csp: no default-src warning + base-uri/frame-ancestors suggestions', async () => {
  const r = await csp.fetch(req(CSP, `/api?script-src=self`));
  const j = await r.json();
  assert.ok(j.warnings.some(w => w.includes('No default-src')));
  assert.ok(j.warnings.some(w => w.includes('base-uri')));
  assert.ok(j.warnings.some(w => w.includes('frame-ancestors')));
});

test('csp: GET /api with no query returns help; landing/sitemap/llms 200; OPTIONS 204', async () => {
  const h = await csp.fetch(req(CSP, '/api'));
  const hj = await h.json();
  assert.ok(hj.directives.includes('default-src'));
  assert.equal((await csp.fetch(req(CSP, '/'))).status, 200);
  assert.equal((await csp.fetch(req(CSP, '/sitemap.xml'))).status, 200);
  const ll = await csp.fetch(req(CSP, '/llms.txt'));
  assert.equal(ll.status, 200);
  assert.match(await ll.text(), /formatho\.com\/tools\/csp-generator/);
  const o = await csp.fetch(req(CSP, '/api', { method: 'OPTIONS' }));
  assert.equal(o.status, 204);
  assert.equal(o.headers.get('Access-Control-Max-Age'), '86400');
});

const SAMPLE = 'name,age,city\nAlice,30,"Berlin, DE"\nBob,,\nCarol,41,Hamburg';

test('csv: counts rows/columns, RFC4180 quoted comma', async () => {
  const r = await csv.fetch(req(CSV, '/api?header=true', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: SAMPLE }));
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.total_rows, 4);
  assert.equal(j.data_rows, 3);
  assert.equal(j.columns, 3);
  assert.deepEqual(j.column_names, ['name', 'age', 'city']);
  const age = j.column_stats.find(c => c.name === 'age');
  assert.equal(age.filled, 2);
  assert.equal(age.empty, 1);
  const city = j.column_stats.find(c => c.name === 'city');
  assert.equal(city.filled, 2);
  assert.equal(city.distinct, 2); // "Berlin, DE" (quoted comma) + Hamburg; Bob's empty city not counted
});

test('csv: GET ?csv= + auto delimiter (semicolon)', async () => {
  const r = await csv.fetch(req(CSV, `/api?csv=${encodeURIComponent('a;b\n1;2')}&header=true`));
  const j = await r.json();
  assert.equal(j.delimiter, ';');
  assert.equal(j.data_rows, 1);
  assert.equal(j.columns, 2);
});

test('csv: tab delimiter param + no header', async () => {
  const r = await csv.fetch(req(CSV, '/api?delimiter=tab&header=false', { method: 'POST', body: 'x\ty\n1\t2\n3\t4' }));
  const j = await r.json();
  assert.equal(j.delimiter, 'tab');
  assert.equal(j.data_rows, 3);
  assert.deepEqual(j.column_names, ['column_1', 'column_2']);
});

test('csv: duplicate/missing header names get unique column_N names', async () => {
  const r = await csv.fetch(req(CSV, '/api?header=true', { method: 'POST', body: 'a,a,\n1,2,3' }));
  const j = await r.json();
  assert.equal(j.column_names[0], 'a');
  assert.equal(j.column_names[1], 'a_2');
  assert.equal(j.column_names[2], 'column_3');
});

test('csv: empty body → 400; bad delimiter → 400; oversized → 400', async () => {
  assert.equal((await csv.fetch(req(CSV, '/api', { method: 'POST', body: '' }))).status, 400);
  assert.equal((await csv.fetch(req(CSV, `/api?csv=a%2Cb&delimiter=banana`))).status, 400);
  const big = await csv.fetch(req(CSV, '/api', { method: 'POST', body: 'a'.repeat(1_048_577) }));
  assert.equal(big.status, 400);
});

test('csv: ragged rows flagged; embedded newline in quotes one row', async () => {
  const r = await csv.fetch(req(CSV, '/api?header=true', { method: 'POST', body: 'a,b\n"line1\nline2",2' }));
  const j = await r.json();
  assert.equal(j.data_rows, 1);
  const r2 = await csv.fetch(req(CSV, '/api?header=true', { method: 'POST', body: 'a,b\n1,2,3\n4,5' }));
  assert.equal((await r2.json()).ragged_rows, 2);
});

test('csv: surfaces + OPTIONS preflight', async () => {
  assert.equal((await csv.fetch(req(CSV, '/'))).status, 200);
  assert.equal((await csv.fetch(req(CSV, '/sitemap.xml'))).status, 200);
  const ll = await csv.fetch(req(CSV, '/llms.txt'));
  assert.match(await ll.text(), /formatho\.com\/tools\/csv-counter/);
  const o = await csv.fetch(req(CSV, '/api', { method: 'OPTIONS' }));
  assert.equal(o.status, 204);
  const h = await csv.fetch(req(CSV, '/api'));
  assert.ok((await h.json()).params);
});
