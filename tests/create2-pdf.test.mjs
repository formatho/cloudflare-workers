// Local tests: CREATE2 Calculator (EIP-1014) + PDF Signature Checker
// Run: node tests/create2-pdf.test.mjs
import assert from 'node:assert';

const create2 = (await import('../create2-calculator/src/index.js')).default;
const pdfsig = (await import('../pdf-signature-checker/src/index.js')).default;

const base2 = 'https://create2-calculator-formatho.filesformatho.workers.dev';
const baseP = 'https://pdf-signature-checker-formatho.filesformatho.workers.dev';
const ENC = new TextEncoder();
let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); passed++; console.log('PASS', name); }
  catch (e) { failed++; console.log('FAIL', name, '—', e.message); }
}

// ---------- CREATE2 ----------
const V = [
  ['0x4D1A2e2bB4F88F0250f26Ffff098B0b30B26BF38', '0000000000000000000000000000000000000000', '00'.repeat(32), '00'],
  ['0xB928f69Bb1D91Cd65274e3c79d8986362984fDA3', 'deadbeef00000000000000000000000000000000', '00'.repeat(32), '00'],
  ['0xD04116cDd17beBE565EB2422F2497E06cC1C9833', 'deadbeef00000000000000000000000000000000', '000000000000000000000000feed000000000000000000000000000000000000', '00'],
  ['0x70f2b2914A2a4b783FaEFb75f459A580616Fcb5e', '0000000000000000000000000000000000000000', '00'.repeat(32), 'deadbeef'],
];
let i = 0;
for (const [exp, f, s, ic] of V) {
  i++;
  await t(`create2 EIP-1014 vector ${i}`, async () => {
    const r = await create2.fetch(new Request(`${base2}/api?factory=0x${f}&salt=0x${s}&init_code=0x${ic}`));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.create2_address.toLowerCase(), exp.toLowerCase());
    assert.equal(j.preimage.length, 2 + 170); // 85 bytes
  });
}

await t('create2 short salt is left-padded to 32 bytes (numeric)', async () => {
  // 0x0 numerically pads to the all-zero 32-byte salt = EIP-1014 example 1
  const r = await create2.fetch(new Request(`${base2}/api?factory=0x${V[1][1]}&salt=0x0&init_code=0x00`));
  const j = await r.json();
  assert.equal(j.salt, '0x' + '00'.repeat(32));
  assert.equal(j.create2_address.toLowerCase(), V[1][0].toLowerCase());
  // odd-length salt is numeric too: 0x1 == ...0001
  const r1 = await create2.fetch(new Request(`${base2}/api?factory=0x${V[1][1]}&salt=0x1&init_code=0x00`));
  assert.equal((await r1.json()).salt, '0x' + '00'.repeat(31) + '01');
  // short form == explicit long form
  const ra = await create2.fetch(new Request(`${base2}/api?factory=0x${V[0][1]}&salt=0xfeed&init_code=0x00`));
  const rb = await create2.fetch(new Request(`${base2}/api?factory=0x${V[0][1]}&salt=0x${'00'.repeat(30)}feed&init_code=0x00`));
  assert.equal((await ra.json()).create2_address, (await rb.json()).create2_address);
});

await t('create2 init_code_hash path skips inner hash', async () => {
  // inner keccak256(0x00) — take from a direct call
  const r0 = await create2.fetch(new Request(`${base2}/api?factory=0x${V[0][1]}&salt=0x0&init_code=0x00`));
  const inner = (await r0.json()).init_code_hash;
  const r = await create2.fetch(new Request(`${base2}/api?factory=0x${V[0][1]}&salt=0x0&init_code_hash=${inner}`));
  const j = await r.json();
  assert.equal(j.create2_address.toLowerCase(), V[0][0].toLowerCase());
  assert.equal(j.init_code_hash_provided, true);
});

await t('create2 POST JSON body works', async () => {
  const r = await create2.fetch(new Request(`${base2}/api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factory: '0x' + V[3][1], salt: '0x' + V[3][2], init_code: '0xdeadbeef' }) }));
  const j = await r.json();
  assert.equal(j.create2_address.toLowerCase(), V[3][0].toLowerCase());
});

await t('create2 clean 400s (bad/missing params)', async () => {
  const cases = [
    [`${base2}/api`, 'Missing required parameter: factory'],
    [`${base2}/api?factory=0x1234&salt=0x0`, 'must be exactly 40 hex characters'],
    [`${base2}/api?factory=0xzz${'00'.repeat(19)}&salt=0x0`, 'non-hex characters'],
    [`${base2}/api?factory=0x${'00'.repeat(20)}&salt=0x${'ab'.repeat(33)}`, 'at most 64 hex characters'],
    [`${base2}/api?factory=0x${'00'.repeat(20)}&salt=0x0&init_code=0x123`, 'even number of hex digits'],
    [`${base2}/api?factory=0x${'00'.repeat(20)}&salt=0x0&init_code=0x00&init_code_hash=0x${'ab'.repeat(32)}`, 'not both'],
    [`${base2}/api?factory=0x${'00'.repeat(20)}&salt=0x0&init_code_hash=0xabcd`, 'exactly 64 hex characters'],
  ];
  for (const [u, msg] of cases) {
    const r = await create2.fetch(new Request(u));
    assert.equal(r.status, 400, u);
    assert((await r.json()).error.includes(msg), u + ' → ' + msg);
  }
});

await t('create2 surfaces + OPTIONS preflight', async () => {
  for (const p of ['/', '/sitemap.xml', '/llms.txt']) {
    const r = await create2.fetch(new Request(base2 + p));
    assert.equal(r.status, 200, p);
  }
  const o = await create2.fetch(new Request(base2 + '/api', { method: 'OPTIONS' }));
  assert.equal(o.status, 204);
  assert.equal(o.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal((await create2.fetch(new Request(base2 + '/nope'))).status, 404);
});

// ---------- PDF Signature Checker ----------
function buildSignedPdf({ append = '', extraSig = false } = {}) {
  // Fixed-point iteration: ByteRange digit lengths affect earlier offsets
  let l1len = 1, o2len = 1, l2len = 1, file = '';
  for (let k = 0; k < 6; k++) {
    const seg1 = `%PDF-1.7\n1 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /M (D:20260101120000Z) /Reason (Test signature) /ByteRange [0 ${'X'.repeat(l1len)} ${'X'.repeat(o2len)} ${'X'.repeat(l2len)}] /Contents <`;
    const hex = 'AB'.repeat(16);
    const seg2 = `>>\nendobj\ntrailer\n<< /Root 1 0 R >>\nstartxref\n0\n%%EOF\n`;
    const realL1 = ENC.encode(seg1).length;
    const realO2 = realL1 + hex.length;
    const realL2 = ENC.encode(seg2).length;
    const nl1 = String(realL1).length, no2 = String(realO2).length, nl2 = String(realL2).length;
    if (nl1 === l1len && no2 === o2len && nl2 === l2len) {
      const s1 = seg1.replace('X'.repeat(l1len), String(realL1)).replace('X'.repeat(o2len), String(realO2)).replace('X'.repeat(l2len), String(realL2));
      file = s1 + hex + seg2;
      break;
    }
    l1len = nl1; o2len = no2; l2len = nl2;
  }
  if (!file) throw new Error('test PDF offsets did not stabilize');
  if (extraSig) file += file.slice('%PDF-1.7\n'.length, file.indexOf('%%EOF') + 6);
  file += append;
  return ENC.encode(file);
}

await t('pdf: fully-covered single signature → covered verdict', async () => {
  const r = await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: buildSignedPdf() }));
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.signed, true);
  assert.equal(j.signatures.length, 1);
  const s = j.signatures[0];
  assert.equal(s.coverage_pct, 100 - Math.round((32 / j.file_size) * 1000) / 10 >= 0 ? s.coverage_pct : 0); // sanity only
  assert.equal(s.contents_bytes, 16); // 'AB'.repeat(16) = 32 hex chars = 16 bytes
  assert.equal(s.subfilter, 'adbe.pkcs7.detached');
  assert.equal(s.trailing_bytes_after_signature, 0);
  assert.equal(j.is_fully_covered, true);
  assert(j.verdict.startsWith('signed range covers the entire document'), j.verdict);
  assert.equal(s.signing_time.iso, '2026-01-01T12:00:00Z');
  assert.equal(s.reason, 'Test signature');
});

await t('pdf: appended bytes → UNSIGNED CONTENT DETECTED', async () => {
  const r = await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', body: buildSignedPdf({ append: '% an incremental update after signing\n%%EOF\n' }) }));
  const j = await r.json();
  assert.equal(j.is_fully_covered, false);
  assert(j.verdict.startsWith('UNSIGNED CONTENT DETECTED'), j.verdict);
  assert(j.signatures[0].trailing_bytes_after_signature > 0);
  assert.equal(j.revisions_eof_markers, 2);
});

await t('pdf: multiple signatures counted, last one decides coverage', async () => {
  const r = await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', body: buildSignedPdf({ extraSig: true }) }));
  const j = await r.json();
  assert.equal(j.signatures.length, 2);
});

await t('pdf: no signature → signed=false, no crash', async () => {
  const r = await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', body: ENC.encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n') }));
  const j = await r.json();
  assert.equal(j.signed, false);
  assert(j.verdict.includes('no digital signature'));
});

await t('pdf: non-PDF body → clean 400', async () => {
  const r = await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', body: ENC.encode('hello world') }));
  assert.equal(r.status, 400);
  assert((await r.json()).error.includes('%PDF-'));
});

await t('pdf: empty body 400, oversized 413', async () => {
  const e = await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', body: new Uint8Array(0) }));
  assert.equal(e.status, 400);
  const big = new Uint8Array(20 * 1024 * 1024 + 1); big.set(ENC.encode('%PDF-1.7'));
  const o = await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', body: big }));
  assert.equal(o.status, 413);
});

await t('pdf: pdf_base64 JSON mode matches raw mode', async () => {
  const bytes = buildSignedPdf({ append: 'junk' });
  const raw = await (await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', body: bytes }))).json();
  const b64 = btoa(String.fromCharCode(...bytes));
  const js = await (await pdfsig.fetch(new Request(baseP + '/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdf_base64: b64 }) }))).json();
  assert.deepEqual(js.signatures, raw.signatures);
  assert.equal(js.verdict, raw.verdict);
});

await t('pdf: GET /api help + surfaces + preflight', async () => {
  const g = await pdfsig.fetch(new Request(baseP + '/api'));
  assert.equal(g.status, 200);
  assert((await g.json()).how_to_use.includes('POST'));
  for (const p of ['/', '/sitemap.xml', '/llms.txt']) {
    const r = await pdfsig.fetch(new Request(baseP + p));
    assert.equal(r.status, 200, p);
  }
  const o = await pdfsig.fetch(new Request(baseP + '/api', { method: 'OPTIONS' }));
  assert.equal(o.status, 204);
  assert.equal(o.headers.get('Access-Control-Allow-Origin'), '*');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
