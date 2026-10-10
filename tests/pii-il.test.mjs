// Local tests for pii-redactor + impermanent-loss workers (node, Response/Request globals)
import { default as pii } from '../pii-redactor/src/index.js';
import { default as il } from '../impermanent-loss/src/index.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; } else { fail++; console.log(`FAIL: ${name} ${extra}`); } };
const call = async (mod, path, init) => { const r = await mod.fetch(new Request(`https://x.dummy${path}`, init)); return { status: r.status, body: await r.json() }; };
const GET = (mod, q) => call(mod, `/api?${q}`);
const POST = (mod, body) => call(mod, '/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// ---------- PII redactor ----------
const doc = 'Contact jane.doe@corp.com or +1 (415) 555-0132 or +44 7911 123456. Card 4111 1111 1111 1111, SSN 078-05-1120, IBAN GB82WEST12345698765432, server 192.168.1.24.';
let r = await POST(pii, { text: doc });
ok('pii status 200', r.status === 200);
const bt = r.body.findings.by_type;
ok('pii email', bt.email === 1, JSON.stringify(bt));
ok('pii phone x2', bt.phone === 2, JSON.stringify(bt));
ok('pii credit_card', bt.credit_card === 1, JSON.stringify(bt));
ok('pii ssn', bt.ssn === 1, JSON.stringify(bt));
ok('pii iban', bt.iban === 1, JSON.stringify(bt));
ok('pii ipv4', bt.ipv4 === 1, JSON.stringify(bt));
ok('pii redacted has no email', !r.body.redacted_text.includes('jane.doe'));
ok('pii redacted tokens', r.body.redacted_text.includes('[EMAIL]') && r.body.redacted_text.includes('[CREDIT_CARD]'));
ok('pii total', r.body.findings.total === 7);

// Luhn rejection: order-number-like runs must survive
r = await POST(pii, { text: 'Order 1234567890123 and ref 1111 1111 1111 1112 shipped' });
ok('pii luhn-reject 400s nothing', r.body.findings.total === 0, JSON.stringify(r.body.findings.by_type) + ' :: ' + r.body.redacted_text);
// valid bare visa without separators
r = await POST(pii, { text: 'pay with 4111111111111111 ok' });
ok('pii bare cc', r.body.findings.by_type.credit_card === 1);

// spaced IBAN + spaced SSN
r = await POST(pii, { text: 'IBAN GB82 WEST 1234 5698 7654 32 / SSN 078 05 1120' });
ok('pii spaced iban+ssn', r.body.findings.by_type.iban === 1 && r.body.findings.by_type.ssn === 1, r.body.redacted_text);
// invalid iban (right shape, wrong checksum)
r = await POST(pii, { text: 'IBAN GB82WEST12345698765433' });
ok('pii bad iban survives', r.body.findings.total === 0, r.body.redacted_text);

// mask mode
r = await POST(pii, { text: 'a@b.co', mode: 'mask' });
ok('pii mask len', r.body.redacted_text === '******', `"${r.body.redacted_text}"`);
// types filter
r = await POST(pii, { text: 'a@b.co and 10.0.0.1', types: 'email' });
ok('pii types filter', r.body.redacted_text.includes('[EMAIL]') && r.body.redacted_text.includes('10.0.0.1'));
// positions
r = await POST(pii, { text: 'x a@b.co y', include_positions: true });
const pos = r.body.findings.positions[0];
ok('pii positions', pos.type === 'email' && pos.start === 2 && pos.end === 8, JSON.stringify(pos));

// 400s
r = await GET(pii, 'text=&mode=redact');
ok('pii 400 missing text', r.status === 400);
r = await POST(pii, { text: 'hi', mode: 'destroy' });
ok('pii 400 bad mode', r.status === 400);
r = await POST(pii, { text: 'hi', mode: 'mask', mask_char: '**' });
ok('pii 400 mask_char', r.status === 400);
r = await POST(pii, { text: 'hi', types: 'email,dna' });
ok('pii 400 bad type', r.status === 400);
r = await POST(pii, { text: 'x'.repeat(1024 * 1024 + 1) });
ok('pii 400 oversize', r.status === 400);
// method
let mr = await pii.fetch(new Request('https://x.dummy/api', { method: 'DELETE' }));
ok('pii 405', mr.status === 405);

// ---------- Impermanent loss ----------
r = await GET(il, 'amount_a=1&amount_b=4000&p1=8000');
ok('il status 200', r.status === 200);
ok('il 2x = -5.719%', Math.abs(r.body.impermanent_loss_pct + 5.719) < 0.001, r.body.impermanent_loss_pct);
ok('il lp value 11313.71', Math.abs(r.body.exit.lp.value_b - 11313.708) < 0.001, r.body.exit.lp.value_b);
ok('il hodl 12000', r.body.exit.hodl.value_b === 12000);
ok('il fee breakeven ~6.06%', Math.abs(r.body.fee_breakeven_pct - 6.066) < 0.01, r.body.fee_breakeven_pct);
ok('il deposit value 8000', r.body.deposit.value_b === 8000);
ok('il scenarios 11 rows', r.body.scenarios.length === 11);
const s100 = r.body.scenarios.find(s => s.price_change_pct === 100);
ok('il scenario 100 = -5.719%', Math.abs(s100.impermanent_loss_pct + 5.719) < 0.001);

r = await GET(il, 'price_change=100');
ok('il price_change path', Math.abs(r.body.impermanent_loss_pct + 5.719) < 0.001);
r = await GET(il, 'p0=100&p1=400');
ok('il p0/p1 4x = -20%', Math.abs(r.body.impermanent_loss_pct + 20) < 0.001, r.body.impermanent_loss_pct);
r = await GET(il, 'p0=100&p1=125');
ok('il 1.25x = -0.62%', Math.abs(r.body.impermanent_loss_pct + 0.6221) < 0.01, r.body.impermanent_loss_pct);
r = await POST(il, { amount_a: 2.5, amount_b: 7500, price_change: 50 });
ok('il POST amounts+pc', r.status === 200 && Math.abs(r.body.impermanent_loss_pct + 2.0198) < 0.001, JSON.stringify(r.body.impermanent_loss_pct));
ok('il deposit echoes p0', r.body.initial_price === 3000, r.body.initial_price);

r = await GET(il, 'price_change=-100');
ok('il 400 -100%', r.status === 400);
r = await GET(il, 'p0=0&p1=5');
ok('il 400 p0=0', r.status === 400);
r = await POST(il, {});
ok('il 400 no inputs', r.status === 400);
r = await GET(il, 'p0=100');
ok('il 400 p1 missing', r.status === 400);
r = await GET(il, 'amount_a=1&amount_b=0&p1=2');
ok('il 400 amount_b=0', r.status === 400);
r = await GET(il, 'p0=abc&p1=5');
ok('il 400 non-numeric', r.status === 400);

// help surfaces
let h = await GET(pii, '');
ok('pii help', h.body && typeof h.body.params === 'object');
h = await GET(il, '');
ok('il help', h.body && typeof h.body.known_values === 'object');
// llms + sitemap + landing
for (const [mod, name] of [[pii, 'pii'], [il, 'il']]) {
  const l = await mod.fetch(new Request('https://x.dummy/llms.txt'));
  const s = await mod.fetch(new Request('https://x.dummy/sitemap.xml'));
  const g = await mod.fetch(new Request('https://x.dummy/'));
  const o = await mod.fetch(new Request('https://x.dummy/api', { method: 'OPTIONS' }));
  ok(`${name} llms 200`, l.status === 200 && (await l.text()).includes('Formatho'));
  ok(`${name} sitemap 200`, s.status === 200);
  ok(`${name} landing 200 + ld+json`, g.status === 200 && (await g.text()).includes('application/ld+json'));
  ok(`${name} OPTIONS 204`, o.status === 204 && o.headers.get('Access-Control-Allow-Origin') === '*');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
