// Privacy-First HMAC Generator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://hmac-generator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/hmac-generator';

const ALGORITHMS = {
  'SHA-1': 'SHA-1',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512',
};

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HMAC Generator Online (SHA-256, SHA-1, SHA-384, SHA-512) — Free &amp; Private</title>
<meta name="description" content="Generate HMAC signatures with SHA-256, SHA-1, SHA-384 or SHA-512 — free, privacy-first edge API, zero tracking. Hex or Base64 output. Full tool on formatho.com.">
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
  <h1>HMAC Generator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No key storage</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?data=hello&amp;key=secret&amp;alg=SHA-256"
curl -X POST "${HOST}/api" -H "Content-Type: application/json" \\
  -d '{"data":"hello","key":"secret","alg":"SHA-512","encoding":"base64"}'</code></pre>
<p>Parameters: <code>data</code> (message, required), <code>key</code> (secret, required), <code>alg</code> (SHA-256 default; SHA-1, SHA-384, SHA-512), <code>encoding</code> (hex default or base64). Returns the HMAC digest plus metadata. Full reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> HMAC is computed in-memory at the edge with the Web Crypto API; your message and secret are never logged, stored, or sent anywhere else.</div>
<h2>Full browser tool</h2>
<p>HMAC signing entirely client-side: <a href="${FULL_TOOL}">HMAC Generator on formatho.com</a>.</p>
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

function bad(message) {
  return Response.json({ error: message }, { status: 400, headers: JSON_HEADERS });
}

async function computeHmac({ data, key, alg, encoding }) {
  if (data === undefined || data === null) return bad('Missing required parameter: data');
  if (key === undefined || key === null) return bad('Missing required parameter: key');
  if (typeof data !== 'string' || typeof key !== 'string') return bad('data and key must be strings');
  if (data.length > 256 * 1024) return bad('data too large (max 256KB)');
  if (key.length > 8 * 1024) return bad('key too large (max 8KB)');
  if (!data.length) return bad('data must not be empty');
  if (!key.length) return bad('key must not be empty');

  const algKey = (alg === undefined || alg === null) ? 'SHA-256' : String(alg).toUpperCase().replace(/_/g, '-');
  const normalized = ALGORITHMS[algKey];
  if (!normalized) return bad(`Unsupported algorithm "${alg}". Supported: ${Object.keys(ALGORITHMS).join(', ')}`);

  let outEncoding = (encoding === undefined || encoding === null) ? 'hex' : String(encoding).toLowerCase();
  if (outEncoding !== 'hex' && outEncoding !== 'base64') return bad('encoding must be "hex" or "base64"');

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: normalized }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  const bytes = new Uint8Array(signature);

  let digest;
  if (outEncoding === 'hex') {
    digest = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    digest = btoa(bin);
  }

  return Response.json({
    algorithm: `HMAC-${normalized}`,
    encoding: outEncoding,
    digest,
    digest_length_bytes: bytes.length,
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

async function handleApi(request) {
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid JSON body');
    }
    return computeHmac(body || {});
  }
  if (request.method !== 'GET') return bad('Method not allowed. Use GET or POST.');
  const url = new URL(request.url);
  return computeHmac({
    data: url.searchParams.get('data') ?? undefined,
    key: url.searchParams.get('key') ?? undefined,
    alg: url.searchParams.get('alg') ?? undefined,
    encoding: url.searchParams.get('encoding') ?? undefined,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
