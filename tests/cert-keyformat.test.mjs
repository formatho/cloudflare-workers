// Local tests for certificate-fingerprint + key-format-converter workers
// Vectors generated with openssl (1024-bit RSA test key + self-signed cert + EC key)
import cert from '../certificate-fingerprint/src/index.js';
import keyfmt from '../key-format-converter/src/index.js';

const PKCS1_PRIV = `-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQCm/SzJpntenetcBnjK7kxVH/f96ycXTbXCNtK2+wfGuBHfwUYE
ZRS8IR/iwWPMW0UkncNuhcQu6n2Yn8M8BNNSYkRr1GiRoFHPzaso4E/XQusbFLTE
q0lhVXt/KS7Q7g1SRqlQ7FbyKYieTeCAlWVnBjNgBe9pglPNLdMNy4yZOwIDAQAB
AoGAYNecvMk+7M1arEDYlp+CRy/GC0zvm7Umfp56r0F/7f/b5c7Zgzz3vG7dZgzP
irk3rReNOjB7aNX2xqeIeus1fba5HWMaHsC/8h+B7BZ8Eof+hyeI4Jl9OAG9l74P
+LqiLve8nPLNaRLCPEDWzVfbJMJBHs3znAvAXDTjmhpXEHECQQDUDLS93jJzZ4OX
7bQwO18y2KK+8VYq3aUuMC01RnHbWoS1+GSOYmtzjpWnTCbvUj0PWrUusquWIVoH
00QQo0cjAkEAyZmQAbJ4RDV+q4S7NqtvFXJe3EzS03HxHaURmmguSixnStiCs+0M
79Avd6wh4xG2LTQW2jYsuIn8Z6OOtpKTCQJBAJw7mFdkBMvecqhXrLD0rZlq383L
Rm9iyrcTK9vawTyanrjsADqf7QdBAKY4h19Aulg7vs5fOejtPcYSNE4F3v0CQATY
SuyvhFJnUrb+hp1Gu3GxgPQcaIiqWVgUCntCe7JOpODYmTOHw+LThwCCQ4I4f79Q
XCg8WxDISCeZd6mNljkCQQCv0viQD1/XQNy6IS+nwjARCuluWWBdZBAElAtOsFwl
jF3jhbALKEy0dtEvJZ17L70iYyDhpPs7wS5eM6UfJPE1
-----END RSA PRIVATE KEY-----`;

const PKCS8_PRIV = `-----BEGIN PRIVATE KEY-----
MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBAKb9LMmme16d61wG
eMruTFUf9/3rJxdNtcI20rb7B8a4Ed/BRgRlFLwhH+LBY8xbRSSdw26FxC7qfZif
wzwE01JiRGvUaJGgUc/NqyjgT9dC6xsUtMSrSWFVe38pLtDuDVJGqVDsVvIpiJ5N
4ICVZWcGM2AF72mCU80t0w3LjJk7AgMBAAECgYBg15y8yT7szVqsQNiWn4JHL8YL
TO+btSZ+nnqvQX/t/9vlztmDPPe8bt1mDM+KuTetF406MHto1fbGp4h66zV9trkd
YxoewL/yH4HsFnwSh/6HJ4jgmX04Ab2Xvg/4uqIu97yc8s1pEsI8QNbNV9skwkEe
zfOcC8BcNOOaGlcQcQJBANQMtL3eMnNng5fttDA7XzLYor7xVirdpS4wLTVGcdta
hLX4ZI5ia3OOladMJu9SPQ9atS6yq5YhWgfTRBCjRyMCQQDJmZABsnhENX6rhLs2
q28Vcl7cTNLTcfEdpRGaaC5KLGdK2IKz7Qzv0C93rCHjEbYtNBbaNiy4ifxno462
kpMJAkEAnDuYV2QEy95yqFessPStmWrfzctGb2LKtxMr29rBPJqeuOwAOp/tB0EA
pjiHX0C6WDu+zl856O09xhI0TgXe/QJABNhK7K+EUmdStv6GnUa7cbGA9BxoiKpZ
WBQKe0J7sk6k4NiZM4fD4tOHAIJDgjh/v1BcKDxbEMhIJ5l3qY2WOQJBAK/S+JAP
X9dA3LohL6fCMBEK6W5ZYF1kEASUC06wXCWMXeOFsAsoTLR20S8lnXsvvSJjIOGk
+zvBLl4zpR8k8TU=
-----END PRIVATE KEY-----`;

const SPKI_PUB = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCm/SzJpntenetcBnjK7kxVH/f9
6ycXTbXCNtK2+wfGuBHfwUYEZRS8IR/iwWPMW0UkncNuhcQu6n2Yn8M8BNNSYkRr
1GiRoFHPzaso4E/XQusbFLTEq0lhVXt/KS7Q7g1SRqlQ7FbyKYieTeCAlWVnBjNg
Be9pglPNLdMNy4yZOwIDAQAB
-----END PUBLIC KEY-----`;

const PKCS1_PUB = `-----BEGIN RSA PUBLIC KEY-----
MIGJAoGBAKb9LMmme16d61wGeMruTFUf9/3rJxdNtcI20rb7B8a4Ed/BRgRlFLwh
H+LBY8xbRSSdw26FxC7qfZifwzwE01JiRGvUaJGgUc/NqyjgT9dC6xsUtMSrSWFV
e38pLtDuDVJGqVDsVvIpiJ5N4ICVZWcGM2AF72mCU80t0w3LjJk7AgMBAAE=
-----END RSA PUBLIC KEY-----`;

const EC_PKCS8 = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgxERF5ebYtVsQVS9u
dlrb8h2LbiGya3jOBVGpoB6qDbOhRANCAAQLtdZEdTVeyYi9u6Yde2+bJ9FdTuTQ
bZEONLvvqExMCII3S+FUfKUdjshb/T1M91tJisquSI5eO420ISUedK+I
-----END PRIVATE KEY-----`;

const CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIBrzCCARgCCQCC58jb+5kYgDANBgkqhkiG9w0BAQsFADAcMRowGAYDVQQDDBF0
ZXN0LmZvcm1hdGhvLmNvbTAeFw0yNjEwMTAwNDAzNTRaFw0yNjExMDkwNDAzNTRa
MBwxGjAYBgNVBAMMEXRlc3QuZm9ybWF0aG8uY29tMIGfMA0GCSqGSIb3DQEBAQUA
A4GNADCBiQKBgQCm/SzJpntenetcBnjK7kxVH/f96ycXTbXCNtK2+wfGuBHfwUYE
ZRS8IR/iwWPMW0UkncNuhcQu6n2Yn8M8BNNSYkRr1GiRoFHPzaso4E/XQusbFLTE
q0lhVXt/KS7Q7g1SRqlQ7FbyKYieTeCAlWVnBjNgBe9pglPNLdMNy4yZOwIDAQAB
MA0GCSqGSIb3DQEBCwUAA4GBAHoAHL1KsZHQPzaaaGszzt1u88LPaSNsQgdhGaCT
yNWfXftrJzOUy3R6RmbdtfD8mwccinrMAYccfZ8BPpT0RlktKxMJ/XQn9xmQki4L
Epz2UeuL9KKsdyNTGMqJsaOXQKjEcOsXD67hGcKgPqxWDsnWQWL68pWtbRsGlCZZ
dm5i
-----END CERTIFICATE-----`;

const SHA256_COLON = 'B4:05:3F:CB:0C:F2:BA:79:5B:C3:30:49:6F:E9:A8:C0:C9:A1:87:A9:59:E2:3B:90:6A:B1:9A:58:20:E4:F5:70';
const SHA1_COLON = 'E9:70:13:78:19:21:6E:AE:7F:76:77:2A:61:FB:41:5D:CC:FC:9C:48';

let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
};
const norm = (pem) => pem.trim();
const b64body = (pem) => pem.split('-----')[2].replace(/\s+/g, '');

async function get(worker, path, params) {
  const u = new URL('http://x' + path);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  const res = await worker.fetch(new Request(u));
  return { status: res.status, body: await res.json() };
}
async function postJson(worker, path, obj) {
  const res = await worker.fetch(new Request('http://x' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }));
  return { status: res.status, body: await res.json() };
}

// ---------- certificate-fingerprint ----------
console.log('certificate-fingerprint:');
{
  const r = await get(cert, '/api', { cert: CERT_PEM });
  t('pem cert 200', r.status === 200);
  t('sha256 colon matches openssl', r.body.fingerprints?.sha256?.colon === SHA256_COLON, JSON.stringify(r.body.fingerprints?.sha256));
  t('sha1 colon matches openssl', r.body.fingerprints?.sha1?.colon === SHA1_COLON);
  t('kind pem + label CERTIFICATE', r.body.input?.kind === 'pem' && r.body.input?.label === 'CERTIFICATE');
  t('der_bytes sane', r.body.input?.der_bytes > 400);

  const r2 = await get(cert, '/api', { cert: b64body(CERT_PEM) });
  t('base64-der input same sha256', r2.status === 200 && r2.body.fingerprints?.sha256?.colon === SHA256_COLON);

  const bad1 = await get(cert, '/api', { cert: '' });
  t('missing cert 400', bad1.status === 400 && /Missing/.test(bad1.body.error));
  const bad2 = await get(cert, '/api', { cert: '!!!not-base64!!!' });
  t('garbage base64 400', bad2.status === 400 && /base64/i.test(bad2.body.error));
  const bad3 = await get(cert, '/api', { cert: 'aGVsbG8gd29ybGQh' }); // "hello world!" → not 0x30
  t('non-SEQUENCE DER 400', bad3.status === 400 && /(too short|SEQUENCE)/i.test(bad3.body.error));
  const truncated = b64body(CERT_PEM).slice(0, -40);
  const bad4 = await get(cert, '/api', { cert: truncated });
  t('truncated DER 400', bad4.status === 400 && /(short|mismatch|truncated)/i.test(bad4.body.error), JSON.stringify(bad4.body));
  const pj = await postJson(cert, '/api', { cert: CERT_PEM });
  t('POST JSON works', pj.status === 200 && pj.body.fingerprints?.sha256?.colon === SHA256_COLON);
  const pre = await cert.fetch(new Request('http://x/api', { method: 'OPTIONS' }));
  t('OPTIONS 204', pre.status === 204 && pre.headers.get('Access-Control-Allow-Origin') === '*');
  const sm = await cert.fetch(new Request('http://x/sitemap.xml'));
  t('sitemap 200', sm.status === 200);
  const ll = await cert.fetch(new Request('http://x/llms.txt'));
  t('llms.txt 200', ll.status === 200);
}

// ---------- key-format-converter ----------
console.log('key-format-converter:');
{
  const r = await get(keyfmt, '/api', { key: PKCS1_PRIV, to: 'pkcs8' });
  t('pkcs1→pkcs8 200', r.status === 200, JSON.stringify(r.body));
  t('pkcs1→pkcs8 PEM byte-identical to openssl', r.status === 200 && norm(r.body.pem) === norm(PKCS8_PRIV));
  t('round_trip_ok', r.body.round_trip_ok === true);
  t('bits 1024', r.body.input?.bits === 1024 && r.body.converted?.bits === 1024, String(r.body.input?.bits));

  const r2 = await get(keyfmt, '/api', { key: PKCS8_PRIV, to: 'pkcs1' });
  t('pkcs8→pkcs1 PEM byte-identical to openssl', r2.status === 200 && norm(r2.body.pem) === norm(PKCS1_PRIV));

  const r3 = await get(keyfmt, '/api', { key: SPKI_PUB, to: 'pkcs1-public' });
  t('spki→pkcs1-public matches openssl', r3.status === 200 && norm(r3.body.pem) === norm(PKCS1_PUB));

  const r4 = await get(keyfmt, '/api', { key: PKCS1_PUB, to: 'spki' });
  t('pkcs1-public→spki matches openssl', r4.status === 200 && norm(r4.body.pem) === norm(SPKI_PUB));

  const r5 = await get(keyfmt, '/api', { key: PKCS8_PRIV, to: 'der' });
  t('to=der returns DER base64', r5.status === 200 && r5.body.der_base64?.replace(/\s/g, '') === b64body(PKCS8_PRIV));

  const r6 = await get(keyfmt, '/api', { key: PKCS1_PRIV });
  t('auto target pkcs1→pkcs8', r6.status === 200 && r6.body.converted?.format === 'pkcs8');
  const r6b = await get(keyfmt, '/api', { key: SPKI_PUB });
  t('auto target spki→pkcs1-public', r6b.status === 200 && r6b.body.converted?.format === 'pkcs1-public');

  const e1 = await get(keyfmt, '/api', { key: EC_PKCS8, to: 'pkcs1' });
  t('EC key clean 400 RSA-only', e1.status === 400 && /RSA only|EC key/.test(e1.body.error), JSON.stringify(e1.body));
  const e2 = await get(keyfmt, '/api', { key: PKCS1_PRIV, to: 'nope' });
  t('bad target 400', e2.status === 400 && /Invalid 'to'/.test(e2.body.error));
  const e3 = await get(keyfmt, '/api', { key: b64body(PKCS1_PRIV) });
  t('bare DER without type 400 hint', e3.status === 400 && /type=/.test(e3.body.error));
  const r7 = await get(keyfmt, '/api', { key: b64body(PKCS1_PRIV), type: 'pkcs1' });
  t('bare DER + type=pkcs1 converts', r7.status === 200 && r7.body.converted?.format === 'pkcs8');
  const e4 = await get(keyfmt, '/api', { key: '-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----' });
  t('garbage PEM body 400', e4.status === 400);
  const trunc = b64body(PKCS8_PRIV).slice(0, -30);
  const e5 = await get(keyfmt, '/api', { key: '-----BEGIN PRIVATE KEY-----\n' + trunc + '\n-----END PRIVATE KEY-----', to: 'pkcs1' });
  t('truncated pkcs8 400', e5.status === 400, JSON.stringify(e5.body));
  const e6 = await get(keyfmt, '/api', { key: PKCS1_PRIV, to: 'spki' });
  t('private→public cross-family blocked 400', e6.status === 400 && /one step/.test(e6.body.error));
  const pj = await postJson(keyfmt, '/api', { key: PKCS1_PRIV, to: 'pkcs8' });
  t('POST JSON works', pj.status === 200 && pj.body.round_trip_ok === true);
  const pre = await keyfmt.fetch(new Request('http://x/api', { method: 'OPTIONS' }));
  t('OPTIONS 204', pre.status === 204);
  const sm = await keyfmt.fetch(new Request('http://x/sitemap.xml'));
  t('sitemap 200', sm.status === 200);
  const ll = await keyfmt.fetch(new Request('http://x/llms.txt'));
  t('llms.txt 200', ll.status === 200);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
