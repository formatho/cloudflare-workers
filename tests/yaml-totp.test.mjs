// Local smoke tests for json-yaml + totp-generator (pure functions via fetch handler)
import yamlWorker from '../json-yaml/src/index.js';
import totpWorker from '../totp-generator/src/index.js';

let pass = 0, fail = 0;
async function call(worker, path, init) {
  const res = await worker.fetch(new Request('http://x' + path, init));
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { status: res.status, body };
}
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); }
}
const enc = encodeURIComponent;

// ---------- json-yaml: JSON → YAML ----------
const obj = { name: 'formatho', private: true, tags: ['dev', 'tools'], nested: { a: 1, b: [{ x: 1 }, { x: 2 }] } };
let r = await call(yamlWorker, '/api?json=' + enc(JSON.stringify(obj)));
ok('j2y basic', r.status === 200 && r.body.direction === 'json→yaml' && r.body.yaml.includes('name: formatho') && r.body.yaml.includes('private: true'), r.body);

// round-trip: json → yaml → json must equal original
r = await call(yamlWorker, '/api?yaml=' + enc(r.body.yaml));
ok('j2y round-trip', r.status === 200 && JSON.stringify(r.body.json) === JSON.stringify(obj), r.body);

// special strings stay quoted and typed correctly on round-trip
const tricky = { s: 'hello: world', t: '123', u: '', v: 'a\nb', w: '- dashed', n: null, f: 1.5, hex: '0x1f' };
r = await call(yamlWorker, '/api?json=' + enc(JSON.stringify(tricky)));
const rt = await call(yamlWorker, '/api?yaml=' + enc(r.body.yaml));
ok('j2y tricky round-trip', r.status === 200 && rt.status === 200 && JSON.stringify(rt.body.json) === JSON.stringify(tricky), { out: r.body.yaml, back: rt.body });

// empty containers
r = await call(yamlWorker, '/api?json=' + enc(JSON.stringify({ a: [], b: {} })));
ok('j2y empty containers', r.body.yaml === 'a: []\nb: {}\n', r.body);

// seq-in-seq round-trip
const nest = { matrix: [[1, 2], [3, 4]], deep: { list: [{ in: [{ z: 'end' }] }] } };
r = await call(yamlWorker, '/api?json=' + enc(JSON.stringify(nest)));
const rt2 = await call(yamlWorker, '/api?yaml=' + enc(r.body.yaml));
ok('j2y nested seq round-trip', rt2.status === 200 && JSON.stringify(rt2.body.json) === JSON.stringify(nest), { out: r.body.yaml, back: rt2.body });

// ---------- json-yaml: YAML → JSON ----------
r = await call(yamlWorker, '/api?yaml=' + enc('name: formatho\nprivate: true\n'));
ok('y2j basic', r.status === 200 && r.body.json && r.body.json.name === 'formatho' && r.body.json.private === true, r.body);

// scalar typing
r = await call(yamlWorker, '/api?yaml=' + enc('a: 1\nb: 1.5\nc: true\nd: null\ne: ~\nf: hello\ng: 0x1f\nh: 0o17\ni: 1e3\n'));
const j = r.body.json || {};
ok('y2j types', j.a === 1 && j.b === 1.5 && j.c === true && j.d === null && j.e === null && j.f === 'hello' && j.g === 31 && j.h === 15 && j.i === 1000, r.body);

// quoted strings stay strings
r = await call(yamlWorker, '/api?yaml=' + enc('a: "123"\nb: \'true\'\nc: "he said: hi"\nd: \'it\'\'s\'\n'));
const q = r.body.json || {};
ok('y2j quoted', q.a === '123' && q.b === 'true' && q.c === 'he said: hi' && q.d === "it's", r.body);

// comments
r = await call(yamlWorker, '/api?yaml=' + enc('# top\nkey: value # trailing\nurl: http://x/#anchor\n'));
ok('y2j comments', r.status === 200 && r.body.json.key === 'value' && r.body.json.url === 'http://x/#anchor', r.body);

// nested structure
const yamlDoc = [
  'server:',
  '  port: 8080',
  '  hosts:',
  '    - alpha',
  '    - beta',
  'metrics:',
  '  - name: cpu',
  '    labels:',
  '      env: prod',
  '  - name: mem',
].join('\n');
r = await call(yamlWorker, '/api?yaml=' + enc(yamlDoc));
const want = { server: { port: 8080, hosts: ['alpha', 'beta'] }, metrics: [{ name: 'cpu', labels: { env: 'prod' } }, { name: 'mem' }] };
ok('y2j nested', r.status === 200 && JSON.stringify(r.body.json) === JSON.stringify(want), r.body);

// flow collections
r = await call(yamlWorker, '/api?yaml=' + enc('list: [1, two, "three", [4, 5]]\nmap: {a: 1, b: two}\nempty: []\n'));
const fl = r.body.json || {};
ok('y2j flow', fl.list && fl.list.length === 4 && fl.list[3][1] === 5 && fl.map.b === 'two' && fl.empty.length === 0, r.body);

// block scalars
r = await call(yamlWorker, '/api?yaml=' + enc('script: |\n  echo hi\n  echo bye\nnext: 1\n'));
ok('y2j literal clip', r.body.json && r.body.json.script === 'echo hi\necho bye\n' && r.body.json.next === 1, r.body);
r = await call(yamlWorker, '/api?yaml=' + enc('s: |-\n  a\n  b\nt: 1\n'));
ok('y2j literal strip', r.body.json && r.body.json.s === 'a\nb', r.body);
r = await call(yamlWorker, '/api?yaml=' + enc('d: >\n  hello\n  world\n\n  second para\nx: 1\n'));
ok('y2j folded', r.body.json && r.body.json.d === 'hello world\nsecond para\n' && r.body.json.x === 1, r.body);

// plain multi-line scalar folding
r = await call(yamlWorker, '/api?yaml=' + enc('desc: this is\n  a long description\nother: 2\n'));
ok('y2j plain fold', r.body.json && r.body.json.desc === 'this is a long description' && r.body.json.other === 2, r.body);

// errors: tabs, anchors, multi-doc, bad indent, both/missing params
r = await call(yamlWorker, '/api?yaml=' + enc('a:\n\tb: 1\n'));
ok('y2j tabs 400', r.status === 400 && /Tabs/.test(r.body.error), r.body);
r = await call(yamlWorker, '/api?yaml=' + enc('a: &anchor 1\n'));
ok('y2j anchor 400', r.status === 400 && /Anchor/.test(r.body.error), r.body);
r = await call(yamlWorker, '/api?yaml=' + enc('a: 1\n---\nb: 2\n'));
ok('y2j multidoc 400', r.status === 400 && /documents/.test(r.body.error), r.body);
r = await call(yamlWorker, '/api?yaml=' + enc('a: 1\n  b: 2\n'));
ok('y2j bad indent 400', r.status === 400 && /[Ii]ndentation/.test(r.body.error), r.body);
r = await call(yamlWorker, '/api?json=1&yaml=2');
ok('y2j both params 400', r.status === 400, r.body);
r = await call(yamlWorker, '/api');
ok('y2j missing param 400', r.status === 400, r.body);
r = await call(yamlWorker, '/api?json=' + enc('{broken'));
ok('j2y invalid json 400', r.status === 400 && /Invalid JSON/.test(r.body.error), r.body);

// POST auto-detect
r = await call(yamlWorker, '/api', { method: 'POST', body: '{"posted": true}' });
ok('post autodetect json', r.status === 200 && r.body.direction === 'json→yaml' && r.body.yaml.includes('posted: true'), r.body);
r = await call(yamlWorker, '/api', { method: 'POST', body: 'posted: true\n' });
ok('post autodetect yaml', r.status === 200 && r.body.direction === 'yaml→json' && r.body.json.posted === true, r.body);
r = await call(yamlWorker, '/api?format=yaml', { method: 'POST', body: '{"a": 1}' });
ok('post format=yaml on json 400', r.status === 400 && /Invalid YAML/.test(r.body.error), r.body);
r = await call(yamlWorker, '/api', { method: 'POST', body: '   ' });
ok('post empty 400', r.status === 400, r.body);
r = await call(yamlWorker, '/api', { method: 'PUT' });
ok('method not allowed', r.status === 405, r.body);

// ---------- totp-generator ----------
// RFC 6238 seeds (Appendix B), base32-encoded here so no hand-typed secret can drift
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(str) {
  const bytes = [...Buffer.from(str, 'ascii')];
  let bits = 0, val = 0, out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
const RFC1 = b32encode('12345678901234567890');                                              // 20 bytes
const RFC256 = b32encode('12345678901234567890123456789012');                               // 32 bytes
const RFC512 = b32encode('1234567890123456789012345678901234567890123456789012345678901234'); // 64 bytes
const vectors = [
  [59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'],
  [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130'],
];
for (const [t, code] of vectors) {
  r = await call(totpWorker, `/api?secret=${RFC1}&algorithm=sha1&digits=8&time=${t}`);
  ok(`totp rfc6238 sha1 t=${t}`, r.status === 200 && r.body.code === code, r.body);
}
r = await call(totpWorker, `/api?secret=${RFC256}&algorithm=sha256&digits=8&time=59`);
ok('totp rfc6238 sha256 t=59', r.status === 200 && r.body.code === '46119246', r.body);
r = await call(totpWorker, `/api?secret=${RFC512}&algorithm=sha512&digits=8&time=59`);
ok('totp rfc6238 sha512 t=59', r.status === 200 && r.body.code === '90693936', r.body);

// defaults + window info
r = await call(totpWorker, `/api?secret=${RFC1}&time=59`);
ok('totp defaults', r.status === 200 && r.body.algorithm === 'sha1' && r.body.digits === 6 && r.body.period === 30 && r.body.expires_in === 1 && r.body.code === '287082', r.body);
ok('totp prev/next', r.body.prev_code === '755224' && r.body.next_code === '359152', r.body);

// hotp counter mode
r = await call(totpWorker, `/api?secret=${RFC1}&counter=0`);
ok('hotp counter=0', r.status === 200 && r.body.type === 'hotp' && r.body.code === '755224', r.body);
r = await call(totpWorker, `/api?secret=${RFC1}&counter=1`);
ok('hotp counter=1', r.status === 200 && r.body.code === '287082', r.body);

// otpauth URL
const otpurl = enc('otpauth://totp/Formatho:test%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Formatho&algorithm=SHA256&digits=8&period=60');
r = await call(totpWorker, `/api?url=${otpurl}&time=1200`);
const direct = await call(totpWorker, `/api?secret=JBSWY3DPEHPK3PXP&algorithm=sha256&digits=8&period=60&time=1200`);
ok('otpauth parse', r.status === 200 && r.body.issuer === 'Formatho' && r.body.label === 'Formatho:test@example.com' && r.body.algorithm === 'sha256' && r.body.period === 60 && r.body.code === direct.body.code, r.body);

// errors
r = await call(totpWorker, '/api');
ok('totp missing secret 400', r.status === 400 && /secret/.test(r.body.error), r.body);
r = await call(totpWorker, '/api?secret=ABC123!');
ok('totp bad base32 400', r.status === 400 && /base32/.test(r.body.error), r.body);
r = await call(totpWorker, '/api?secret=JBSWY3DPEHPK3PXP&algorithm=md5');
ok('totp bad algo 400', r.status === 400 && /algorithm/.test(r.body.error), r.body);
r = await call(totpWorker, '/api?secret=JBSWY3DPEHPK3PXP&digits=9');
ok('totp bad digits 400', r.status === 400 && /digits/.test(r.body.error), r.body);
r = await call(totpWorker, '/api?secret=JBSWY3DPEHPK3PXX&url=' + otpurl);
ok('totp secret conflict 400', r.status === 400 && /conflict/.test(r.body.error), r.body);

// secret never echoed
r = await call(totpWorker, '/api?secret=JBSWY3DPEHPK3PXP');
ok('totp secret not echoed', !JSON.stringify(r.body).includes('JBSWY3DPEHPK3PXP'), r.body);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
