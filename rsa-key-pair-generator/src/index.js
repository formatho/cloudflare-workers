// Privacy-First RSA Key Pair Generator API (PKCS#8 + SPKI PEM, OpenSSH public key) — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://rsa-key-pair-generator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/rsa-key-pair-generator';
const ALLOWED_BITS = [2048, 3072, 4096];

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RSA Key Pair Generator Online (2048/3072/4096, PKCS#8 + OpenSSH) — Free &amp; Private</title>
<meta name="description" content="Generate RSA key pairs at the edge: 2048/3072/4096-bit, PKCS#8 private PEM, SPKI public PEM, OpenSSH public key line and SHA-256 fingerprints. Keys are made fresh per request, never stored. Free API.">
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
.warn { background: #a510; border: 1px solid #a53; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "RSA Key Pair Generator Online (2048/3072/4096, PKCS#8 + OpenSSH) — Free & Private",
  "url": "https://rsa-key-pair-generator-formatho.filesformatho.workers.dev/",
  "description": "Generate RSA key pairs at the edge: 2048/3072/4096-bit, PKCS#8 private PEM, SPKI public PEM, OpenSSH public key line and SHA-256 fingerprints. Keys are made fresh per request, never stored. Free API.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["Free edge API", "Zero tracking", "Keys never stored or logged", "PKCS#8 + SPKI + OpenSSH formats", "No signup required"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
  <h1>RSA Key Pair Generator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 Keys never stored</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># Generate a 2048-bit RSA key pair (default)
curl "${HOST}/api"

# 4096-bit key pair with OpenSSH public key + fingerprints
curl "${HOST}/api?bits=4096"

# JWK format instead of PEM
curl "${HOST}/api?bits=2048&format=jwk"</code></pre>
<p>Returns the private key as PKCS#8 PEM, the public key as SPKI PEM plus an OpenSSH-style <code>ssh-rsa</code> line and SHA-256/SHA-512 public-key fingerprints, with the verified modulus size in bits.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> keys are generated in-memory at the edge for your request only — never cached (Cache-Control: no-store), never logged, never stored.</div>
<div class="warn"><strong>Use for development and testing.</strong> For production systems, generate keys client-side (the full browser tool below does exactly that) or in your own infrastructure — never route production private keys through any third-party service.</div>
<h2>Full browser tool</h2>
<p>Generate keys entirely client-side in your browser: <a href="${FULL_TOOL}">RSA Key Pair Generator on formatho.com</a>.</p>
<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>
<footer>© formatho.com · <a href="${HOST}/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${HOST}/api</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;

const LLMS_TXT = "# RSA Key Pair Generator Online (2048/3072/4096, PKCS#8 + OpenSSH) — Free & Private\n\n> Generate RSA key pairs: PKCS#8 private PEM, SPKI public PEM, OpenSSH public key line and SHA-256 fingerprints. Keys are made fresh per request, never cached or stored. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies. For production keys use the client-side browser tool instead.\n\n- [Use this tool]: https://rsa-key-pair-generator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://rsa-key-pair-generator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled, no-store\n- [Full browser tool on formatho.com]: https://formatho.com/tools/rsa-key-pair-generator\n- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } });
}

// --- minimal DER (TLV) reader for walking an SPKI structure ---
function derRead(buf, off) {
  const tag = buf[off];
  let i = off + 1;
  let len;
  const b0 = buf[i++];
  if (b0 < 0x80) len = b0;
  else {
    const n = b0 & 0x7f;
    if (n === 0 || n > 4 || i + n > buf.length) throw new Error('bad DER length');
    len = 0;
    for (let k = 0; k < n; k++) len = len * 256 + buf[i++];
  }
  if (i + len > buf.length) throw new Error('DER overflow');
  return { tag, start: i, len, end: i + len };
}

function stripLeadingZeros(b) {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  return b.slice(i);
}

function bytesToB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function pemWrap(label, der) {
  const b64 = bytesToB64(der);
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

// Extract modulus + exponent from an RSASSA SPKI DER and build the OpenSSH public key line.
function sshRsaFromSpki(spki) {
  const outer = derRead(spki, 0);        // SEQUENCE (SubjectPublicKeyInfo)
  const alg = derRead(spki, outer.start); // SEQUENCE (AlgorithmIdentifier)
  const bs = derRead(spki, alg.end);      // BIT STRING
  const inner = derRead(spki, bs.start + 1); // SEQUENCE (RSAPublicKey)
  const nInt = derRead(spki, inner.start);
  const eInt = derRead(spki, nInt.end);
  let n = stripLeadingZeros(spki.slice(nInt.start, nInt.end));
  const e = stripLeadingZeros(spki.slice(eInt.start, eInt.end));
  const bits = n.length ? (n.length - 1) * 8 + (32 - Math.clz32(n[0])) : 0;
  const mpint = (b) => (b[0] & 0x80 ? new Uint8Array([0, ...b]) : b);
  const u32 = (v) => new Uint8Array([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]);
  const str = (b) => new Uint8Array([...u32(b.length), ...b]);
  const name = str(new TextEncoder().encode('ssh-rsa'));
  const blob = new Uint8Array([...name, ...str(mpint(e)), ...str(mpint(n))]);
  return { sshLine: 'ssh-rsa ' + bytesToB64(blob), blob, bits, modulus_hex_tail: [...n.subarray(n.length - 8)].map((x) => x.toString(16).padStart(2, '0')).join('') };
}

async function shaBytes(algo, data) {
  const digest = await crypto.subtle.digest(algo, data);
  return new Uint8Array(digest);
}

const hex = (bytes) => [...bytes].map((x) => x.toString(16).padStart(2, '0')).join('');

async function handleApi(request, url) {
  if (request.method !== 'GET' && request.method !== 'POST') return err400('method not allowed; use GET or POST');
  let p = {};
  if (request.method === 'GET') {
    for (const [k, v] of url.searchParams) p[k] = v;
  } else {
    const ct = request.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) p = await request.json();
      else { const f = await request.formData(); for (const [k, v] of f.entries()) p[k] = v; }
    } catch { return err400('body must be valid JSON or form data'); }
  }

  const bits = p.bits == null ? 2048 : Number(p.bits);
  if (!ALLOWED_BITS.includes(bits)) return err400(`bits must be one of ${ALLOWED_BITS.join(', ')}`);
  const format = p.format == null ? 'pem' : String(p.format);
  if (!['pem', 'jwk'].includes(format)) return err400('format must be pem or jwk');

  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );

  const noStore = { ...JSON_HEADERS, 'Cache-Control': 'no-store' };

  if (format === 'jwk') {
    const [privateJwk, publicJwk] = await Promise.all([
      crypto.subtle.exportKey('jwk', pair.privateKey),
      crypto.subtle.exportKey('jwk', pair.publicKey),
    ]);
    return Response.json({
      bits, algorithm: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', format: 'jwk',
      private_key_jwk: privateJwk, public_key_jwk: publicJwk,
      generated_at: new Date().toISOString(),
      warning: 'Keys are generated fresh for this request and never stored. For production, generate keys client-side or in your own infrastructure.',
      full_tool: FULL_TOOL,
    }, { headers: noStore });
  }

  const [pkcs8, spki] = await Promise.all([
    crypto.subtle.exportKey('pkcs8', pair.privateKey),
    crypto.subtle.exportKey('spki', pair.publicKey),
  ]);
  const spkiBytes = new Uint8Array(spki);
  const { sshLine, blob, bits: parsedBits } = sshRsaFromSpki(spkiBytes);
  const [blobSha256, spkiSha256, spkiSha512] = await Promise.all([
    shaBytes('SHA-256', blob),
    shaBytes('SHA-256', spkiBytes),
    shaBytes('SHA-512', spkiBytes),
  ]);

  return Response.json({
    bits, verified_modulus_bits: parsedBits,
    algorithm: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', format: 'pem',
    private_key_pem: pemWrap('PRIVATE KEY', new Uint8Array(pkcs8)),
    public_key_pem: pemWrap('PUBLIC KEY', spkiBytes),
    public_key_openssh: sshLine,
    public_key_fingerprint: 'SHA256:' + bytesToB64(blobSha256).replace(/=+$/, ''),
    public_key_sha256_spki_hex: hex(spkiSha256),
    public_key_sha512_spki_hex: hex(spkiSha512),
    generated_at: new Date().toISOString(),
    warning: 'Keys are generated fresh for this request and never stored. For production, generate keys client-side or in your own infrastructure.',
    full_tool: FULL_TOOL,
  }, { headers: noStore });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (url.pathname === '/api') return handleApi(request, url);
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
