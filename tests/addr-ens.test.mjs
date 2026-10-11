// Local tests for address-checksum (EIP-55) + ens-namehash (ENSIP-2) workers
// Vectors: EIP-55 spec addresses; ENS canonical namehash values
import addr from '../address-checksum/src/index.js';
import ens from '../ens-namehash/src/index.js';

let pass = 0, fail = 0;
function t(name, ok, extra) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
}
async function get(worker, path, params) {
  const u = new URL('http://x' + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await worker.fetch(new Request(u));
  let body = null;
  try { body = await res.json(); } catch (e) { /* non-json */ }
  return { status: res.status, body };
}
async function postJson(worker, path, obj) {
  const res = await worker.fetch(new Request('http://x' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }));
  return { status: res.status, body: await res.json() };
}

// --- EIP-55 spec vectors ---
const SPEC = [
  '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
  '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
  '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb',
];

console.log('address-checksum (EIP-55):');
for (const v of SPEC) {
  const r = await get(addr, '/api', { address: v.toLowerCase() });
  t(`lowercase → ${v.slice(0, 12)}…`, r.status === 200 && r.body.address === v, JSON.stringify(r.body).slice(0, 120));
}
for (const v of SPEC) {
  const r = await get(addr, '/api', { address: v });
  t(`checksum_valid true for ${v.slice(0, 12)}…`, r.status === 200 && r.body.checksum_valid === true && r.body.mismatch_count === 0);
}
{
  const r = await get(addr, '/api', { address: SPEC[0].toLowerCase() });
  t('all-lower advisory', r.body.checksum_valid === false && r.body.is_all_lower === true && r.body.mismatch_count > 0 && r.body.address === SPEC[0], JSON.stringify(r.body).slice(0, 200));
}
{
  // one letter case flipped → mismatch detected at that position
  const bad = '0x5aAeb6053F3E94C9b9A09f33669435e7Ef1BeAed'; // 35E→35e
  const r = await get(addr, '/api', { address: bad });
  const good = await get(addr, '/api', { address: SPEC[0] });
  t('bad case → checksum_valid false', r.status === 200 && r.body.checksum_valid === false);
  t('bad case → same canonical form', r.body.address === good.body.address);
}
{
  const r = await get(addr, '/api', { address: '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beae' }); // 39 chars
  t('39 chars → 400', r.status === 400 && /40 hex characters/.test(r.body.error));
  const r2 = await get(addr, '/api', { address: '0x5zaeb6053f3e94c9b9a09f33669435e7ef1beaed' });
  t('non-hex → 400', r2.status === 400 && /non-hex/.test(r2.body.error));
  const r3 = await get(addr, '/api', {});
  t('missing param → 400', r3.status === 400 && /Missing required/.test(r3.body.error));
  const r4 = await get(addr, '/api', { address: SPEC[1].slice(2) }); // no prefix
  const r5 = await get(addr, '/api', { address: '0X' + SPEC[1].slice(2) }); // 0X prefix
  t('prefix-optional + 0X accepted', r4.status === 200 && r4.body.had_prefix === false && r5.status === 200 && r5.body.address === SPEC[1]);
  const r6 = await postJson(addr, '/api', { address: SPEC[2].toLowerCase() });
  t('POST JSON works', r6.status === 200 && r6.body.address === SPEC[2]);
}

console.log('ens-namehash (ENSIP-2):');
{
  const r = await get(ens, '/api', { name: '' });
  t('root "" → 0x00*32', r.status === 200 && r.body.namehash === '0x' + '0'.repeat(64) && r.body.root === true);
  const r2 = await get(ens, '/api', { name: '.' });
  t('"." → root too', r2.status === 200 && r2.body.namehash === '0x' + '0'.repeat(64));
}
{
  const r = await get(ens, '/api', { name: 'eth' });
  // verified independently against pycryptodome keccak (2 impls agree)
  t('namehash(eth) canonical', r.status === 200 && r.body.namehash === '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae', r.body.namehash);
  t('labelhash(eth) canonical', r.body.labels[0].labelhash === '0x4f5b812789fc606be1b3b16908db13fc7a9adf7ca72641f84d75b47069d3d7f0');
}
{
  const r = await get(ens, '/api', { name: 'alice.eth' });
  t('namehash(alice.eth) pycryptodome-verified', r.status === 200 && r.body.namehash === '0x787192fc5378cc32aa956ddfdedbf26b24e8d78e40109add0eea2c1a012c3dec', r.body.namehash);
}
{
  const r = await get(ens, '/api', { name: 'ALICE.eth' });
  t('lowercased input', r.status === 200 && r.body.name === 'alice.eth');
  t('depth + label order', r.body.depth === 2 && r.body.labels[0].label === 'alice' && r.body.labels[1].label === 'eth');
  const r2 = await get(ens, '/api', { name: 'alice.eth' });
  t('case-insensitive namehash stable', r.body.namehash === r2.body.namehash);
}
{
  const r = await get(ens, '/api', { name: 'a..b' });
  t('double dot → 400', r.status === 400 && /empty label/.test(r.body.error));
  const r2 = await get(ens, '/api', { name: '.a' });
  t('leading dot → 400', r2.status === 400);
  const r3 = await get(ens, '/api', {});
  t('missing param → 400', r3.status === 400 && /Missing required/.test(r3.body.error));
  const r4 = await get(ens, '/api', { name: 'x'.repeat(600) });
  t('too long → 413', r4.status === 413);
  const r5 = await get(ens, '/api', { name: 'ünï.eth' });
  t('non-ascii flagged', r5.status === 200 && !!r5.body.normalization_note);
  const r6 = await postJson(ens, '/api', { name: 'foo.bar.eth' });
  t('POST JSON works, 3 labels', r6.status === 200 && r6.body.depth === 3);
}

console.log('shared surfaces:');
for (const [label, w] of [['address-checksum', addr], ['ens-namehash', ens]]) {
  const pre = await w.fetch(new Request('http://x/api', { method: 'OPTIONS' }));
  t(`${label} OPTIONS 204`, pre.status === 204 && (pre.headers.get('Access-Control-Allow-Origin') === '*'));
  const sm = await w.fetch(new Request('http://x/sitemap.xml'));
  t(`${label} sitemap 200`, sm.status === 200);
  const ll = await w.fetch(new Request('http://x/llms.txt'));
  t(`${label} llms.txt 200`, ll.status === 200);
  const landing = await w.fetch(new Request('http://x/'));
  const html = await landing.text();
  t(`${label} landing HTML + ld+json + backlink`, landing.status === 200 && html.includes('application/ld+json') && html.includes('formatho.com/tools/'));
  const nf = await w.fetch(new Request('http://x/nope'));
  t(`${label} 404`, nf.status === 404);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
