// RSA Key Format Converter API (PKCS#1 ⇄ PKCS#8, SPKI ⇄ PKCS#1, PEM ⇄ DER) — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection. Prefer POST for real keys; GET URLs can appear in logs',
};
const HOST = 'https://key-format-converter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/key-format-converter';
const MAX_BYTES = 64 * 1024;

const DESC = 'Convert RSA key formats: PKCS#1 to PKCS#8, PKCS#8 to PKCS#1, SPKI to PKCS#1 public, PEM to DER. Free edge API, privacy-first, keys never stored.';

function err400(message, extra) {
  return Response.json({ error: message, ...extra }, { status: 400, headers: JSON_HEADERS });
}

// ---------- base64 ----------
function b64decode(s) {
  const clean = s.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
  try {
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch { return null; }
}
function b64encode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// ---------- minimal DER TLV ----------
function readTLV(buf, off, what) {
  if (off + 2 > buf.length) throw what + ': truncated (no room for tag+length)';
  const tag = buf[off];
  const first = buf[off + 1];
  let hdr = 2, len = 0;
  if (first & 0x80) {
    const n = first & 0x7f;
    if (n === 0 || n > 4) throw what + ': unsupported DER length encoding';
    if (off + 2 + n > buf.length) throw what + ': truncated length bytes';
    for (let i = 0; i < n; i++) len = len * 256 + buf[off + 2 + i];
    hdr = 2 + n;
  } else {
    len = first;
  }
  const contentStart = off + hdr;
  if (contentStart + len > buf.length) throw what + ': TLV declares ' + (contentStart + len) + ' bytes but only ' + buf.length + ' available (truncated input?)';
  return { tag, contentStart, contentLen: len, end: contentStart + len };
}
function encodeLen(n) {
  if (n < 0x80) return [n];
  const bytes = [];
  let v = n;
  while (v > 0) { bytes.unshift(v & 255); v = Math.floor(v / 256); }
  return [0x80 | bytes.length, ...bytes];
}
function tlv(tag, content) {
  return new Uint8Array([tag, ...encodeLen(content.length), ...content]);
}

const OID_RSA = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];        // 1.2.840.113549.1.1.1
const OID_EC = [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01];                     // 1.2.840.10045.2.1
const OID_ED25519 = [0x2b, 0x65, 0x70];                                        // 1.3.101.112
function oidAt(algSeq, buf, what) {
  // algSeq = SEQUENCE { OID, params } → returns the OID content bytes
  const outer = readTLV(buf, algSeq.contentStart, what + ' algorithm identifier');
  if (outer.tag !== 0x06) throw what + ': expected an OBJECT IDENTIFIER inside the AlgorithmIdentifier';
  return Array.from(buf.slice(outer.contentStart, outer.end));
}
function checkRsaOid(oid, what) {
  const hex = oid.map(b => b.toString(16).padStart(2, '0')).join('');
  if (eq(oid, OID_RSA)) return;
  if (eq(oid, OID_EC)) throw what + ': this is an EC key — this converter handles RSA only (PKCS#8/SPKI for EC needs curve-aware handling)';
  if (eq(oid, OID_ED25519)) throw what + ': this is an Ed25519 key — this converter handles RSA only';
  throw what + ': unsupported algorithm OID 0x' + hex + ' — expected rsaEncryption (1.2.840.113549.1.1.1)';
}
function eq(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }

// ---------- conversions ----------
const ALG_RSA_NULL = new Uint8Array([0x30, 0x0d, 0x06, 0x09, ...OID_RSA, 0x05, 0x00]); // SEQ { OID rsaEncryption, NULL }

function pkcs1ToPkcs8(pkcs1) {
  const inner = new Uint8Array([...new Uint8Array([0x02, 0x01, 0x00]), ...ALG_RSA_NULL, ...tlv(0x04, pkcs1)]);
  return tlv(0x30, inner);
}
function pkcs8ToPkcs1(pkcs8) {
  const outer = readTLV(pkcs8, 0, 'PKCS#8 key');
  if (outer.tag !== 0x30 || outer.end !== pkcs8.length) throw 'PKCS#8 key: not a well-formed top-level SEQUENCE (trailing bytes or wrong tag)';
  const ver = readTLV(pkcs8, outer.contentStart, 'PKCS#8 version');
  if (ver.tag === 0x30) throw 'This PKCS#8 looks like an encrypted PBES2 envelope (first element is a SEQUENCE, not INTEGER 0) — decrypt it first';
  if (ver.tag !== 0x02) throw 'PKCS#8 version: expected INTEGER';
  if (pkcs8[ver.contentStart] !== 0) throw 'PKCS#8 version must be 0 for an unencrypted RSA key';
  const alg = readTLV(pkcs8, ver.end, 'PKCS#8 algorithm identifier');
  if (alg.tag !== 0x30) throw 'PKCS#8 algorithm identifier: expected SEQUENCE';
  checkRsaOid(oidAt(alg, pkcs8, 'PKCS#8'), 'PKCS#8 key');
  const octet = readTLV(pkcs8, alg.end, 'PKCS#8 privateKey');
  if (octet.tag !== 0x04) throw 'PKCS#8 privateKey: expected OCTET STRING';
  const pkcs1 = pkcs8.slice(octet.contentStart, octet.end);
  const probe = readTLV(pkcs1, 0, 'inner PKCS#1 key');
  if (probe.tag !== 0x30) throw 'inner PKCS#1 key does not start with a SEQUENCE';
  return new Uint8Array(pkcs1);
}
function pkcs1PubToSpki(pkcs1pub) {
  const bit = tlv(0x03, new Uint8Array([0x00, ...pkcs1pub])); // BIT STRING, 0 unused bits
  return tlv(0x30, new Uint8Array([...ALG_RSA_NULL, ...bit]));
}
function spkiToPkcs1Pub(spki) {
  const outer = readTLV(spki, 0, 'SPKI public key');
  if (outer.tag !== 0x30 || outer.end !== spki.length) throw 'SPKI public key: not a well-formed top-level SEQUENCE';
  const alg = readTLV(spki, outer.contentStart, 'SPKI algorithm identifier');
  if (alg.tag !== 0x30) throw 'SPKI algorithm identifier: expected SEQUENCE';
  checkRsaOid(oidAt(alg, spki, 'SPKI'), 'SPKI public key');
  const bit = readTLV(spki, alg.end, 'SPKI subjectPublicKey');
  if (bit.tag !== 0x03) throw 'SPKI subjectPublicKey: expected BIT STRING';
  if (spki[bit.contentStart] !== 0) throw 'SPKI subjectPublicKey: unexpected unused-bit count (must be 0)';
  const pkcs1pub = spki.slice(bit.contentStart + 1, bit.end);
  const probe = readTLV(pkcs1pub, 0, 'inner PKCS#1 public key');
  if (probe.tag !== 0x30) throw 'inner PKCS#1 public key does not start with a SEQUENCE';
  return new Uint8Array(pkcs1pub);
}
function rsaBits(pkcs1) {
  // PKCS#1 priv: SEQ { INTEGER version, INTEGER n, ... } / pub: SEQ { INTEGER n, ... }
  const outer = readTLV(pkcs1, 0, 'PKCS#1 key');
  let off = outer.contentStart;
  let t = readTLV(pkcs1, off, 'PKCS#1 key');
  if (t.tag === 0x02 && t.contentLen === 1 && pkcs1[t.contentStart] === 0) { off = t.end; t = readTLV(pkcs1, off, 'PKCS#1 modulus'); } // skip version
  if (t.tag !== 0x02) throw 'PKCS#1 modulus: expected INTEGER';
  let i = t.contentStart;
  while (i < t.end && pkcs1[i] === 0) i++;
  if (i >= t.end) return 0;
  let bits = (t.end - i) * 8;
  let b = pkcs1[i];
  while (!(b & 0x80)) { bits--; b <<= 1; }
  return bits;
}

function bitsOf(form, d) {
  // rsaBits expects PKCS#1-shaped DER; unwrap PKCS#8/SPKI first (already validated)
  if (form === 'pkcs8') return rsaBits(pkcs8ToPkcs1(d));
  if (form === 'spki') return rsaBits(spkiToPkcs1Pub(d));
  return rsaBits(d);
}

// ---------- PEM ----------
const LABELS = {
  'pkcs1': ['RSA PRIVATE KEY', 'pkcs1'],
  'pkcs8': ['PRIVATE KEY', 'pkcs8'],
  'pkcs1-public': ['RSA PUBLIC KEY', 'pkcs1-public'],
  'spki': ['PUBLIC KEY', 'spki'],
};
function pemWrap(label, der) {
  const b64 = b64encode(der);
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

const TARGETS = {
  'pkcs1': { from: 'pkcs8', label: 'RSA PRIVATE KEY', convert: (d) => pkcs8ToPkcs1(d), back: (d) => pkcs1ToPkcs8(d) },
  'pkcs8': { from: 'pkcs1', label: 'PRIVATE KEY', convert: (d) => pkcs1ToPkcs8(d), back: (d) => pkcs8ToPkcs1(d) },
  'pkcs1-public': { from: 'spki', label: 'RSA PUBLIC KEY', convert: (d) => spkiToPkcs1Pub(d), back: (d) => pkcs1PubToSpki(d) },
  'spki': { from: 'pkcs1-public', label: 'PUBLIC KEY', convert: (d) => pkcs1PubToSpki(d), back: (d) => spkiToPkcs1Pub(d) },
};

async function handleApi(request) {
  let key = '', to = '', type = '';
  if (request.method === 'POST') {
    const ct = (request.headers.get('Content-Type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      try { const j = await request.json(); key = typeof j.key === 'string' ? j.key : ''; to = typeof j.to === 'string' ? j.to : ''; type = typeof j.type === 'string' ? j.type : ''; }
      catch { return err400('Invalid JSON body'); }
    } else {
      key = await request.text();
    }
  } else {
    const q = new URL(request.url).searchParams;
    key = q.get('key') || ''; to = q.get('to') || ''; type = q.get('type') || '';
  }
  key = key.trim();
  if (!key) return err400("Missing 'key' parameter: pass a PEM key (RSA PRIVATE KEY / PRIVATE KEY / RSA PUBLIC KEY / PUBLIC KEY)");
  if (key.length > MAX_BYTES) return err400('Input too large (cap ' + MAX_BYTES + ' bytes)');
  to = to.trim().toLowerCase();
  if (to && !TARGETS[to] && to !== 'der') return err400("Invalid 'to' target: " + JSON.stringify(to) + ' — use pkcs8, pkcs1, spki, pkcs1-public or der', { allowed: Object.keys(TARGETS).concat('der') });

  if (/Proc-Type:.*ENCRYPTED/i.test(key)) return err400('Encrypted PEM detected (Proc-Type header) — decrypt it first; this API handles unencrypted keys only');

  let inputFormat = null, der = null;
  if (key.includes('-----BEGIN')) {
    const m = key.match(/-----BEGIN ([A-Z0-9 ]+)-----/);
    const end = key.match(/-----END [A-Z0-9 ]+-----/);
    if (!m || !end) return err400('Malformed PEM: missing BEGIN/END markers');
    const label = m[1];
    const found = Object.entries(LABELS).find(([, [l]]) => l === label);
    if (!found) return err400("Unsupported PEM label '" + label + "' — expected RSA PRIVATE KEY (PKCS#1), PRIVATE KEY (PKCS#8), RSA PUBLIC KEY (PKCS#1) or PUBLIC KEY (SPKI)");
    inputFormat = found[0];
    der = b64decode(key.slice(key.indexOf(m[0]) + m[0].length, key.indexOf(end[0])));
    if (!der) return err400('PEM body is not valid base64');
  } else {
    der = b64decode(key);
    if (!der) return err400('Input is neither PEM nor valid base64');
    if (!type) return err400('Raw base64 DER input needs the key type to pick a PEM label — pass ?type=pkcs1|pkcs8|spki|pkcs1-public (or use a PEM input)', { allowed: ['pkcs1', 'pkcs8', 'spki', 'pkcs1-public'] });
    if (!LABELS[type]) return err400("Invalid 'type': " + JSON.stringify(type), { allowed: Object.keys(LABELS) });
    inputFormat = type;
  }

  // Validate + normalize input to a known DER shape
  try {
    if (inputFormat === 'pkcs8') der = new Uint8Array([...pkcs1ToPkcs8(pkcs8ToPkcs1(der))]); // validates OID+structure via round trip
    if (inputFormat === 'spki') der = new Uint8Array([...pkcs1PubToSpki(spkiToPkcs1Pub(der))]);
    if (inputFormat === 'pkcs1') { pkcs8ToPkcs1(pkcs1ToPkcs8(der)); rsaBits(der); }
    if (inputFormat === 'pkcs1-public') { spkiToPkcs1Pub(pkcs1PubToSpki(der)); rsaBits(der); }
  } catch (e) {
    return err400(String(e.message || e));
  }

  if (to === 'der') {
    return Response.json({ input: { format: inputFormat, bits: bitsOf(inputFormat, der) }, der_base64: b64encode(der) }, { headers: JSON_HEADERS });
  }
  if (!to) to = TARGETS[inputFormat] ? (inputFormat === 'pkcs1' || inputFormat === 'pkcs8' ? (inputFormat === 'pkcs1' ? 'pkcs8' : 'pkcs1') : (inputFormat === 'spki' ? 'pkcs1-public' : 'spki')) : 'pkcs8';
  const target = TARGETS[to];
  if (target.from !== inputFormat) {
    return err400("Cannot convert " + LABELS[inputFormat][0] + " (" + inputFormat + ") to " + to + " in one step — expected input format " + target.from, { hint: 'pkcs1 ⇄ pkcs8 for private keys; pkcs1-public ⇄ spki for public keys' });
  }
  let converted, roundTrip;
  try {
    converted = target.convert(der);
    roundTrip = target.back(converted);
  } catch (e) {
    return err400(String(e.message || e));
  }
  const ok = eq(Array.from(roundTrip), Array.from(der));

  return Response.json({
    input: { format: inputFormat, label: LABELS[inputFormat][0], bits: bitsOf(inputFormat, der) },
    converted: { format: to, label: target.label, bits: bitsOf(to, converted) },
    pem: pemWrap(target.label, converted),
    der_base64: b64encode(converted),
    round_trip_ok: ok,
  }, { headers: JSON_HEADERS });
}

const API_HELP = {
  endpoint: '/api',
  method: 'GET (query params) or POST (body / JSON {"key": "...", "to": "..."})',
  params: {
    key: 'PEM key (RSA PRIVATE KEY, PRIVATE KEY, RSA PUBLIC KEY, PUBLIC KEY) or base64 DER (then also pass type=)',
    to: 'pkcs8 | pkcs1 | spki | pkcs1-public | der (default: auto-flip between the pair)',
    type: 'only for base64 DER input: pkcs1 | pkcs8 | spki | pkcs1-public',
  },
  returns: 'converted PEM + base64 DER + key size in bits + round_trip_ok parity flag',
  example: 'curl -G "https://key-format-converter-formatho.filesformatho.workers.dev/api" --data-urlencode "key=-----BEGIN RSA PRIVATE KEY-----..." --data-urlencode "to=pkcs8"',
  privacy: 'No logging, no storage — keys exist only in edge worker memory',
};

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RSA Key Format Converter API — PKCS#1 ⇄ PKCS#8, PEM ⇄ DER — Free &amp; Private</title>
<meta name="description" content="${DESC}">
<link rel="canonical" href="${HOST}/">
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem 3rem; line-height: 1.6; }
header { border-bottom: 1px solid #8884; margin-bottom: 1.5rem; padding-bottom: 1rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.tagline { color: #888; margin: 0; }
.badges { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1rem 0; }
.badge { background: #8882; border-radius: 999px; padding: .15rem .7rem; font-size: .8rem; }
pre { background: #8882; padding: .8rem 1rem; border-radius: 8px; overflow-x: auto; font-size: .85rem; }
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #8884; padding: .4rem .6rem; font-size: .9rem; text-align: left; }
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "RSA Key Format Converter API — Free & Private",
  "url": "${HOST}/",
  "description": "${DESC}",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["PKCS#1 to PKCS#8", "PKCS#8 to PKCS#1", "SPKI to PKCS#1", "PEM to DER", "Key size in bits", "Zero tracking"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
  <h1>RSA Key Format Converter API — Free &amp; Private</h1>
  <p class="tagline">PKCS#1 ⇄ PKCS#8, SPKI ⇄ PKCS#1 public, PEM ⇄ DER — exactly what <code>openssl pkcs8 -topk8</code> does, as an API. By <a href="https://formatho.com">formatho.com</a>.</p>
</header>
<div class="badges">
  <span class="badge">Free</span><span class="badge">No signup</span><span class="badge">CORS enabled</span><span class="badge">Zero tracking</span><span class="badge">GET + POST</span>
</div>

<h2>PKCS#1 → PKCS#8</h2>
<pre>curl -G "${HOST}/api" \\
  --data-urlencode "key=-----BEGIN RSA PRIVATE KEY-----
... your key ...-----END RSA PRIVATE KEY-----" \\
  --data-urlencode "to=pkcs8"</pre>

<p>Response (excerpt):</p>
<pre>{
  "input":     { "format": "pkcs1", "bits": 2048 },
  "converted": { "format": "pkcs8", "bits": 2048 },
  "pem": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",
  "round_trip_ok": true
}</pre>

<h2>Conversions</h2>
<table>
<tr><th>to=</th><th>input</th><th>output label</th></tr>
<tr><td>pkcs8</td><td>PKCS#1 private (BEGIN RSA PRIVATE KEY)</td><td>BEGIN PRIVATE KEY</td></tr>
<tr><td>pkcs1</td><td>PKCS#8 private (BEGIN PRIVATE KEY)</td><td>BEGIN RSA PRIVATE KEY</td></tr>
<tr><td>spki</td><td>PKCS#1 public (BEGIN RSA PUBLIC KEY)</td><td>BEGIN PUBLIC KEY</td></tr>
<tr><td>pkcs1-public</td><td>SPKI public (BEGIN PUBLIC KEY)</td><td>BEGIN RSA PUBLIC KEY</td></tr>
<tr><td>der</td><td>any of the above</td><td>base64 DER bytes</td></tr>
</table>

<h2>Why you need this</h2>
<ul>
  <li>AWS KMS / Java / modern tooling want <strong>PKCS#8</strong>; OpenSSL <code>genrsa</code> produces <strong>PKCS#1</strong></li>
  <li>SSH-style libs and older tooling want PKCS#1 back</li>
  <li>Every conversion is verified by an automatic round trip (<code>round_trip_ok: true</code>) before it is returned</li>
</ul>

<h2>Clean errors</h2>
<ul>
  <li>EC / Ed25519 keys → explicit "RSA only" message (no silent garbage)</li>
  <li>Encrypted PEM (Proc-Type header) or PBES2 envelope → told to decrypt first</li>
  <li>Truncated / tampered DER → exact TLV length mismatch message</li>
</ul>

<div class="privacy"><strong>Privacy:</strong> keys are converted in edge memory and discarded — never logged, never stored. Prefer POST so key material stays out of access logs.</div>

<footer>
  <p>Full in-browser tool (keys never leave your browser): <a href="${FULL_TOOL}">Private Key Format Converter on formatho.com</a> · More free APIs: <a href="https://formatho-tools.filesformatho.workers.dev">Formatho Tools index</a></p>
</footer>
</body>
</html>`;

const LLMS_TXT = `# RSA Key Format Converter API (formatho.com)

- URL: ${HOST}/
- Full tool: ${FULL_TOOL}
- API: ${HOST}/api
- Sitemap: ${HOST}/sitemap.xml
- Fleet index: https://formatho-tools.filesformatho.workers.dev
- Main site: https://formatho.com

Convert RSA key formats: PKCS#1 <-> PKCS#8 private, PKCS#1-public <-> SPKI, PEM <-> base64 DER.
Input: PEM key or base64 DER (+ type= for the latter). Params: key, to=pkcs8|pkcs1|spki|pkcs1-public|der.
Output: converted PEM + base64 DER + key bits + round_trip_ok parity check.
RSA only; EC/Ed25519 and encrypted keys get clean 400s. Limits: 64KB. Privacy: zero tracking, prefer POST.`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
</urlset>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (url.pathname === '/api') {
      if (request.method !== 'GET' && request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }), { status: 405, headers: { ...JSON_HEADERS, Allow: 'GET, POST, OPTIONS' } });
      if (url.searchParams.toString() === '' && request.method === 'GET') return Response.json(API_HELP, { headers: JSON_HEADERS });
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
