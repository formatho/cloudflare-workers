// Local tests for rsa-key-pair-generator + prompt-template-renderer (run: node tests/rsa-prompt.test.mjs)
import assert from 'node:assert';
import { createPublicKey, createHash } from 'node:crypto';
import rsa from '../rsa-key-pair-generator/src/index.js';
import ptr from '../prompt-template-renderer/src/index.js';

const rsaApi = (q) => rsa.fetch(new Request('https://x/api?' + q)).then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json() }));
const ptrApi = (q) => ptr.fetch(new Request('https://x/api?' + q)).then(async (r) => ({ status: r.status, body: await r.json() }));
const ptrPost = (obj) => ptr.fetch(new Request('https://x/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) })).then(async (r) => ({ status: r.status, body: await r.json() }));

let passed = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); console.log('ok  ' + name); passed++; }
  catch (e) { console.log('FAIL ' + name + ' :: ' + e.message); failed++; }
}

// Independent ssh-rsa encoder from JWK (cross-check against the worker's DER walker)
function sshLineFromJwk(jwk) {
  const b64urlToBytes = (s) => new Uint8Array(Buffer.from(s, 'base64url'));
  const strip = (b) => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; return b.slice(i); };
  const n = strip(b64urlToBytes(jwk.n));
  const e = strip(b64urlToBytes(jwk.e));
  const mpint = (b) => (b[0] & 0x80 ? new Uint8Array([0, ...b]) : b);
  const u32 = (v) => new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
  const str = (b) => new Uint8Array([...u32(b.length), ...b]);
  const name = str(new TextEncoder().encode('ssh-rsa'));
  const blob = new Uint8Array([...name, ...str(mpint(e)), ...str(mpint(n))]);
  return 'ssh-rsa ' + Buffer.from(blob).toString('base64');
}

// ---- rsa-key-pair-generator ----
let kp2048 = null;
await t('rsa: default request generates 2048-bit pair with PEM blocks', async () => {
  const { status, body } = await rsaApi('');
  assert.equal(status, 200);
  assert.equal(body.bits, 2048);
  assert.equal(body.verified_modulus_bits, 2048);
  assert.match(body.private_key_pem, /^-----BEGIN PRIVATE KEY-----\n[A-Za-z0-9+/=\n]+-----END PRIVATE KEY-----\n?$/);
  assert.match(body.public_key_pem, /^-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=\n]+-----END PUBLIC KEY-----\n?$/);
  assert.match(body.public_key_openssh, /^ssh-rsa [A-Za-z0-9+/=]+$/);
  assert.match(body.public_key_fingerprint, /^SHA256:[A-Za-z0-9+/]{43}$/); // base64-no-padding of 32 bytes
  kp2048 = body;
});
await t('rsa: OpenSSH line matches independent JWK-based encoder (node crypto)', async () => {
  const pub = createPublicKey({ key: kp2048.public_key_pem, format: 'pem', type: 'spki' });
  const jwk = pub.export({ format: 'jwk' });
  assert.equal(kp2048.public_key_openssh, sshLineFromJwk(jwk));
});
await t('rsa: public PEM parses with node crypto and modulus length agrees', async () => {
  const pub = createPublicKey({ key: kp2048.public_key_pem, format: 'pem', type: 'spki' });
  const jwk = pub.export({ format: 'jwk' });
  const nBytes = Buffer.from(jwk.n, 'base64url');
  assert.equal(nBytes.length * 8, 2048);
});
await t('rsa: fingerprint = SHA256 of the ssh blob (OpenSSH style)', async () => {
  const blobB64 = kp2048.public_key_openssh.slice('ssh-rsa '.length);
  const digest = createHash('sha256').update(Buffer.from(blobB64, 'base64')).digest('base64').replace(/=+$/, '');
  assert.equal(kp2048.public_key_fingerprint, 'SHA256:' + digest);
});
await t('rsa: 4096-bit generation + verified bits', async () => {
  const { status, body } = await rsaApi('bits=4096');
  assert.equal(status, 200);
  assert.equal(body.bits, 4096);
  assert.equal(body.verified_modulus_bits, 4096);
});
await t('rsa: format=jwk returns key material both halves', async () => {
  const { status, body } = await rsaApi('bits=2048&format=jwk');
  assert.equal(status, 200);
  assert.equal(body.format, 'jwk');
  assert.ok(body.private_key_jwk.d && body.private_key_jwk.n && body.private_key_jwk.e);
  assert.ok(body.public_key_jwk.n && !body.public_key_jwk.d);
});
await t('rsa: rejects bad bits (1024, abc) and bad format', async () => {
  assert.equal((await rsaApi('bits=1024')).status, 400);
  assert.equal((await rsaApi('bits=abc')).status, 400);
  assert.equal((await rsaApi('format=der')).status, 400);
});
await t('rsa: /api responses are Cache-Control: no-store (never cache private keys)', async () => {
  const { headers } = await rsaApi('');
  assert.equal(headers.get('cache-control'), 'no-store');
});
await t('rsa: OPTIONS preflight 204 + landing/sitemap/llms/routes', async () => {
  const pre = await rsa.fetch(new Request('https://x/api', { method: 'OPTIONS', headers: { 'Access-Control-Request-Headers': 'Content-Type' } }));
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*');
  const landing = await rsa.fetch(new Request('https://x/'));
  const landingHtml = await landing.text();
  assert.equal(landing.status, 200);
  assert.match(landingHtml, /<title>RSA Key Pair Generator Online/);
  assert.match(landingHtml, /rsa-key-pair-generator/);
  assert.equal((await rsa.fetch(new Request('https://x/sitemap.xml'))).status, 200);
  const llms = await rsa.fetch(new Request('https://x/llms.txt'));
  assert.equal(llms.status, 200);
  assert.match(await llms.text(), /prompt|RSA/i);
  assert.equal((await rsa.fetch(new Request('https://x/nope'))).status, 404);
});

// ---- prompt-template-renderer ----
await t('ptr: basic substitution', async () => {
  const { status, body } = await ptrApi('template=' + encodeURIComponent('Hello {{name}}, welcome to {{product}}!') + '&vars=' + encodeURIComponent('{"name":"Ada","product":"Formatho"}'));
  assert.equal(status, 200);
  assert.equal(body.rendered, 'Hello Ada, welcome to Formatho!');
  assert.deepEqual(body.variables_used, ['name', 'product']);
  assert.deepEqual(body.variables_missing, []);
  assert.deepEqual(body.variables_unused, []);
});
await t('ptr: inner spaces {{ name }} and repeated vars', async () => {
  const { body } = await ptrApi('template=' + encodeURIComponent('{{ greeting }} {{who}}, {{who}}') + '&vars=' + encodeURIComponent('{"greeting":"Hi","who":"you"}'));
  assert.equal(body.rendered, 'Hi you, you');
  assert.equal(body.stats.substitutions, 3);
  assert.deepEqual(body.variables_used, ['greeting', 'who']);
});
await t('ptr: nested dot-path variables', async () => {
  const { body } = await ptrApi('template=' + encodeURIComponent('{{user.name}} ({{user.role}}) filed {{ticket.count}} issues') + '&vars=' + encodeURIComponent('{"user":{"name":"Grace","role":"admin"},"ticket":{"count":7}}'));
  assert.equal(body.rendered, 'Grace (admin) filed 7 issues');
});
await t('ptr: non-string values render sensibly (number, bool, null, object)', async () => {
  const tpl = encodeURIComponent('{{n}}|{{b}}|{{x}}|{{o}}');
  const { body } = await ptrApi('template=' + tpl + '&vars=' + encodeURIComponent('{"n":42,"b":true,"x":null,"o":{"a":1}}'));
  assert.equal(body.rendered, '42|true|null|{"a":1}');
});
await t('ptr: missing=keep (default) leaves placeholders + lists them', async () => {
  const { body } = await ptrApi('template=' + encodeURIComponent('Hi {{name}}, {{known}}') + '&vars=' + encodeURIComponent('{"known":"yes"}'));
  assert.equal(body.rendered, 'Hi {{name}}, yes');
  assert.deepEqual(body.variables_missing, ['name']);
  assert.deepEqual(body.variables_unused, []);
});
await t('ptr: missing=empty blanks placeholders', async () => {
  const { body } = await ptrApi('template=' + encodeURIComponent('Hi {{name}}!') + '&missing=empty');
  assert.equal(body.rendered, 'Hi !');
});
await t('ptr: missing=error → 400 naming every gap', async () => {
  const { status, body } = await ptrApi('template=' + encodeURIComponent('{{a}} {{b}} {{a}}') + '&missing=error');
  assert.equal(status, 400);
  assert.match(body.error, /undefined variables: a, b/);
});
await t('ptr: unused top-level vars reported (incl. nested parents used)', async () => {
  const { body } = await ptrApi('template=' + encodeURIComponent('{{user.name}}') + '&vars=' + encodeURIComponent('{"user":{"name":"x","role":"y"},"extra":1}'));
  assert.deepEqual(body.variables_unused, ['extra']);
});
await t('ptr: 400 on invalid vars JSON, non-object vars, bad missing policy', async () => {
  assert.equal((await ptrApi('template=x&vars=' + encodeURIComponent('{nope}'))).status, 400);
  assert.equal((await ptrApi('template=x&vars=' + encodeURIComponent('["a"]'))).status, 400);
  assert.equal((await ptrApi('template=x&missing=drop')).status, 400);
});
await t('ptr: 400 on missing template + oversize template', async () => {
  assert.equal((await ptrApi('vars={}')).status, 400);
  assert.equal((await ptrApi('template=' + 'x'.repeat(65537))).status, 400);
});
await t('ptr: POST JSON body + unicode values', async () => {
  const { status, body } = await ptrPost({ template: 'Sum: {{expr}} 🚀 {{who}}', vars: { expr: '∑ ≥ 1', who: '世界' } });
  assert.equal(status, 200);
  assert.equal(body.rendered, 'Sum: ∑ ≥ 1 🚀 世界');
});
await t('ptr: routes — OPTIONS 204, landing title, sitemap/llms 200, 404', async () => {
  const pre = await ptr.fetch(new Request('https://x/api', { method: 'OPTIONS' }));
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Max-Age'), '86400');
  const landing = await ptr.fetch(new Request('https://x/'));
  const html = await landing.text();
  assert.equal(landing.status, 200);
  assert.match(html, /<title>Prompt Template Renderer Online/);
  assert.equal((await ptr.fetch(new Request('https://x/sitemap.xml'))).status, 200);
  assert.equal((await ptr.fetch(new Request('https://x/llms.txt'))).status, 200);
  assert.equal((await ptr.fetch(new Request('https://x/zzz'))).status, 404);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
