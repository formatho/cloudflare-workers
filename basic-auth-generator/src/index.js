// Privacy-First Basic Auth Header Generator API — formatho.com
// RFC 7617 (HTTP Basic Authentication) — generate & decode Authorization headers.
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/basic-auth-generator';
const MAX_INPUT = 64 * 1024;

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function generate(user, password) {
  const credentials = `${user}:${password}`;
  const encoded = b64encode(credentials);
  return {
    scheme: 'Basic',
    header_name: 'Authorization',
    credentials,
    encoded,
    authorization_header: `Basic ${encoded}`,
    examples: {
      curl: `curl -H 'Authorization: Basic ${encoded}' https://api.example.com/`,
      javascript: `fetch(url, { headers: { Authorization: 'Basic ${encoded}' } })`,
      python: `requests.get(url, auth=('${user}', '${password}'))`,
    },
    rfc: 'RFC 7617 — the user-id/password pair is UTF-8 encoded, joined with ":" and base64-encoded.',
    privacy: 'Zero tracking, zero data collection',
    full_tool: FULL_TOOL,
  };
}

function decodeEncoded(encoded) {
  const s = String(encoded).trim().replace(/\s+/g, '');
  if (!s) return { error: 'Empty value' };
  if (s.length > MAX_INPUT) return { error: `Input too large (max ${MAX_INPUT} bytes)` };
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return { error: 'Not valid base64 (invalid characters or padding)' };
  let decoded;
  try {
    decoded = b64decode(s);
  } catch {
    return { error: 'Not valid base64, or not valid UTF-8 after decoding' };
  }
  const colon = decoded.indexOf(':');
  if (colon === -1) {
    return { valid: false, decoded, error: 'Decoded credentials contain no ":" separator — expected "user-id:password" (RFC 7617)' };
  }
  return {
    valid: true,
    user: decoded.slice(0, colon),
    password: decoded.slice(colon + 1),
    has_password: decoded.length > colon + 1,
    credentials: decoded,
    encoded: s,
    authorization_header: `Basic ${s}`,
    rfc: 'RFC 7617',
    privacy: 'Zero tracking, zero data collection',
    full_tool: FULL_TOOL,
  };
}

function parseHeader(header) {
  const s = String(header).trim();
  const m = /^Basic\s+([A-Za-z0-9+/=\s]+)$/i.exec(s);
  if (!m) return { error: 'Not a Basic Authorization header — expected "Basic <base64>"' };
  return decodeEncoded(m[1]);
}

function fail(message, status = 400) {
  return new Response(JSON.stringify({
    error: message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
  }, null, 2), { status, headers: JSON_HEADERS });
}

async function api(request) {
  try {
    const url = new URL(request.url);
    let mode = null, user, password, decode, header;

    if (request.method === 'POST') {
      const body = await request.text();
      if (body.length > MAX_INPUT) return fail(`Body too large (max ${MAX_INPUT} bytes)`);
      let json;
      try {
        json = JSON.parse(body || '{}');
      } catch {
        return fail('POST body must be JSON: {"user","password"} | {"decode":"<base64>"} | {"header":"Basic <base64>"}');
      }
      if (typeof json.header === 'string') { mode = 'header'; header = json.header; }
      else if (typeof json.decode === 'string') { mode = 'decode'; decode = json.decode; }
      else if (json.user !== undefined) { mode = 'generate'; user = String(json.user); password = json.password === undefined || json.password === null ? '' : String(json.password); }
      else return fail('Provide "user" (+ optional "password"), or "decode", or "header"');
    } else {
      user = url.searchParams.get('user');
      password = url.searchParams.get('password') ?? '';
      decode = url.searchParams.get('decode');
      header = url.searchParams.get('header');
      if (header) mode = 'header';
      else if (decode) mode = 'decode';
      else if (user !== null && user !== '') mode = 'generate';
      else if (user !== null) return fail('user-id must not be empty');
      else return fail('Provide ?user=&password= (generate), ?decode=<base64>, or ?header=Basic%20<base64>');
    }

    if (mode === 'generate') {
      if (user.includes(':')) return fail('user-id must not contain ":" — per RFC 7617 the first colon separates user-id from password');
      if (user.length > MAX_INPUT || String(password).length > MAX_INPUT) return fail(`Input too large (max ${MAX_INPUT} bytes)`);
      return new Response(JSON.stringify(generate(user, String(password)), null, 2), {
        headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
      });
    }
    if (mode === 'decode') {
      const r = decodeEncoded(decode);
      if (r.error) return fail(r.error);
      return new Response(JSON.stringify(r, null, 2), { headers: JSON_HEADERS });
    }
    const r = parseHeader(header);
    if (r.error) return fail(r.error);
    return new Response(JSON.stringify(r, null, 2), { headers: JSON_HEADERS });
  } catch (error) {
    return fail(error.message);
  }
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Basic Auth Header Generator Online — Free &amp; Private</title>
<meta name="description" content="Generate Basic Authentication headers instantly — user:password to base64 Authorization header and back. RFC 7617, Unicode-safe, with curl &amp; fetch examples. Free, zero tracking.">
<link rel="canonical" href="https://basic-auth-generator-formatho.filesformatho.workers.dev/">
<link rel="alternate" type="application/json" href="https://basic-auth-generator-formatho.filesformatho.workers.dev/api">
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
  "name": "Basic Auth Header Generator Online — Free & Private",
  "url": "https://basic-auth-generator-formatho.filesformatho.workers.dev/",
  "description": "Generate Basic Authentication headers instantly — user:password to base64 Authorization header and back. RFC 7617, Unicode-safe, with curl & fetch examples. Free, zero tracking.",
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
  <h1>Basic Auth Header Generator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl &quot;https://basic-auth-generator-formatho.filesformatho.workers.dev/api?user=admin&amp;password=secret&quot;</code></pre>
<pre><code>curl "https://basic-auth-generator-formatho.filesformatho.workers.dev/api?header=Basic%20YWRtaW46c2VjcmV0"</code></pre>
<pre><code>curl -X POST "https://basic-auth-generator-formatho.filesformatho.workers.dev/api" \
  -H "Content-Type: application/json" \
  -d '{"user":"admin","password":"secret"}'</code></pre>
<p>Full parameter reference and live response: <a href="https://basic-auth-generator-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<h2>What is Basic Authentication?</h2>
<p>HTTP Basic Authentication (RFC 7617) sends credentials with every request in the <code>Authorization</code> header. The user-id and password are joined with a colon (<code>user:password</code>), UTF-8 encoded, and base64-encoded — producing <code>Authorization: Basic YWRtaW46c2VjcmV0</code>. Base64 is encoding, not encryption: always use Basic Auth over HTTPS, prefer scoped tokens for third-party APIs, and never commit generated headers to source control.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection. See the <a href="https://formatho.com">Formatho privacy philosophy</a>.
</div>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — encoding happens right in your browser: <a href="https://formatho.com/tools/basic-auth-generator">Basic Auth Generator on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://basic-auth-generator-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://basic-auth-generator-formatho.filesformatho.workers.dev/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://basic-auth-generator-formatho.filesformatho.workers.dev/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

const LLMS_TXT = "# Basic Auth Header Generator Online — Free & Private\n\n> Generate Basic Authentication headers instantly — user:password to base64 Authorization header and back. RFC 7617, Unicode-safe, with curl & fetch examples. Free, privacy-first, zero tracking. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://basic-auth-generator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://basic-auth-generator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/basic-auth-generator\n- [All 40 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

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
