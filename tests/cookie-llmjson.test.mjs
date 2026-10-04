// Local edge tests: cookie-analyzer + llm-json-validator (run: node tests/cookie-llmjson.test.mjs)
import assert from 'node:assert/strict';

const cookie = (await import('../cookie-analyzer/src/index.js')).default;
const llmjson = (await import('../llm-json-validator/src/index.js')).default;

const req = (path, init) => new Request(`https://x.dev${path}`, init);
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; } catch (e) { fail++; console.error('FAIL:', name, '\n ', e.message); } };

// ---------- cookie-analyzer ----------
const SC = 'session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600';

await t('set-cookie: full parse', async () => {
  const r = await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent(SC)}`));
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.type, 'set-cookie');
  assert.deepEqual(j.cookie.flags, { secure: true, http_only: true, partitioned: false });
  assert.equal(j.cookie.attributes.samesite, 'lax');
  assert.equal(j.cookie.attributes.path, '/');
  assert.equal(j.cookie.lifetime.type, 'persistent');
  assert.equal(j.cookie.lifetime.source, 'max_age');
  assert.equal(j.cookie.scope.host_only, true);
});

await t('set-cookie: __Host- prefix rules enforced', async () => {
  const bad = '__Host-id=1; Path=/foo; Secure';
  const j = await (await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent(bad)}`))).json();
  assert.equal(j.cookie.prefixes.has_host_prefix, true);
  assert.equal(j.cookie.prefixes.valid, false);
  assert.ok(j.warnings.some((w) => w.includes('Path=/')));
  const good = '__Host-id=1; Path=/; Secure';
  const j2 = await (await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent(good)}`))).json();
  assert.equal(j2.cookie.prefixes.valid, true);
  const domained = '__Host-id=1; Path=/; Secure; Domain=example.com';
  const j3 = await (await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent(domained)}`))).json();
  assert.equal(j3.cookie.prefixes.valid, false);
});

await t('set-cookie: SameSite=None w/o Secure warned', async () => {
  const j = await (await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent('a=1; SameSite=None')}`))).json();
  assert.ok(j.warnings.some((w) => w.includes('SameSite=None requires Secure')));
  assert.ok(j.warnings.some((w) => w.includes('Missing Secure')));
});

await t('set-cookie: Expires HTTP-date parsed, expired flagged', async () => {
  const j = await (await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent('a=1; Expires=Wed, 21 Oct 2015 07:28:00 GMT')}`))).json();
  assert.equal(j.cookie.attributes.expires.parsed, '2015-10-21T07:28:00.000Z');
  assert.equal(j.cookie.lifetime.type, 'persistent');
  assert.equal(j.cookie.lifetime.already_expired, true);
});

await t('set-cookie: session cookie, no attrs, warns on missing flags', async () => {
  const j = await (await cookie.fetch(req(`/api?set-cookie=x%3Dy`))).json();
  assert.equal(j.cookie.lifetime.type, 'session');
  assert.ok(j.warnings.some((w) => w.includes('Missing Secure')));
  assert.ok(j.warnings.some((w) => w.includes('Missing HttpOnly')));
});

await t('set-cookie: invalid Max-Age + bad Expires warned, not fatal', async () => {
  const j = await (await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent('a=1; Max-Age=soon; Expires=never')}`))).json();
  assert.equal(j.cookie.lifetime.type, 'session');
  assert.ok(j.warnings.some((w) => w.includes('Max-Age value "soon"')));
  assert.ok(j.warnings.some((w) => w.includes('"never" is not a valid HTTP date')));
});

await t('set-cookie: no "=" → clean 400', async () => {
  const r = await cookie.fetch(req(`/api?set-cookie=justname`));
  assert.equal(r.status, 400);
  assert.ok((await r.json()).error.includes('RFC 6265'));
});

await t('set-cookie: oversize cookie warned', async () => {
  const big = 'k=' + 'v'.repeat(4100);
  const j = await (await cookie.fetch(req(`/api?set-cookie=${encodeURIComponent(big)}`))).json();
  assert.ok(j.warnings.some((w) => w.includes('4096')));
});

await t('cookie header: pairs, decode, duplicates', async () => {
  const j = await (await cookie.fetch(req(`/api?cookie=${encodeURIComponent('a=1; b=hello%20world; a=2')}`))).json();
  assert.equal(j.type, 'cookie-header');
  assert.equal(j.count, 3);
  assert.equal(j.cookies[1].decoded_value, 'hello world');
  assert.ok(j.warnings.some((w) => w.includes('"a" appears 2 times')));
});

await t('cookie header: auto-detect multi-pair input', async () => {
  const j = await (await cookie.fetch(req(`/api?type=auto&set-cookie=${encodeURIComponent('a=1; b=2')}`))).json();
  assert.equal(j.type, 'cookie-header');
  assert.equal(j.auto_detected, true);
});

await t('analyzes request Cookie header when no param', async () => {
  const r = await cookie.fetch(req('/api', { headers: { Cookie: 'sid=zzz; theme=dark' } }));
  const j = await r.json();
  assert.equal(j.count, 2);
});

await t('missing input → clean 400', async () => {
  const r = await cookie.fetch(req('/api'));
  assert.equal(r.status, 400);
});

await t('both params → clean 400', async () => {
  const r = await cookie.fetch(req(`/api?cookie=a%3D1&set-cookie=b%3D2`));
  assert.equal(r.status, 400);
});

await t('bad type → clean 400', async () => {
  const r = await cookie.fetch(req(`/api?type=cookiejar&set-cookie=a%3D1`));
  assert.equal(r.status, 400);
});

await t('POST works + control chars rejected', async () => {
  const r = await cookie.fetch(req('/api', { method: 'POST', body: JSON.stringify({ 'set-cookie': 'a=1; Secure' }) }));
  assert.equal((await r.json()).cookie.flags.secure, true);
  const r2 = await cookie.fetch(req('/api', { method: 'POST', body: JSON.stringify({ cookie: 'a=1\x01' }) }));
  assert.equal(r2.status, 400);
});

await t('oversize input → clean 400', async () => {
  const r = await cookie.fetch(req(`/api?cookie=${'a%3D1; '.repeat(1700)}`));
  assert.equal(r.status, 400);
});

await t('landing + sitemap + llms + OPTIONS + 404', async () => {
  assert.ok((await (await cookie.fetch(req('/'))).text()).includes('Cookie Analyzer'));
  assert.ok((await (await cookie.fetch(req('/sitemap.xml'))).text()).includes('<urlset'));
  assert.ok((await (await cookie.fetch(req('/llms.txt'))).text()).includes('Cookie Analyzer'));
  const o = await cookie.fetch(req('/api', { method: 'OPTIONS' }));
  assert.equal(o.status, 204);
  assert.equal((await cookie.fetch(req('/nope'))).status, 404);
});

// ---------- llm-json-validator ----------
await t('llm: clean JSON passes unrepaired', async () => {
  const r = await llmjson.fetch(req(`/api?json=${encodeURIComponent('{"a":1}')}`));
  const j = await r.json();
  assert.equal(j.valid, true);
  assert.equal(j.repaired, false);
  assert.deepEqual(j.parsed, { a: 1 });
});

await t('llm: fence + prose + trailing comma + quotes + None fixed', async () => {
  const raw = "Here is the JSON you asked for:\n```json\n{ 'name': 'test', 'count': None, 'active': True, }\n```";
  const r = await llmjson.fetch(req(`/api?json=${encodeURIComponent(raw)}`));
  const j = await r.json();
  assert.equal(j.valid, true);
  assert.equal(j.repaired, true);
  assert.deepEqual(j.parsed, { name: 'test', count: null, active: true });
  const fixes = j.repairs.map((x) => x.fix);
  assert.ok(fixes.includes('stripped_markdown_fence'));
  assert.ok(fixes.includes('removed_trailing_commas'));
  assert.ok(fixes.includes('fixed_python_constants'));
  assert.ok(fixes.includes('converted_quotes_and_quoted_keys'));
});

await t('llm: unfenced prose stripped', async () => {
  const raw = "Sure, here it is: {\"k\": 1} hope that helps!";
  const j = await (await llmjson.fetch(req(`/api?json=${encodeURIComponent(raw)}`))).json();
  assert.equal(j.valid, true);
  assert.deepEqual(j.parsed, { k: 1 });
  assert.ok(j.repairs.some((x) => x.fix === 'stripped_leading_prose'));
  assert.ok(j.repairs.some((x) => x.fix === 'stripped_trailing_prose'));
});

await t('llm: unquoted keys quoted', async () => {
  const j = await (await llmjson.fetch(req(`/api?json=${encodeURIComponent('{ name: "x", nested: { deep: 1 } }')}`))).json();
  assert.equal(j.valid, true);
  assert.deepEqual(j.parsed, { name: 'x', nested: { deep: 1 } });
});

await t('llm: single-quoted values w/ embedded double quote', async () => {
  const j = await (await llmjson.fetch(req(`/api?json=${encodeURIComponent("{ msg: 'she said \"hi\"' }")}`))).json();
  assert.equal(j.valid, true);
  assert.equal(j.parsed.msg, 'she said "hi"');
});

await t('llm: apostrophe inside double-quoted string NOT converted', async () => {
  const j = await (await llmjson.fetch(req(`/api?json=${encodeURIComponent('{"s": "it\'s fine"}')}`))).json();
  assert.equal(j.valid, true);
  assert.equal(j.parsed.s, "it's fine");
});

await t('llm: validate mode refuses repair, reports position', async () => {
  const j = await (await llmjson.fetch(req(`/api?mode=validate&json=${encodeURIComponent("Sure! { 'a': 1, }")}`))).json();
  assert.equal(j.valid, false);
  assert.ok(j.error.position >= 0);
  assert.ok(j.error.line >= 1);
  assert.ok(j.error.context.length > 0);
  assert.ok(j.repairs.some((x) => x.fix.startsWith('stripped')));
});

await t('llm: unrecoverable input → valid:false with error', async () => {
  const j = await (await llmjson.fetch(req(`/api?json=${encodeURIComponent('{"a": definitely not json')}`))).json();
  assert.equal(j.valid, false);
  assert.ok(j.error.message.length > 0);
});

await t('llm: array root works', async () => {
  const j = await (await llmjson.fetch(req(`/api?json=${encodeURIComponent("The list:\n[1, 2, 3,]")}`))).json();
  assert.equal(j.type, 'array');
  assert.deepEqual(j.parsed, [1, 2, 3]);
});

await t('llm: missing/oversized/bad-mode → clean 400s', async () => {
  assert.equal((await llmjson.fetch(req('/api'))).status, 400);
  assert.equal((await llmjson.fetch(req(`/api?mode=fix&json=1`))).status, 400);
  const big = 'x'.repeat(300 * 1024);
  assert.equal((await llmjson.fetch(req(`/api?json=${encodeURIComponent(big)}`))).status, 400);
});

await t('llm: POST raw + JSON body', async () => {
  const r1 = await llmjson.fetch(req('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ json: '{a: [1,2,]}' }) }));
  assert.equal((await r1.json()).parsed.a.length, 2);
  const r2 = await llmjson.fetch(req('/api', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"b": 2}' }));
  assert.deepEqual((await r2.json()).parsed, { b: 2 });
});

await t('llm: landing + sitemap + llms + OPTIONS', async () => {
  assert.ok((await (await llmjson.fetch(req('/'))).text()).includes('LLM JSON Validator'));
  assert.ok((await (await llmjson.fetch(req('/llms.txt'))).text()).includes('LLM JSON'));
  assert.equal((await llmjson.fetch(req('/api', { method: 'OPTIONS' }))).status, 204);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
