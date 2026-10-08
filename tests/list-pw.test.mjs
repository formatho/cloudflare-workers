import assert from 'node:assert';

const mod1 = await import('../list-converter/src/index.js');
const lc = mod1.default;

// 1. newline -> comma (auto-detect)
let r = await lc.fetch(new Request('https://x/api?text=' + encodeURIComponent('apple\nbanana\ncherry')));
let j = await r.json();
assert.equal(j.output.text, 'apple,banana,cherry', 'basic newline->comma');
assert.equal(j.input.delimiter_used, 'auto → newline');
assert.equal(j.output.count, 3);

// 2. comma -> json, dedupe + sort
r = await lc.fetch(new Request('https://x/api?text=' + encodeURIComponent('b, a, a') + '&to=json&dedupe=true&sort=asc'));
j = await r.json();
assert.deepEqual(JSON.parse(j.output.text), ['a', 'b'], 'dedupe+sort json');

// 3. dedupe case-insensitive
r = await lc.fetch(new Request('https://x/api?text=' + encodeURIComponent('Apple\napple\nBANANA') + '&dedupe=ci'));
j = await r.json();
assert.equal(j.output.count, 2, 'ci dedupe');
assert.equal(j.changes.duplicates_removed, 1);

// 4. quote + spacing
r = await lc.fetch(new Request('https://x/api?text=' + encodeURIComponent('a\nb') + '&quote=double&spacing=true'));
j = await r.json();
assert.equal(j.output.text, '"a", "b"', 'quote+spacing');

// 5. html output escapes
r = await lc.fetch(new Request('https://x/api?to=html&text=' + encodeURIComponent('<x>&"y"')));
j = await r.json();
assert.ok(j.output.text.includes('&lt;x&gt;&amp;&quot;y&quot;'), 'html escape');

// 6. pipe detect + pipe out
r = await lc.fetch(new Request('https://x/api?text=' + encodeURIComponent('a|b|c') + '&to=pipe'));
j = await r.json();
assert.equal(j.output.text, 'a|b|c');
assert.equal(j.input.delimiter_used, 'auto → pipe');

// 7. empty text 400
r = await lc.fetch(new Request('https://x/api?text='));
assert.equal(r.status, 400);
// 8. bad to 400
r = await lc.fetch(new Request('https://x/api?text=a&to=bogus'));
assert.equal(r.status, 400);
j = await r.json();
assert.ok(/comma/.test(j.error));
// 9. bad from 400
r = await lc.fetch(new Request('https://x/api?text=a&from=bogus'));
assert.equal(r.status, 400);
// 10. bad quote 400
r = await lc.fetch(new Request('https://x/api?text=a&quote=bogus'));
assert.equal(r.status, 400);
// 11. POST body
r = await lc.fetch(new Request('https://x/api', { method: 'POST', body: JSON.stringify({ text: 'x\ny', to: 'newline' }) }));
j = await r.json();
assert.equal(j.output.text, 'x\ny', 'POST newline out');
// 12. POST bad json 400
r = await lc.fetch(new Request('https://x/api', { method: 'POST', body: 'not json' }));
assert.equal(r.status, 400);
// 13. OPTIONS preflight
r = await lc.fetch(new Request('https://x/api', { method: 'OPTIONS', headers: { 'Access-Control-Request-Headers': 'Content-Type' } }));
assert.equal(r.status, 204);
assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
// 14. surfaces
for (const p of ['/', '/sitemap.xml', '/llms.txt']) {
  r = await lc.fetch(new Request('https://x' + p));
  assert.equal(r.status, 200, 'surface ' + p);
}
assert.ok((await (await lc.fetch(new Request('https://x/'))).text()).includes('List Converter Online'));
assert.equal((await (await lc.fetch(new Request('https://x/404'))).text()), 'Not found');
// 15. api help
j = await (await lc.fetch(new Request('https://x/api'))).json();
assert.ok(j.params);

const mod2 = await import('../password-strength/src/index.js');
const ps = mod2.default;

// 1. common password -> capped
r = await ps.fetch(new Request('https://x/api?password=password123'));
j = await r.json();
assert.equal(j.strength, 'Very Weak');
assert.ok(j.patterns_detected.some(p => p.startsWith('common')), 'common detected');
assert.ok(j.effective_bits <= 12);

// 2. leet common
r = await ps.fetch(new Request('https://x/api?password=P@ssw0rd1990!'));
j = await r.json();
assert.ok(j.patterns_detected.some(p => p.includes('leet') || p.includes('common')), 'leet common');

// 3. strong random
r = await ps.fetch(new Request('https://x/api?password=' + encodeURIComponent('7wQ!zR#9kL@2mN$5')));
j = await r.json();
assert.ok(j.score >= 5, 'strong score ' + j.score);
assert.equal(j.checks_passed, 6);
assert.ok(j.crack_times.offline_fast_hash.seconds > 3e7, 'fast hash takes a while');

// 4. sequences
r = await ps.fetch(new Request('https://x/api?password=Abcdef123456!!'));
j = await r.json();
assert.ok(j.patterns_detected.some(p => p.includes('sequence')), 'alpha seq');
// keyboard run
r = await ps.fetch(new Request('https://x/api?password=Xqwerty!9Z'));
j = await r.json();
assert.ok(j.patterns_detected.some(p => p.includes('keyboard')), 'keyboard run');

// 5. repeated block + repeated char
r = await ps.fetch(new Request('https://x/api?password=abcabcabc!'));
j = await r.json();
assert.ok(j.patterns_detected.some(p => p.startsWith('repeated block')), 'repeated block');
r = await ps.fetch(new Request('https://x/api?password=St0rm!!aaaZ'));
j = await r.json();
assert.ok(j.patterns_detected.some(p => p.startsWith('repeated character')), 'repeated char');

// 6. birth year
r = await ps.fetch(new Request('https://x/api?password=1990'));
j = await r.json();
assert.ok(j.patterns_detected.some(p => p.includes('year')), 'year');
assert.equal(j.strength, 'Very Weak');

// 7. entropy sanity: 12 random mixed = ~75-80 bits
r = await ps.fetch(new Request('https://x/api?password=aB3$eF7!hJ9k'));
j = await r.json();
assert.ok(j.entropy_bits > 70 && j.entropy_bits < 90, 'entropy ' + j.entropy_bits);

// 8. errors
r = await ps.fetch(new Request('https://x/api?password='));
assert.equal(r.status, 400);
r = await ps.fetch(new Request('https://x/api?password=' + 'x'.repeat(513)));
assert.equal(r.status, 400);
r = await ps.fetch(new Request('https://x/api', { method: 'POST', body: 'nope' }));
assert.equal(r.status, 400);
r = await ps.fetch(new Request('https://x/api', { method: 'POST', body: JSON.stringify({ password: 'MyS3cur3P@ss!' }) }));
j = await r.json();
assert.ok(j.score >= 4);

// 9. OPTIONS + surfaces
r = await ps.fetch(new Request('https://x/api', { method: 'OPTIONS' }));
assert.equal(r.status, 204);
for (const p of ['/', '/sitemap.xml', '/llms.txt']) {
  r = await ps.fetch(new Request('https://x' + p));
  assert.equal(r.status, 200, 'surface ' + p);
}
assert.ok((await (await ps.fetch(new Request('https://x/'))).text()).includes('Password Strength Checker'));
r = await ps.fetch(new Request('https://x/404'));
assert.equal(r.status, 404);
j = await (await ps.fetch(new Request('https://x/api'))).json();
assert.ok(j.params);

console.log('ALL LOCAL TESTS PASS');
