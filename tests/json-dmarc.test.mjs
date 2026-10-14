// Local tests for json-lint + dmarc-parser workers (pure functions via fetch handler)
import jsonLint from '../json-lint/src/index.js';
import dmarc from '../dmarc-parser/src/index.js';

let pass = 0, fail = 0;
async function call(worker, path, init) {
  const res = await worker.fetch(new Request('http://x' + path, init));
  const raw = await res.text();
  let body = raw;
  try { body = JSON.parse(raw); } catch {}
  return { status: res.status, body, raw };
}
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); }
}

// ================= JSON LINT =================
// 1. valid object
let r = await call(jsonLint, '/api?json=' + encodeURIComponent('{"a":1,"b":[true,null,"x"]}'));
ok('lint: valid object', r.status === 200 && r.body.valid === true && r.body.errors.length === 0, r.body);
ok('lint: stats', r.body.stats && r.body.stats.keys === 2 && r.body.stats.arrays === 1 && r.body.stats.max_depth === 2, r.body.stats);

// 2. trailing comma — exact line/col
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{\n  "a": 1,\n}'));
ok('lint: trailing comma caught', r.body.valid === false && /Trailing comma/.test(r.body.errors[0].message), r.body);
ok('lint: trailing comma position', r.body.errors[0].line === 2 && r.body.errors[0].column === 9, r.body.errors[0]);

// 3. trailing comma inside array
r = await call(jsonLint, '/api?json=' + encodeURIComponent('[1, 2, 3, ]'));
ok('lint: array trailing comma', r.body.valid === false && /Trailing comma/.test(r.body.errors[0].message), r.body);

// 4. commas inside strings are NOT trailing commas
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{"a": "hello, world", "b": "x"}'));
ok('lint: comma-in-string ok', r.body.valid === true, r.body);

// 5. line comment detection
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{\n  // comment\n  "a": 1\n}'));
ok('lint: // comment caught', r.body.valid === false && /Comments are not allowed/.test(r.body.errors[0].message) && r.body.errors[0].line === 2, r.body);

// 6. block comment detection
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{"a": 1 /* hi */}'));
ok('lint: /* */ comment caught', r.body.valid === false && /block comment/.test(r.body.errors[0].message), r.body);

// 7. comment-like text inside strings is fine
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{"url": "https://x.com//path"}'));
ok('lint: // inside string ok', r.body.valid === true, r.body);

// 8. duplicate keys flagged with path + lines
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{"id": 1, "name": "a", "name": "b"}'));
ok('lint: dup key warning', r.body.valid === true && r.body.warnings.length === 1 && r.body.warnings[0].path === '$.name' && r.body.warnings[0].lines.length === 2, r.body);

// 9. same key in different objects (array of objects) is NOT a duplicate
r = await call(jsonLint, '/api?json=' + encodeURIComponent('[{"a":1},{"a":2}]'));
ok('lint: same key across sibling objects ok', r.body.valid === true && r.body.warnings.length === 0, r.body);

// 10. nested duplicate key path
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{"u":{"n":1},"v":{"n":2,"n":3}}'));
ok('lint: nested dup path', r.body.valid === true && r.body.warnings.length === 1 && r.body.warnings[0].path === '$.v.n', r.body);

// 11. single-quote error
r = await call(jsonLint, "/api?json=" + encodeURIComponent("{-'a'-: 1}".replace(/-/g, '')));
ok('lint: single quotes rejected', r.body.valid === false && /Single quotes/.test(r.body.errors[0].message), r.body);

// 12. BOM stripped + noted, still valid (BOM survives URL-decoding on GET; fetch strips it from POST text bodies)
r = await call(jsonLint, '/api?json=%EF%BB%BF' + encodeURIComponent('{"a":1}'));
ok('lint: BOM stripped', r.body.valid === true && r.body.bom === true, r.body);

// 13. POST raw text body
r = await call(jsonLint, '/api', { method: 'POST', body: '{"ok": true}' });
ok('lint: POST raw body', r.body.valid === true, r.body);

// 14. POST JSON envelope
r = await call(jsonLint, '/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ json: '{"z": [1,2]}' }) });
ok('lint: POST envelope', r.body.valid === true && r.body.stats.arrays === 1, r.body);

// 15. missing param → 400
r = await call(jsonLint, '/api');
ok('lint: /api index served', r.status === 200 && r.body.tool === 'JSON Lint', r.body);
r = await call(jsonLint, '/api?json=');
ok('lint: empty json 400', r.status === 400 && /Missing required/.test(r.body.error), r.body);

// 16. scanner-fallback: missing colon reaches V8 position path
r = await call(jsonLint, '/api?json=' + encodeURIComponent('{"a" 1}'));
ok('lint: fallback parse error has line/col', r.body.valid === false && r.body.errors[0].line === 1, r.body);

// 17. surfaces
const landing = await call(jsonLint, '/');
ok('lint: landing 200 html+ld+json', landing.status === 200 && /ld\+json/.test(landing.raw) && /json-lint-formatho/.test(landing.raw));
const sm = await call(jsonLint, '/sitemap.xml');
ok('lint: sitemap', sm.status === 200 && sm.raw.includes('json-lint-formatho'));
const llms = await call(jsonLint, '/llms.txt');
ok('lint: llms.txt', llms.status === 200 && llms.raw.includes('json-lint'));
const pre = await jsonLint.fetch(new Request('http://x/api', { method: 'OPTIONS' }));
ok('lint: OPTIONS 204', pre.status === 204 && pre.headers.get('Access-Control-Allow-Methods') === 'GET, POST, OPTIONS');

// ================= DMARC PARSER =================
// 18. valid full record
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@ex.com,mailto:r@ex.net!10m; adkim=s; aspf=r; fo=1; ri=86400'));
ok('dmarc: valid full record', r.status === 200 && r.body.valid === true && r.body.errors.length === 0, r.body);
ok('dmarc: parsed fields', r.body.parsed.policy === 'reject' && r.body.parsed.pct === 100 && r.body.parsed.dkim_alignment === 's' && r.body.parsed.failure_options.join() === '1', r.body.parsed);
ok('dmarc: rua uris extracted', r.body.parsed.aggregate_report_uris[0] === 'mailto:dmarc@ex.com' && r.body.parsed.aggregate_report_uris.length === 2, r.body.parsed);
ok('dmarc: size-hint warning', r.body.warnings.some((w) => /Size hint/.test(w.message)), r.body.warnings);

// 19. gmail.com live vector (structure, not network, in local test): use record form
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=none; sp=quarantine; rua=mailto:dmarc@google.com'));
ok('dmarc: sp parsed', r.body.valid === true && r.body.parsed.subdomain_policy === 'quarantine', r.body);

// 20. missing p → invalid
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; rua=mailto:a@b.com'));
ok('dmarc: missing p error', r.body.valid === false && r.body.errors.some((e) => e.tag === 'p'), r.body);

// 21. pct out of range
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=none; pct=150'));
ok('dmarc: pct 150 rejected', r.body.valid === false && r.body.errors.some((e) => /between 0 and 100/.test(e.message)), r.body);

// 22. 3 rua URIs rejected
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=none; rua=mailto:a@b.com,mailto:c@d.com,mailto:e@f.com'));
ok('dmarc: >2 uris rejected', r.body.valid === false && r.body.errors.some((e) => /caps a URI list at 2/.test(e.message)), r.body);

// 23. adkim invalid
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=reject; adkim=x'));
ok('dmarc: bad adkim', r.body.valid === false && r.body.errors.some((e) => /r \(relaxed\) or s \(strict\)/.test(e.message)), r.body);

// 24. fo=0:1 rejected
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=quarantine; ruf=mailto:f@b.com; fo=0:1'));
ok('dmarc: fo=0:1 rejected', r.body.valid === false && r.body.errors.some((e) => e.tag === 'fo'), r.body);

// 25. duplicate tag
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=none; p=reject'));
ok('dmarc: duplicate tag', r.body.valid === false && r.body.errors.some((e) => /Duplicate tag "p"/.test(e.message)), r.body);

// 26. v not first
r = await call(dmarc, '/api?record=' + encodeURIComponent('p=none; v=DMARC1'));
ok('dmarc: v must be first', r.body.valid === false && r.body.errors.some((e) => /First tag must be v=DMARC1/.test(e.message)), r.body);

// 27. zone-file quotes stripped
r = await call(dmarc, '/api?record=' + encodeURIComponent('"v=DMARC1; p=none"'));
ok('dmarc: zone quotes stripped', r.body.valid === true, r.body);

// 28. unknown tag → warning only
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=none; xyz=1'));
ok('dmarc: unknown tag warning', r.body.valid === false === false && r.body.warnings.some((w) => w.tag === 'xyz'), r.body);

// 29. bad domain → 400
r = await call(dmarc, '/api?domain=' + encodeURIComponent('https://formatho.com'));
ok('dmarc: URL rejected as domain', r.status === 400 && /Invalid domain/.test(r.body.error), r.body);

// 30. both params → 400; none → 400
r = await call(dmarc, '/api?record=v=DMARC1&domain=x.com');
ok('dmarc: both params 400', r.status === 400, r.body);
r = await call(dmarc, '/api');
ok('dmarc: /api index served', r.status === 200 && r.body.tool === 'DMARC Record Parser', r.body);

// 31. POST JSON envelope + raw text
r = await call(dmarc, '/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record: 'v=DMARC1; p=reject' }) });
ok('dmarc: POST envelope', r.body.valid === true && r.body.parsed.policy === 'reject', r.body);
r = await call(dmarc, '/api', { method: 'POST', body: 'v=DMARC1; p=none' });
ok('dmarc: POST raw text', r.body.valid === true, r.body);

// 32. oversize record → 400
r = await call(dmarc, '/api?record=' + encodeURIComponent('v=DMARC1; p=none; ' + 'x'.repeat(9000)));
ok('dmarc: oversize 400', r.status === 400 && /too large/.test(r.body.error), r.body);

// 33. surfaces
const dLanding = await call(dmarc, '/');
ok('dmarc: landing 200 html+ld+json', dLanding.status === 200 && /ld\+json/.test(dLanding.raw) && /dmarc-parser-formatho/.test(dLanding.raw));
const dSm = await call(dmarc, '/sitemap.xml');
ok('dmarc: sitemap', dSm.status === 200 && dSm.raw.includes('dmarc-parser-formatho'));
const dLlms = await call(dmarc, '/llms.txt');
ok('dmarc: llms.txt', dLlms.status === 200 && dLlms.raw.includes('dmarc-parser'));
const dPre = await dmarc.fetch(new Request('http://x/api', { method: 'OPTIONS' }));
ok('dmarc: OPTIONS 204', dPre.status === 204);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
