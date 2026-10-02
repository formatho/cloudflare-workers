// Privacy-First JWT Generator (Sign & Verify) API — formatho.com
// RFC 7519 JSON Web Tokens — HS256/HS384/HS512 via Web Crypto HMAC.
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/jwt';
const ALGS = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
const MAX_TOKEN = 16 * 1024;
const MAX_PAYLOAD = 64 * 1024;

const enc = new TextEncoder();

function b64urlFromBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s) {
  const norm = String(s).replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlDecodeStr(s) {
  return new TextDecoder('utf-8', { fatal: true }).decode(b64urlToBytes(s));
}

async function hmac(alg, secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: ALGS[alg] }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function parseJsonObject(str, what) {
  let v;
  try {
    v = JSON.parse(str);
  } catch {
    throw new Error(`${what} is not valid JSON`);
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new Error(`${what} must be a JSON object`);
  }
  return v;
}

function normalizeAlg(alg) {
  const a = String(alg || 'HS256').trim().toUpperCase();
  if (a === 'NONE') throw new Error('alg "none" (unsigned tokens) is not supported — HS256/HS384/HS512 only');
  if (!ALGS[a]) throw new Error(`Unsupported algorithm "${a}" — supported: HS256, HS384, HS512 (symmetric HMAC)`);
  return a;
}

async function signToken(secret, alg, payloadRaw, headerRaw, expIn) {
  const payload = parseJsonObject(payloadRaw, 'payload');
  if (payloadRaw.length > MAX_PAYLOAD) throw new Error(`payload too large (max ${MAX_PAYLOAD} bytes)`);
  const now = Math.floor(Date.now() / 1000);
  if (expIn !== undefined) {
    const secs = Number(expIn);
    if (!Number.isFinite(secs) || secs < 1 || secs > 315360000) throw new Error('exp_in must be seconds between 1 and 315360000 (10 years)');
    if (payload.exp === undefined) payload.exp = now + secs;
    if (payload.iat === undefined) payload.iat = now;
  }
  const header = { alg, typ: 'JWT' };
  if (headerRaw !== undefined && headerRaw !== '') Object.assign(header, parseJsonObject(headerRaw, 'header'));
  header.alg = alg; // cannot be overridden

  const h = b64urlFromBytes(enc.encode(JSON.stringify(header)));
  const p = b64urlFromBytes(enc.encode(JSON.stringify(payload)));
  const sig = await hmac(alg, secret, `${h}.${p}`);
  const token = `${h}.${p}.${b64urlFromBytes(sig)}`;
  return {
    token,
    token_parts: { header: h, payload: p, signature: b64urlFromBytes(sig) },
    header,
    payload,
    algorithm: alg,
    privacy: 'Zero tracking, zero data collection',
    full_tool: FULL_TOOL,
  };
}

async function verifyToken(token, secret) {
  if (typeof token !== 'string' || !token) return { valid: false, reason: 'Missing token' };
  if (token.length > MAX_TOKEN) return { valid: false, reason: `Token too large (max ${MAX_TOKEN} bytes)` };
  const parts = token.trim().split('.');
  if (parts.length !== 3) return { valid: false, reason: 'A JWT must have exactly 3 dot-separated segments (header.payload.signature)' };
  const [h, p, s] = parts;

  let header, payload;
  try {
    header = parseJsonObject(b64urlDecodeStr(h), 'header');
  } catch (e) {
    return { valid: false, reason: `Header segment is not valid base64url JSON: ${e.message}` };
  }
  try {
    payload = parseJsonObject(b64urlDecodeStr(p), 'payload');
  } catch (e) {
    return { valid: false, reason: `Payload segment is not valid base64url JSON: ${e.message}` };
  }

  const out = {
    header, payload,
    algorithm: header.alg,
    privacy: 'Zero tracking, zero data collection',
    full_tool: FULL_TOOL,
  };

  if (!ALGS[header.alg]) {
    return { ...out, valid: false, reason: `Unsupported alg "${header.alg}" — only symmetric HS256/HS384/HS512 can be verified with a shared secret` };
  }
  if (!secret) return { ...out, valid: false, reason: 'Missing secret' };

  let expected, got;
  try {
    expected = await hmac(header.alg, secret, `${h}.${p}`);
    got = b64urlToBytes(s);
  } catch {
    return { ...out, valid: false, reason: 'Signature segment is not valid base64url' };
  }
  const signature_valid = constantTimeEqual(expected, got);

  const now = Math.floor(Date.now() / 1000);
  const checks = { signature: signature_valid };
  let reason = null;
  if (!signature_valid) reason = 'Signature does not match (wrong secret or tampered token)';
  if (typeof payload.exp === 'number' && now >= payload.exp) {
    checks.expired = true;
    if (!reason) reason = `Token expired at Unix ${payload.exp} (${new Date(payload.exp * 1000).toISOString()})`;
  } else if (typeof payload.exp === 'number') {
    checks.expired = false;
    checks.expires_in = payload.exp - now;
  }
  if (typeof payload.nbf === 'number' && now < payload.nbf) {
    checks.not_yet_valid = true;
    if (!reason) reason = `Token not valid before Unix ${payload.nbf}`;
  }
  if (typeof payload.iat === 'number' && payload.iat > now + 60) {
    checks.iat_in_future = true;
  }
  return { ...out, valid: !reason, reason, checks };
}

function fail(message, status = 400) {
  return new Response(JSON.stringify({
    error: message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
  }, null, 2), { status, headers: JSON_HEADERS });
}

async function api(request) {
  try {
    const url = new URL(request.url);
    if (request.method === 'POST') {
      const body = await request.text();
      if (body.length > MAX_TOKEN + MAX_PAYLOAD + 1024) return fail('Body too large');
      let json;
      try {
        json = JSON.parse(body || '{}');
      } catch {
        return fail('POST body must be JSON: sign {"secret","payload","alg"?,"exp_in"?} or verify {"token","secret"}');
      }
      if (typeof json.token === 'string') {
        if (!json.secret) return fail('Missing secret for verification');
        const r = await verifyToken(json.token, String(json.secret));
        return new Response(JSON.stringify(r, null, 2), { headers: JSON_HEADERS });
      }
      const secret = String(json.secret || '');
      if (!secret) return fail('Missing secret');
      if (secret.length > MAX_TOKEN) return fail('Secret too large');
      let alg; try { alg = normalizeAlg(json.alg); } catch (e) { return fail(e.message); }
      const payload = typeof json.payload === 'string' ? json.payload : (json.payload === undefined ? '{}' : JSON.stringify(json.payload));
      const header = json.header === undefined ? '' : (typeof json.header === 'string' ? json.header : JSON.stringify(json.header));
      const r = await signToken(secret, alg, payload, header, json.exp_in);
      return new Response(JSON.stringify(r, null, 2), { headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } });
    }

    const token = url.searchParams.get('token');
    if (token) {
      const secret = url.searchParams.get('secret');
      if (!secret) return fail('Missing secret for verification (?secret=)');
      const r = await verifyToken(token, secret);
      return new Response(JSON.stringify(r, null, 2), { headers: JSON_HEADERS });
    }

    const secret = url.searchParams.get('secret');
    if (!secret) return fail('Provide ?secret=&payload= to sign, or ?token=&secret= to verify');
    let alg; try { alg = normalizeAlg(url.searchParams.get('alg')); } catch (e) { return fail(e.message); }
    const payload = url.searchParams.get('payload') || '{}';
    const header = url.searchParams.get('header') || '';
    const expIn = url.searchParams.has('exp_in') ? url.searchParams.get('exp_in') : undefined;
    const r = await signToken(secret, alg, payload, header, expIn);
    return new Response(JSON.stringify(r, null, 2), { headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return fail(error.message);
  }
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JWT Generator Online — Sign &amp; Verify HS256 — Free &amp; Private</title>
<meta name="description" content="Create and verify JSON Web Tokens instantly — sign custom claims with HS256/HS384/HS512, add expiry, check signatures &amp; exp/nbf. Free, privacy-first, zero tracking.">
<link rel="canonical" href="https://jwt-generator-formatho.filesformatho.workers.dev/">
<link rel="alternate" type="application/json" href="https://jwt-generator-formatho.filesformatho.workers.dev/api">
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
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "JWT Generator Online — Sign & Verify HS256 — Free & Private",
  "url": "https://jwt-generator-formatho.filesformatho.workers.dev/",
  "description": "Create and verify JSON Web Tokens instantly — sign custom claims with HS256/HS384/HS512, add expiry, check signatures & exp/nbf. Free, privacy-first, zero tracking.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["Free edge API", "Zero tracking", "No data collection", "No signup required"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
  <h1>JWT Generator Online — Sign &amp; Verify HS256 — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl &quot;https://jwt-generator-formatho.filesformatho.workers.dev/api?secret=your-256-bit-secret&amp;payload=%7B%22sub%22%3A%22123%22%7D&amp;exp_in=3600&quot;</code></pre>
<pre><code>curl -X POST "https://jwt-generator-formatho.filesformatho.workers.dev/api" \
  -H "Content-Type: application/json" \
  -d '{"secret":"s3cr3t","payload":{"sub":"user-1","role":"admin"},"exp_in":3600}'</code></pre>
<pre><code>curl "https://jwt-generator-formatho.filesformatho.workers.dev/api?token=eyJhbGciOiJIUzI1NiJ9...&amp;secret=s3cr3t"</code></pre>
<p>Full parameter reference and live response: <a href="https://jwt-generator-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<h2>What is a JWT?</h2>
<p>A JSON Web Token (RFC 7519) is a compact, URL-safe way to represent signed claims between two parties. It has three base64url segments — <code>header.payload.signature</code> — where the header names the algorithm, the payload carries claims like <code>sub</code>, <code>exp</code> or <code>role</code>, and the HMAC signature proves the token was created by someone holding the secret. This tool signs and verifies symmetric HS256/HS384/HS512 tokens with the Web Crypto API on the edge; for production, prefer short expiry times and long random secrets.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. See the <a href="https://formatho.com">Formatho privacy philosophy</a>.
</div>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — signing happens right in your browser: <a href="https://formatho.com/tools/jwt">JWT suite on formatho.com</a>. Just need to read a token? See the <a href="https://jwt-decoder-formatho.filesformatho.workers.dev/">JWT Decoder</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://jwt-generator-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://jwt-generator-formatho.filesformatho.workers.dev/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://jwt-generator-formatho.filesformatho.workers.dev/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

const LLMS_TXT = "# JWT Generator Online — Sign & Verify HS256 — Free & Private\n\n> Create and verify JSON Web Tokens instantly — sign custom claims with HS256/HS384/HS512, add expiry, check signatures & exp/nbf. Free, privacy-first, zero tracking. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://jwt-generator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://jwt-generator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/jwt\n- [All 40 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/sitemap.xml') {
      return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/api' || url.pathname === '/api/') {
      return api(request);
    }
    if (url.pathname === '/') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Privacy-Policy': 'Zero tracking, zero data collection' } });
    }
    return new Response('Not found. See <a href="/">the tool page</a> or <a href="/api">/api</a>.', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
