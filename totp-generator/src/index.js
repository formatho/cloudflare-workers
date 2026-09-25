// Privacy-First TOTP / HOTP Code Generator API (RFC 6238 / RFC 4226) — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://totp-generator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/otp-code-generator';
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TOTP Code Generator Online (RFC 6238) — Free &amp; Private API</title>
<meta name="description" content="Generate TOTP / 2FA codes from a base32 secret — RFC 6238 SHA-1/SHA-256/SHA-512, 6-8 digits, otpauth:// URLs. Free, zero tracking. Full tool on formatho.com.">
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
</head>
<body>
<header>
  <h1>TOTP Code Generator Online — Free &amp; Private API</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?secret=JBSWY3DPEHPK3PXP"</code></pre>
<p>Optional parameters: <code>algorithm</code> (sha1 | sha256 | sha512, default sha1),
<code>digits</code> (6–8, default 6), <code>period</code> (seconds, default 30),
<code>time</code> (unix seconds, default now), or a direct HOTP <code>counter</code>.
You can also pass a full <code>otpauth://</code> URL via <code>?url=otpauth%3A%2F%2Ftotp%2F…</code>
— type, label, issuer and parameters are parsed automatically.</p>
<p>The response includes the current code plus previous/next window codes and seconds
until the code rotates — handy for testing 2FA flows. The secret is never echoed back.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> codes are computed in-memory at the edge; your secret is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Generate codes entirely client-side: <a href="${FULL_TOOL}">OTP Code Generator on formatho.com</a>.</p>
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

function bad(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

function base32Decode(s) {
  const clean = s.replace(/[=\s-]/g, '').toUpperCase();
  if (!clean.length) throw new Error('Secret is empty');
  let bits = 0, val = 0;
  const bytes = [];
  for (const c of clean) {
    const d = BASE32.indexOf(c);
    if (d < 0) throw new Error(`Invalid base32 character "${c}" in secret`);
    val = (val << 5) | d;
    bits += 5;
    if (bits >= 8) {
      bytes.push((val >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (bits > 0 && (val & ((1 << bits) - 1)) !== 0) {
    throw new Error('Base32 secret is not byte-aligned — check for a truncated secret');
  }
  return new Uint8Array(bytes);
}

async function hotp(keyBytes, counter, algo, digits) {
  const ctr = new ArrayBuffer(8);
  const dv = new DataView(ctr);
  dv.setUint32(0, Math.floor(counter / 2 ** 32));
  dv.setUint32(4, counter >>> 0);
  const hashName = { sha1: 'SHA-1', sha256: 'SHA-256', sha512: 'SHA-512' }[algo];
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: { name: hashName } }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, ctr));
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}

function parseOtpauth(u) {
  let parsed;
  try { parsed = new URL(u); } catch { throw new Error('Invalid otpauth URL'); }
  if (parsed.protocol !== 'otpauth:') throw new Error('URL must be an otpauth:// URL');
  const type = parsed.host.toLowerCase();
  if (type !== 'totp' && type !== 'hotp') throw new Error(`Unsupported otpauth type "${parsed.host}" (use totp or hotp)`);
  const label = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  let issuer = '';
  const params = parsed.searchParams;
  const secret = params.get('secret');
  if (!secret) throw new Error('otpauth URL is missing a secret parameter');
  if (label.includes(':')) { const [i2, ...rest] = label.split(':'); issuer = i2.trim(); }
  else if (params.get('issuer')) issuer = params.get('issuer');
  return { type, label, issuer, secret, algorithm: params.get('algorithm'), digits: params.get('digits'), period: params.get('period'), counter: params.get('counter') };
}

async function handleApi(request) {
  const url = new URL(request.url);
  const q = url.searchParams;

  let secret = q.get('secret');
  let algorithm = (q.get('algorithm') || 'sha1').toLowerCase();
  let digits = q.get('digits') || '6';
  let period = q.get('period') || '30';
  let time = q.get('time');
  let counterParam = q.get('counter');
  let mode = 'totp';
  let issuer = null, label = null;

  const otpauthUrl = q.get('url');
  if (otpauthUrl) {
    let o;
    try { o = parseOtpauth(otpauthUrl); } catch (e) { return bad(e.message); }
    mode = o.type;
    if (secret && o.secret !== secret) return bad('secret parameter conflicts with the otpauth URL secret');
    secret = o.secret;
    if (o.algorithm) algorithm = o.algorithm.toLowerCase();
    if (o.digits) digits = o.digits;
    if (o.period) period = o.period;
    if (o.counter) counterParam = o.counter;
    issuer = o.issuer || null;
    label = o.label || null;
  }

  if (!secret) return bad('Missing required parameter: secret (base32) or url (otpauth://)');
  if (!['sha1', 'sha256', 'sha512'].includes(algorithm)) return bad(`Unsupported algorithm "${algorithm}" — use sha1, sha256 or sha512`);
  const d = Number.parseInt(digits, 10);
  if (!Number.isInteger(d) || d < 6 || d > 8) return bad(`Invalid digits "${digits}" — use 6, 7 or 8`);
  const p = Number.parseInt(period, 10);
  if (!Number.isInteger(p) || p < 1 || p > 86400) return bad(`Invalid period "${period}" — use 1 to 86400 seconds`);

  let nowSec;
  if (time !== null) {
    nowSec = Number.parseInt(time, 10);
    if (!Number.isInteger(nowSec) || nowSec < 0 || nowSec > 281474976710655) return bad(`Invalid time "${time}" — use unix seconds between 0 and 281474976710655`);
  } else {
    nowSec = Math.floor(Date.now() / 1000);
  }

  let counter, counterGiven;
  if (counterParam !== null) {
    counter = Number.parseInt(counterParam, 10);
    if (!Number.isInteger(counter) || counter < 0 || counter > 2 ** 47) return bad(`Invalid counter "${counterParam}"`);
    counterGiven = true;
    if (mode === 'totp' && !otpauthUrl) mode = 'hotp'; // explicit counter ⇒ one-time code
  } else {
    if (mode === 'hotp') return bad('HOTP requires a counter parameter');
    counter = Math.floor(nowSec / p);
    counterGiven = false;
  }

  let keyBytes;
  try { keyBytes = base32Decode(secret); } catch (e) { return bad(e.message); }
  if (!keyBytes.length) return bad('Secret decodes to zero bytes');

  try {
    const code = await hotp(keyBytes, counter, algorithm, d);
    const body = {
      type: mode,
      code,
      algorithm,
      digits: d,
      counter,
      time: nowSec,
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    };
    if (issuer) body.issuer = issuer;
    if (label) body.label = label;
    if (!counterGiven) {
      body.period = p;
      body.expires_in = p - (nowSec % p);
      body.prev_code = await hotp(keyBytes, counter - 1, algorithm, d);
      body.next_code = await hotp(keyBytes, counter + 1, algorithm, d);
    }
    return Response.json(body, { headers: JSON_HEADERS });
  } catch (e) {
    return Response.json({ error: 'Code generation failed', detail: String(e.message || e) }, { status: 400, headers: JSON_HEADERS });
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api') {
      if (request.method !== 'GET') return Response.json({ error: 'Method not allowed. Use GET.' }, { status: 405, headers: { ...JSON_HEADERS, Allow: 'GET' } });
      return handleApi(request);
    }
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
