// Local smoke tests for ulid-generator + iban-validator workers (Node 18+).
import ulidW from '../ulid-generator/src/index.js';
import ibanW from '../iban-validator/src/index.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', msg); } };

async function call(worker, path, init) {
  const res = await worker.fetch(new Request('https://x.dummy' + path, init));
  return { status: res.status, body: await res.json() };
}

// ---- ULID ----
{
  const { body } = await call(ulidW, '/api?count=5');
  ok(body.ulids.length === 5, 'ulid count=5');
  const re = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;
  ok(body.ulids.every(u => re.test(u)), 'ulid alphabet+length');
  const ts = u => u.slice(0, 10); // timestamp part — only this is guaranteed ordered
  ok(body.ulids.every((u, i) => i === 0 || ts(u) >= ts(body.ulids[i - 1])), 'ulid timestamp prefix non-decreasing');

  const mon = await call(ulidW, '/api?count=100&monotonic=true');
  ok(mon.body.ulids.length === 100 && mon.body.monotonic === true, 'monotonic count');
  const sorted = [...mon.body.ulids].sort();
  ok(mon.body.ulids.every((u, i) => u === sorted[i]), 'monotonic batch strictly sorted (same ms)');

  const dec = await call(ulidW, '/api?ulid=' + body.ulids[0]);
  ok(dec.body.valid === true && dec.body.canonical === true, 'decode freshly generated valid');
  ok(typeof dec.body.timestamp_ms === 'number' && dec.body.datetime_iso.endsWith('Z'), 'decode ts fields');

  const badLen = await call(ulidW, '/api?ulid=01ARZ3NDEKTSV4RRFFQ69G5FA');
  ok(badLen.body.valid === false && /26 characters/.test(badLen.body.error), 'decode rejects 25 chars');
  const badChar = await call(ulidW, '/api?ulid=01ARZ3NDEKTSV4RRFFQ69G5FAU');
  ok(badChar.body.valid === false && /Invalid character/.test(badChar.body.error), 'decode rejects U');

  const known = await call(ulidW, '/api?ulid=01ARZ3NDEKTSV4RRFFQ69G5FAV');
  ok(known.body.valid === true, 'decode known spec-example ulid');

  const land = await ulidW.fetch(new Request('https://x.dummy/'));
  ok(land.headers.get('content-type').includes('text/html') && (await land.text()).includes('<title>ULID Generator'), 'landing html');
  const sm = await ulidW.fetch(new Request('https://x.dummy/sitemap.xml'));
  ok((await sm.text()).includes('ulid-generator-formatho'), 'sitemap');
}

// ---- IBAN ----
{
  const cases = [
    ['GB82WEST12345698765432', true],
    ['gb82 west 1234 5698 7654 32', true],   // lowercase + spaces
    ['DE89 3704 0044 0532 0130 00', true],
    ['FR1420041010050500013M02606', true],
    ['NO9386011117947', true],
    ['GB82WEST12345698765431', false],        // bad check digits
    ['GB82WEST1234569876543', false],         // wrong length
    ['82GBWEST12345698765432', false],        // no country letters
  ];
  for (const [iban, expected] of cases) {
    const { body } = await call(ibanW, '/api?iban=' + encodeURIComponent(iban));
    ok(body.valid === expected, `iban ${iban} => ${expected} (got ${body.valid}${body.errors ? ': ' + body.errors[0] : ''})`);
  }

  const gb = (await call(ibanW, '/api?iban=GB82WEST12345698765432')).body;
  ok(gb.mod_97 === 1 && gb.country === 'GB' && gb.length_ok === true, 'gb details');
  ok(gb.electronic === 'GB82WEST12345698765432' && gb.formatted === 'GB82 WEST 1234 5698 7654 32', 'formats');

  const xx = (await call(ibanW, '/api?iban=XX82WEST12345698765432')).body;
  ok(xx.length_known === false && xx.length_ok === null, 'unknown country length_known=false');

  const post = await call(ibanW, '/api', { method: 'POST', body: 'GB82WEST12345698765432' });
  ok(post.body.valid === true, 'POST raw body');

  const miss = await call(ibanW, '/api');
  ok(miss.body.error.includes('Missing'), 'missing param usage');

  const land = await ibanW.fetch(new Request('https://x.dummy/'));
  ok(land.headers.get('content-type').includes('text/html') && (await land.text()).includes('IBAN Validator'), 'landing html');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
