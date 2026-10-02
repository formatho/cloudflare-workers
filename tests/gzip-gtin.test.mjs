import assert from 'node:assert';

const gzip = (await import('../gzip-converter/src/index.js')).default;
const gtin = (await import('../gtin-validator/src/index.js')).default;
const base = 'http://x';
let pass = 0;
async function call(mod, path, init) { return mod.fetch(new Request(base + path, init)); }
async function json(res) { return res.json(); }

// ---- gzip: compress → decompress round-trip (ASCII)
{
  const r = await json(await call(gzip, '/api?text=hello%20hello%20hello%20hello'));
  assert.equal(r.gzip_base64.length > 0, true, 'b64 nonempty');
  assert.equal(r.gzip_hex.length % 2, 0, 'hex even');
  const d = await json(await call(gzip, `/api?mode=decompress&text=${encodeURIComponent(r.gzip_base64)}`));
  assert.equal(d.text, 'hello hello hello hello', 'ascii round-trip');
  const big = await json(await call(gzip, `/api?text=${encodeURIComponent('hello world '.repeat(60))}`));
  assert.equal(big.compression_ratio_pct > 50, true, `repeated text compresses (got ${big.compression_ratio_pct}%)`);
  pass++;
}
// ---- gzip: unicode + newline round-trip, and hex-encoding round-trip
{
  const src = 'héllo 🌍 ünïcode\nline\t2';
  const r = await json(await call(gzip, '/api', { method: 'POST', body: JSON.stringify({ text: src }) }));
  const d1 = await json(await call(gzip, '/api', { method: 'POST', body: JSON.stringify({ text: r.gzip_base64, mode: 'decompress' }) }));
  assert.equal(d1.text, src, 'unicode POST round-trip');
  const d2 = await json(await call(gzip, `/api?mode=decompress&encoding=hex&text=${r.gzip_hex}`));
  assert.equal(d2.text, src, 'hex round-trip');
  pass++;
}
// ---- gzip: clean 400s
{
  assert.equal((await call(gzip, '/api?text=')).status, 400, 'missing text');
  assert.equal((await call(gzip, '/api?text=abc&mode=zip')).status, 400, 'bad mode');
  assert.equal((await call(gzip, '/api?text=abc&encoding=z85')).status, 400, 'bad encoding');
  assert.equal((await call(gzip, '/api?mode=decompress&text=%21%21%21notb64')).status, 400, 'invalid base64');
  assert.equal((await call(gzip, '/api?mode=decompress&text=aGVsbG8%3D')).status, 400, 'valid b64, not gzip');
  assert.equal((await call(gzip, '/api?mode=decompress&encoding=hex&text=abc')).status, 400, 'odd hex');
  const or = await call(gzip, '/api', { method: 'OPTIONS', headers: { 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(or.status, 204, 'preflight 204');
  assert.equal(or.headers.get('access-control-allow-origin'), '*');
  const l = await call(gzip, '/llms.txt');
  assert.equal(l.status, 200); assert.match(l.headers.get('content-type'), /text\/plain/);
  pass++;
}
// ---- gtin: known vectors
{
  const r1 = await json(await call(gtin, '/api?gtin=4006381333931'));
  assert.equal(r1.valid, true, '4006381333931 valid'); assert.equal(r1.type, 'GTIN-13 (EAN-13 / UCC-13)');
  const r2 = await json(await call(gtin, '/api?gtin=9780306406157'));
  assert.equal(r2.valid, true, 'ISBN-13 vector valid'); assert.equal(r2.gtin14, '09780306406157');
  const r3 = await json(await call(gtin, '/api?gtin=4006381333930'));
  assert.equal(r3.valid, false); assert.equal(r3.expected_check_digit, 1, 'expected digit correct');
  const r4 = await json(await call(gtin, '/api?base=629104150021'));
  assert.equal(r4.check_digit, 3, 'GS1 example check digit'); assert.equal(r4.gtin, '6291041500213');
  const r5 = await json(await call(gtin, '/api?gtin=4%2000%206381%20333931'));
  assert.equal(r5.valid, true, 'spaces stripped');
  pass++;
}
// ---- gtin: round-trip property — generate(base) then validate → valid
{
  for (const b of ['9638507', '012345678901', '629104150021', '1234567890123']) {
    const g = await json(await call(gtin, `/api?base=${b}`));
    const v = await json(await call(gtin, `/api?gtin=${g.gtin}`));
    assert.equal(v.valid, true, `round-trip ${b}`);
  }
  pass++;
}
// ---- gtin: clean 400s + surfaces
{
  assert.equal((await call(gtin, '/api')).status, 400, 'missing param');
  assert.equal((await call(gtin, '/api?gtin=40063A1333931')).status, 400, 'non-digit');
  assert.equal((await call(gtin, '/api?gtin=12345')).status, 400, 'bad length');
  assert.equal((await call(gtin, '/api?base=123')).status, 400, 'bad base length');
  assert.equal((await call(gtin, '/api?base=123a567')).status, 400, 'non-digit base');
  const p = await json(await call(gtin, '/api', { method: 'POST', body: JSON.stringify({ gtin: '4006381333931' }) }));
  assert.equal(p.valid, true, 'POST works');
  const or = await call(gtin, '/api', { method: 'OPTIONS' });
  assert.equal(or.status, 204, 'preflight');
  assert.equal((await call(gtin, '/sitemap.xml')).status, 200, 'sitemap');
  assert.match(await (await call(gtin, '/')).text(), /<title>GTIN Validator/, 'landing title');
  pass++;
}
console.log(`ALL ${pass}/6 LOCAL TEST GROUPS PASS`);
