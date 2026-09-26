// Privacy-First JWT Decoder API — formatho.com
// No tracking, no data collection, no external API calls.
// Note: decodes header/payload only (no signature verification — that requires the secret).

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://jwt-decoder-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/jwt';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JWT Decoder Online — Free &amp; Private | Formatho</title>
<meta name="description" content="Decode JWT header and payload claims instantly at the edge — free, privacy-first, zero tracking. Full browser-side JWT debugger on formatho.com.">
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
  <h1>JWT Decoder Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?token=eyJhbGciOi..."</code></pre>
<p>Returns the decoded header, payload, and a claims summary (exp / iat / nbf as human dates). Signature is <strong>not verified</strong> — decoding happens without the secret, so treat outputs as untrusted.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> tokens are decoded in-memory on Cloudflare's edge and never logged. For secrets, use the client-side tool where nothing leaves your browser.</div>
<h2>Full browser tool</h2>
<p>Decode and debug JWTs entirely client-side: <a href="${FULL_TOOL}">JWT Debugger on formatho.com</a>.</p>
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

function b64urlDecodeJson(seg) {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function handleApi(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return Response.json({ error: 'Missing required parameter: token' }, { status: 400, headers: JSON_HEADERS });
  }
  const parts = token.trim().split('.');
  if (parts.length < 2 || parts.length > 3 || !parts[0] || !parts[1]) {
    return Response.json({ error: 'Invalid JWT: expected header.payload.signature' }, { status: 400, headers: JSON_HEADERS });
  }
  let header, payload;
  try {
    header = b64urlDecodeJson(parts[0]);
    payload = b64urlDecodeJson(parts[1]);
  } catch {
    return Response.json({ error: 'Invalid JWT: segments are not valid base64url JSON' }, { status: 400, headers: JSON_HEADERS });
  }
  const claims = {};
  for (const k of ['exp', 'iat', 'nbf', 'auth_time']) {
    if (typeof payload[k] === 'number') claims[k] = { unix: payload[k], human: new Date(payload[k] * 1000).toISOString() };
  }
  const now = Math.floor(Date.now() / 1000);
  return Response.json({
    header,
    payload,
    claims,
    signature: parts[2] || null,
    signature_verified: false,
    expired: typeof payload.exp === 'number' ? payload.exp < now : null,
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
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
