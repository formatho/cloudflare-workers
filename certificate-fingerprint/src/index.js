// X.509 Certificate Fingerprint API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection. Prefer POST for real certificates; GET URLs can appear in logs',
};
const HOST = 'https://certificate-fingerprint-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/certificate-fingerprint';
const MAX_BYTES = 256 * 1024;

const DESC = 'Compute SHA-1, SHA-256 and SHA-512 fingerprints of an X.509 certificate from its PEM or DER form. Free edge API, privacy-first, no signup.';

function err400(message, extra) {
  return Response.json({ error: message, ...extra }, { status: 400, headers: JSON_HEADERS });
}

// ---- base64 helpers (standard, forgiving of PEM whitespace) ----
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
const HEX = '0123456789abcdef';
function toHex(buf, upper = false) {
  let out = '';
  for (const b of buf) out += HEX[b >> 4] + HEX[b & 15];
  return upper ? out.toUpperCase() : out;
}
function toColon(buf) { return toHex(buf, true).match(/../g).join(':'); }

// ---- DER sanity check: top-level TLV must fit exactly ----
function derCheck(der) {
  if (der.length < 16) return 'DER too short (' + der.length + ' bytes) to be an X.509 certificate';
  if (der[0] !== 0x30) return 'DER does not start with a SEQUENCE tag (0x30) — not an X.509 certificate';
  let off = 1, len = 0, multibyte = false;
  if (der[1] & 0x80) {
    const n = der[1] & 0x7f;
    if (n === 0 || n > 4) return 'unsupported DER length encoding';
    multibyte = true;
    for (let i = 0; i < n; i++) len = len * 256 + der[2 + i];
    off = 2 + n;
  } else {
    len = der[1];
  }
  const total = off + len;
  if (total !== der.length) return 'DER length mismatch: TLV declares ' + total + ' bytes but input is ' + der.length + ' (truncated or padded?)' + (multibyte ? '' : '');
  return null;
}

async function handleApi(request) {
  let input = '';
  if (request.method === 'POST') {
    const ct = (request.headers.get('Content-Type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      try { const j = await request.json(); input = typeof j.cert === 'string' ? j.cert : ''; }
      catch { return err400('Invalid JSON body'); }
    } else {
      input = await request.text();
    }
  } else {
    input = new URL(request.url).searchParams.get('cert') || '';
  }
  input = input.trim();
  if (!input) return err400("Missing 'cert' parameter: pass a PEM certificate (-----BEGIN CERTIFICATE-----...) or its base64 DER encoding");

  if (input.length > MAX_BYTES) return err400('Input too large (cap ' + MAX_BYTES + ' bytes)');

  let label = null, der = null;
  if (input.includes('-----BEGIN')) {
    const m = input.match(/-----BEGIN ([A-Z0-9 ]+)-----/);
    if (!m) return err400('Malformed PEM: no -----BEGIN <LABEL>----- header found');
    const end = input.match(/-----END [A-Z0-9 ]+-----/);
    if (!end) return err400('Malformed PEM: missing -----END marker');
    label = m[1];
    const body = input.slice(input.indexOf(m[0]) + m[0].length, input.indexOf(end[0]));
    der = b64decode(body);
    if (!der) return err400('PEM body is not valid base64');
  } else {
    der = b64decode(input);
    if (!der) return err400('Input is neither PEM (no BEGIN/END markers) nor valid base64');
  }

  const derErr = derCheck(der);
  if (derErr) return err400(derErr);

  const warnings = [];
  if (label && !/CERTIFICATE$/.test(label)) warnings.push("PEM label '" + label + "' is not a certificate label — computed the digest of the decoded payload anyway");

  const digests = {};
  for (const alg of ['SHA-1', 'SHA-256', 'SHA-512']) {
    const d = new Uint8Array(await crypto.subtle.digest(alg, der));
    digests[alg.toLowerCase().replace('-', '')] = { hex: toHex(d), colon: toColon(d) };
  }

  return Response.json({
    input: { kind: label ? 'pem' : 'base64-der', label, der_bytes: der.length },
    fingerprints: digests,
    ...(warnings.length ? { warnings } : {}),
  }, { headers: JSON_HEADERS });
}

const API_HELP = {
  endpoint: '/api',
  method: 'GET (query param) or POST (body / JSON {"cert": "..."})',
  params: { cert: 'PEM certificate (-----BEGIN CERTIFICATE-----...) or raw base64 DER' },
  returns: 'SHA-1 / SHA-256 / SHA-512 fingerprints as lowercase hex and AA:BB:.. colon form + DER byte count',
  example: 'curl -G "https://certificate-fingerprint-formatho.filesformatho.workers.dev/api" --data-urlencode "cert=-----BEGIN CERTIFICATE-----..."',
  privacy: 'No logging, no storage, computed at the edge and discarded',
};

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Certificate Fingerprint API — SHA-256 / SHA-1 / SHA-512 — Free &amp; Private</title>
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
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Certificate Fingerprint API — Free & Private",
  "url": "${HOST}/",
  "description": "${DESC}",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["SHA-1, SHA-256, SHA-512 fingerprints", "PEM or base64 DER input", "hex + colon output", "Zero tracking", "No signup required"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
  <h1>Certificate Fingerprint API — Free &amp; Private</h1>
  <p class="tagline">SHA-256 / SHA-1 / SHA-512 fingerprints of any X.509 certificate, computed at the edge. By <a href="https://formatho.com">formatho.com</a>.</p>
</header>
<div class="badges">
  <span class="badge">Free</span><span class="badge">No signup</span><span class="badge">CORS enabled</span><span class="badge">Zero tracking</span><span class="badge">GET + POST</span>
</div>

<h2>Compute a fingerprint</h2>
<pre>curl -G "${HOST}/api" \\
  --data-urlencode "cert=-----BEGIN CERTIFICATE-----
MIIB... your PEM ...-----END CERTIFICATE-----"</pre>

<p>Response (excerpt):</p>
<pre>{
  "input": { "kind": "pem", "label": "CERTIFICATE", "der_bytes": 466 },
  "fingerprints": {
    "sha256": {
      "hex": "b4053fcb0cf2ba795bc330496fe9a8c0...",
      "colon": "B4:05:3F:CB:0C:F2:BA:79:5B:C3:30:49:..."
    },
    "sha1":   { "hex": "e9701378...", "colon": "E9:70:13:78:..." },
    "sha512": { "hex": "...", "colon": "..." }
  }
}</pre>

<h2>POST JSON</h2>
<pre>curl -X POST "${HOST}/api" \\
  -H "Content-Type: application/json" \\
  -d '{"cert": "-----BEGIN CERTIFICATE-----..."}'</pre>

<p>Both endpoints accept a PEM certificate or its raw base64 DER encoding (fingerprint is computed over the DER bytes exactly like <code>openssl x509 -fingerprint</code>).</p>

<h2>Use cases</h2>
<ul>
  <li>Pin a certificate (HPKP-style pinning records, TLSA/SSHFP prep work)</li>
  <li>Verify a cert matches across environments without shipping the cert itself</li>
  <li>Extract pins for <code>Expect-CT</code> / mobile app SSL pinning lists</li>
</ul>

<h2>Clean errors</h2>
<ul>
  <li>Missing/garbled PEM, invalid base64 → <code>400</code> with the exact reason</li>
  <li>DER that is truncated or padded → <code>400</code> length mismatch message</li>
  <li>Non-certificate PEM labels (e.g. PRIVATE KEY) → still digested, with a warning</li>
</ul>

<div class="privacy"><strong>Privacy:</strong> the certificate never leaves the edge worker memory — no logging, no storage, no third parties. Prefer POST so the PEM stays out of access logs.</div>

<footer>
  <p>Full tool with copy buttons and history: <a href="${FULL_TOOL}">Certificate Fingerprint Checker on formatho.com</a> · More free APIs: <a href="https://formatho-tools.filesformatho.workers.dev">Formatho Tools index</a></p>
</footer>
</body>
</html>`;

const LLMS_TXT = `# Certificate Fingerprint API (formatho.com)

- URL: ${HOST}/
- Full tool: ${FULL_TOOL}
- API: ${HOST}/api
- Sitemap: ${HOST}/sitemap.xml
- Fleet index: https://formatho-tools.filesformatho.workers.dev
- Main site: https://formatho.com

Compute SHA-1/SHA-256/SHA-512 fingerprints of an X.509 certificate.
Input: PEM (any *CERTIFICATE label) or base64 DER, via GET ?cert= or POST JSON {"cert": "..."}.
Output: fingerprints in lowercase hex and AA:BB colon form + DER byte count.
Limits: 256KB. Privacy: zero tracking, computed at edge and discarded, prefer POST.`;

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
