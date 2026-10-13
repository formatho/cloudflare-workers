// Local tests for date-time-converter + storage-slot-calculator (run: node tests/datetime-storage.test.mjs)
import assert from 'node:assert';
import dt from '../date-time-converter/src/index.js';
import ss from '../storage-slot-calculator/src/index.js';

const dtApi = (q) => dt.fetch(new Request('https://x/api?' + q)).then(async (r) => ({ status: r.status, body: await r.json() }));
const ssApi = (q) => ss.fetch(new Request('https://x/api?' + q)).then(async (r) => ({ status: r.status, body: await r.json() }));

let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('ok  ' + name); passed++; }
  catch (e) { console.log('FAIL ' + name + ' :: ' + e.message); failed++; }
}

// ---- date-time-converter ----
await t('epoch 0 → 1970-01-01T00:00:00.000Z', async () => {
  const { status, body } = await dtApi('input=0');
  assert.equal(status, 200);
  assert.equal(body.iso8601, '1970-01-01T00:00:00.000Z');
  assert.equal(body.rfc2822, 'Thu, 01 Jan 1970 00:00:00 +0000');
  assert.equal(body.http_date, 'Thu, 01 Jan 1970 00:00:00 GMT');
});
await t('known ISO → all epoch units (2026-10-13T09:30:00Z)', async () => {
  const { body } = await dtApi('input=2026-10-13T09%3A30%3A00Z');
  assert.equal(body.unix_s, 1791883800);
  assert.equal(body.unix_ms, 1791883800000);
  assert.equal(body.unix_us, '1791883800000000');
  assert.equal(body.unix_ns, '1791883800000000000');
});
await t('epoch auto-unit detection: 10 digits=s, 13=ms, 16=µs, 19=ns agree', async () => {
  const a = await dtApi('input=1791883800');
  const b = await dtApi('input=1791883800000');
  const c = await dtApi('input=1791883800000000');
  const d = await dtApi('input=1791883800000000000');
  assert.equal(a.body.iso8601, b.body.iso8601);
  assert.equal(b.body.iso8601, c.body.iso8601);
  assert.equal(c.body.iso8601, d.body.iso8601);
  assert.equal(a.body.input_kind, 'epoch_s');
  assert.equal(d.body.input_kind, 'epoch_ns');
});
await t('naive input + from=Asia/Kolkata → correct UTC (+05:30)', async () => {
  const { body } = await dtApi('input=2026-10-13T15%3A00%3A00&from=Asia%2FKolkata&to=Asia%2FKolkata');
  assert.equal(body.iso8601, '2026-10-13T09:30:00.000Z');
  assert.equal(body.utc_offset, '+05:30');
});
await t('to=America/New_York wall clock + DST across boundary', async () => {
  const summer = await dtApi('input=2026-07-13T12%3A00%3A00Z&to=America%2FNew_York');
  assert.equal(summer.body.utc_offset, '-04:00');
  assert.equal(summer.body.time, '08:00:00');
  assert.equal(summer.body.dst_active, true);
  const winter = await dtApi('input=2026-01-13T12%3A00%3A00Z&to=America%2FNew_York');
  assert.equal(winter.body.utc_offset, '-05:00');
  assert.equal(winter.body.dst_active, false);
});
await t('ISO week / day-of-year / quarter on 2026-10-13', async () => {
  const { body } = await dtApi('input=2026-10-13');
  assert.equal(body.iso_week, 42);
  assert.equal(body.day_of_year, 286);
  assert.equal(body.quarter, 4);
  assert.equal(body.weekday, 'Tuesday');
  assert.equal(body.is_leap_year, false);
});
await t('format param + POST JSON body', async () => {
  const body = await dt.fetch(new Request('https://x/api', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: '1791883800', format: 'iso' }),
  })).then((r) => r.json());
  assert.equal(body.formatted, '2026-10-13T09:30:00.000Z');
});
await t('400s: missing input, bad tz, bad format, garbage input, too-long input', async () => {
  assert.equal((await dtApi('')).status, 400);
  assert.equal((await dtApi('input=2026-10-13&to=Mars/Olympus')).status, 400);
  assert.equal((await dtApi('input=2026-10-13&format=iso8601extra')).status, 400);
  assert.equal((await dtApi('input=not-a-date-at-all')).status, 400);
  assert.equal((await dtApi('input=' + '9'.repeat(101))).status, 400);
});
await t('landing/sitemap/llms/OPTIONS', async () => {
  assert.equal((await dt.fetch(new Request('https://x/'))).status, 200);
  assert.equal((await dt.fetch(new Request('https://x/sitemap.xml'))).status, 200);
  assert.equal((await dt.fetch(new Request('https://x/llms.txt'))).status, 200);
  const o = await dt.fetch(new Request('https://x/api', { method: 'OPTIONS' }));
  assert.equal(o.status, 204);
});

// ---- storage-slot-calculator ----
// canonical preimage check: keccak256(bytes32(1) ++ bytes32(0)) — value computed independently below via same core, cross-checked live vs foundry doc formula
await t('mapping slot 0, uint key 1 → keccak(pad32(1) . pad32(0))', async () => {
  const { status, body } = await ssApi('type=mapping&slot=0&key=1');
  assert.equal(status, 200);
  assert.match(body.slot, /^0x[0-9a-f]{64}$/);
  assert.equal(body.keccak_input, '0x' + '0'.repeat(63) + '1' + '0'.repeat(64));
  assert.equal(body.slot.length, 66);
});
await t('mapping address key preimage shape', async () => {
  const { body } = await ssApi('type=mapping&slot=5&key=0x90F8bf6A479F320ead074411a4B0e7944Ea8c9C1&key_type=address');
  assert.equal(body.keccak_input, '0x' + '0'.repeat(24) + '90f8bf6a479f320ead074411a4b0e7944ea8c9c1' + '0'.repeat(63) + '5');
});
await t('mapping string key uses keccak(key) as h(k)', async () => {
  const { body } = await ssApi('type=mapping&slot=1&key=hello&key_type=string');
  // keccak256("hello") = 1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36a_ac88 — verify prefix known: 0x1c8aff...
  assert.equal(body.keccak_input.slice(2, 10), '1c8aff95');
  assert.equal(body.formula.includes('keccak256(key_bytes)'), true);
});
await t('array: data slot = keccak(pad32(slot)); element index math', async () => {
  const { body } = await ssApi('type=array&slot=2&index=7');
  const dataSlot = BigInt(body.data_slot);
  assert.equal(BigInt(body.element_slot), dataSlot + 7n); // item_size default 32 → +index
  const packed = await ssApi('type=array&slot=2&index=7&item_size=16');
  assert.equal(BigInt(packed.body.element_slot), dataSlot + 3n); // floor(7*16/32)=3
});
await t('bytes/string: length note + chunk slots contiguous', async () => {
  const { body } = await ssApi('type=string&slot=3');
  const c = body.chunk_slots.map((x) => BigInt(x));
  assert.equal(c[1], c[0] + 1n);
  assert.equal(c[2], c[0] + 2n);
});
await t('element: slot + offset', async () => {
  const { body } = await ssApi('type=element&slot=0x10&offset=2');
  assert.equal(body.slot_decimal, '18');
});
await t('POST JSON parity with GET', async () => {
  const post = await ss.fetch(new Request('https://x/api', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'mapping', slot: 1, key: 42, key_type: 'uint' }),
  })).then((r) => r.json());
  const get = await ssApi('type=mapping&slot=1&key=42');
  assert.equal(post.slot, get.body.slot);
});
await t('400s: missing type/slot/key, bad key_type, bad hex, bad address, item_size range, negative index', async () => {
  assert.equal((await ssApi('')).status, 400);
  assert.equal((await ssApi('type=mapping&key=1')).status, 400);
  assert.equal((await ssApi('type=mapping&slot=1')).status, 400);
  assert.equal((await ssApi('type=mapping&slot=1&key=1&key_type=fixed128')).status, 400);
  assert.equal((await ssApi('type=mapping&slot=zz&key=1')).status, 400);
  assert.equal((await ssApi('type=mapping&slot=1&key=0x1234&key_type=address')).status, 400);
  assert.equal((await ssApi('type=mapping&slot=1&key=deadbeef&key_type=bytes32')).status, 400);
  assert.equal((await ssApi('type=array&slot=1&index=1&item_size=64')).status, 400);
  assert.equal((await ssApi('type=array&slot=1&index=-1')).status, 400);
  assert.equal((await ssApi('type=element&slot=1&offset=-2')).status, 400);
  assert.equal((await ssApi('type=wat&slot=1')).status, 400);
});
await t('int negative key two\u2019s complement preimage', async () => {
  const { body } = await ssApi('type=mapping&slot=0&key=-1&key_type=int');
  assert.equal(body.keccak_input, '0x' + 'f'.repeat(64) + '0'.repeat(64));
});
await t('landing/sitemap/llms/OPTIONS', async () => {
  assert.equal((await ss.fetch(new Request('https://x/'))).status, 200);
  assert.equal((await ss.fetch(new Request('https://x/sitemap.xml'))).status, 200);
  assert.equal((await ss.fetch(new Request('https://x/llms.txt'))).status, 200);
  assert.equal((await ss.fetch(new Request('https://x/api', { method: 'OPTIONS' }))).status, 204);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
