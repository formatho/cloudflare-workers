// Privacy-First AES Encryption API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://aes-encryption-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/encryption';
const MAX_BYTES = 131072; // 128 KB
const ITER_DEFAULT = 100000;
const ITER_MIN = 10000;
const ITER_MAX = 310000;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AES-256-GCM Encrypt &amp; Decrypt Online — Free &amp; Private</title>
<meta name="description" content="Encrypt text with AES-256-GCM and PBKDF2-SHA256 key derivation at the edge — free API with zero tracking. Decrypt back with your password. Full tool on formatho.com.">
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
  "name": "AES-256-GCM Encrypt & Decrypt Online — Free & Private",
  "url": "https://aes-encryption-formatho.filesformatho.workers.dev/",
  "description": "Encrypt text with AES-256-GCM and PBKDF2-SHA256 key derivation at the edge — free API with zero tracking. Decrypt back with your password. Full tool on formatho.com.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Free edge API",
    "Zero tracking",
    "No data collection",
    "No signup required"
  ],
  "publisher": {
    "@type": "Organization",
    "name": "Formatho",
    "url": "https://formatho.com"
  }
}
</script>
</head>
<body>
<header>
  <h1>AES-256-GCM Encrypt &amp; Decrypt Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># Encrypt
curl "${HOST}/api?text=secret%20message&amp;password=hunter2"

# Decrypt (pass the envelope back)
curl "${HOST}/api?envelope=%3Cbase64%3E&amp;password=hunter2&amp;mode=decrypt"

curl -X POST "${HOST}/api" \\
  -H 'Content-Type: application/json' \\
  -d '{"mode":"encrypt","text":"secret message","password":"hunter2","iterations":100000}'</code></pre>
<p>AES-256-GCM authenticated encryption; keys derived in-memory with PBKDF2-SHA256 (10,000–310,000 iterations, default 100,000) and a random 16-byte salt + 12-byte IV per call. The envelope embeds salt, IV and auth tag (<code>base64(salt ‖ iv ‖ ciphertext)</code>, or <code>hex</code> via <code>format</code>). Decrypt with the same password and iteration count. GET query limit 8 KB — POST for larger text (max 128 KB).</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> keys are derived in-memory at the edge, never cached, logged or stored — neither password nor plaintext appears in any response other than your decryption result.</div>
<h2>Full browser tool</h2>
<p>Encrypt &amp; decrypt entirely client-side: <a href="${FULL_TOOL}">Encryption tool on formatho.com</a>.</p>
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

// --- crypto helpers (Web Crypto only — PBKDF2-SHA256 + AES-256-GCM) ---

const TE = new TextEncoder();
const TD = new TextDecoder();

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(s) {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(s) {
  if (!/^[0-9a-fA-F]*$/.test(s) || s.length % 2) throw new Error('Invalid hex input');
  const bytes = new Uint8Array(s.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', TE.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function parseIterations(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n < ITER_MIN || n > ITER_MAX) {
    throw new Error(`Invalid iterations — integer ${ITER_MIN} to ${ITER_MAX}`);
  }
  return n;
}

// --- request handling ---

async function handleApi(request, url) {
  const q = (k) => url.searchParams.get(k);
  let mode, text, password, envelope, format, iterations;
  try {
    if (request.method === 'GET') {
      mode = q('mode') || undefined;
      text = q('text');
      password = q('password');
      envelope = q('envelope') ?? q('ciphertext');
      format = q('format') || 'base64';
      if ((text !== null && text.length > 8192) || (envelope !== null && envelope.length > 200000)) {
        return Response.json({ error: 'GET query params limited to 8 KB — POST instead' }, { status: 400, headers: JSON_HEADERS });
      }
    } else {
      const body = await request.json();
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return Response.json({ error: 'Body must be a JSON object: { "mode": "encrypt"|"decrypt", ... }' }, { status: 400, headers: JSON_HEADERS });
      }
      mode = body.mode;
      text = body.text !== undefined ? String(body.text) : null;
      password = body.password !== undefined ? String(body.password) : undefined;
      envelope = body.envelope ?? body.ciphertext ?? null;
      format = body.format || 'base64';
      iterations = body.iterations;
    }

    if (format !== 'base64' && format !== 'hex') {
      return Response.json({ error: 'Invalid format — use base64 or hex' }, { status: 400, headers: JSON_HEADERS });
    }
    if (mode === undefined) mode = envelope !== null && envelope !== undefined && !text ? 'decrypt' : 'encrypt';
    if (mode !== 'encrypt' && mode !== 'decrypt') {
      return Response.json({ error: 'Invalid mode — use encrypt or decrypt' }, { status: 400, headers: JSON_HEADERS });
    }
    if (password === undefined || password === '') {
      return Response.json({ error: 'Missing required parameter: password (non-empty)' }, { status: 400, headers: JSON_HEADERS });
    }
    if (password.length > 1024) {
      return Response.json({ error: 'Password limited to 1024 characters' }, { status: 400, headers: JSON_HEADERS });
    }
    let iter = ITER_DEFAULT;
    if (iterations !== undefined && iterations !== null) {
      try { iter = parseIterations(iterations); } catch (e) {
        return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS });
      }
    }

    if (mode === 'encrypt') {
      if (text === null || text === undefined) {
        return Response.json({ error: 'Missing required parameter: text' }, { status: 400, headers: JSON_HEADERS });
      }
      if (text.length > MAX_BYTES) {
        return Response.json({ error: `Text exceeds ${MAX_BYTES} byte limit` }, { status: 400, headers: JSON_HEADERS });
      }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt, iter);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, TE.encode(text)));
      const env = new Uint8Array(16 + 12 + ct.length);
      env.set(salt, 0); env.set(iv, 16); env.set(ct, 28);
      const enc = format === 'hex' ? toHex(env) : b64(env);
      return Response.json({
        ok: true,
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: iter,
        format,
        salt: format === 'hex' ? toHex(salt) : b64(salt),
        iv: format === 'hex' ? toHex(iv) : b64(iv),
        envelope: enc,
        plaintext_bytes: TE.encode(text).length,
        ciphertext_bytes: ct.length,
        note: 'envelope = salt(16) ‖ iv(12) ‖ ciphertext+tag — decrypt with the same password and iterations',
        decoded_by: 'Formatho edge API — zero tracking',
        full_tool: FULL_TOOL,
      }, { headers: JSON_HEADERS });
    }

    // decrypt
    if (envelope === null || envelope === undefined || envelope === '') {
      return Response.json({ error: 'Missing required parameter: envelope (from encrypt output)' }, { status: 400, headers: JSON_HEADERS });
    }
    if (envelope.length > 400000) {
      return Response.json({ error: 'Envelope exceeds size limit' }, { status: 400, headers: JSON_HEADERS });
    }
    let env;
    try {
      env = format === 'hex' ? fromHex(envelope) : unb64(envelope);
    } catch (e) {
      return Response.json({ error: `Invalid ${format} input — ${e.message}` }, { status: 400, headers: JSON_HEADERS });
    }
    if (env.length < 28 + 16) {
      return Response.json({ error: `Envelope too short (${env.length} bytes) — expected salt(16) ‖ iv(12) ‖ ciphertext+tag(≥16)` }, { status: 400, headers: JSON_HEADERS });
    }
    const salt = env.slice(0, 16);
    const iv = env.slice(16, 28);
    const ct = env.slice(28);
    const key = await deriveKey(password, salt, iter);
    let plain;
    try {
      plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    } catch {
      return Response.json({ error: 'Decryption failed — wrong password, wrong iteration count, or corrupted input' }, { status: 400, headers: JSON_HEADERS });
    }
    return Response.json({
      ok: true,
      verified: true,
      algorithm: 'AES-256-GCM',
      iterations: iter,
      plaintext: TD.decode(plain),
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    }, { headers: JSON_HEADERS });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400, headers: JSON_HEADERS });
    }
    return Response.json({ error: 'Bad request — check mode, text/envelope, password, format, iterations' }, { status: 400, headers: JSON_HEADERS });
  }
}

const LLMS_TXT = "# AES-256-GCM Encrypt & Decrypt Online — Free & Private\n\n> Encrypt text with AES-256-GCM and PBKDF2-SHA256 key derivation at the edge — free API with zero tracking. Decrypt back with your password. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://aes-encryption-formatho.filesformatho.workers.dev/\n- [JSON API]: https://aes-encryption-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/encryption\n- [All 49 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (url.pathname === '/api' && request.method === 'GET' && ![...url.searchParams.keys()].length) {
      return Response.json({
        usage: 'GET /api?text=...&password=...  |  GET /api?envelope=...&password=...&mode=decrypt  |  POST /api {"mode":"encrypt|decrypt","text|envelope":"...","password":"...","format":"base64|hex","iterations":100000}',
        params: {
          mode: 'encrypt (default when text given) | decrypt (default when only envelope given)',
          text: 'plaintext to encrypt (max 128 KB)',
          envelope: 'encrypt output — salt ‖ iv ‖ ciphertext+tag',
          password: 'required, 1-1024 chars; derives the key via PBKDF2-SHA256',
          format: 'base64 (default) | hex',
          iterations: 'PBKDF2 iterations 10000-310000, default 100000 — must match between encrypt and decrypt',
        },
        example: `curl "${HOST}/api?text=secret%20message&password=hunter2"`,
      }, { headers: JSON_HEADERS });
    }
    if (url.pathname === '/api') return handleApi(request, url);
    if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
