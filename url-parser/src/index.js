// Privacy-First URL Parser API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://url-parser-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/url-parser';

const DEFAULT_PORTS = { 'http:': '80', 'https:': '443', 'ftp:': '21', 'ws:': '80', 'wss:': '443' };

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>URL Parser Online — Break Any URL Into Its Components — Free &amp; Private</title>
<meta name="description" content="Parse any URL into protocol, host, port, path, query params and hash as JSON — free, privacy-first edge API with zero tracking. Full tool on formatho.com.">
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
  <h1>URL Parser Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?url=https%3A%2F%2Fuser%40example.com%3A8443%2Fpath%2Fto%2Fpage%3Fq%3Ddev%20tools%26page%3D2%23section"</code></pre>
<p>Returns protocol, credentials, hostname, port (explicit + effective), pathname, query parameters as an array and an object, hash, origin, and subdomain/TLD hints — all in one JSON response. Full reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> URLs are parsed in-memory at the edge and never logged, stored, or fetched.</div>
<h2>Full browser tool</h2>
<p>Parse URLs entirely client-side: <a href="${FULL_TOOL}">URL Parser on formatho.com</a>.</p>
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

function isPrivateIp(hostname) {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [+m[1], +m[2]];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }
  return /^(localhost|.*\.local|.*\.internal|.*\.localdomain)(\.|)$/i.test(hostname);
}

function parseUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return bad(`Invalid URL: "${String(raw).slice(0, 200)}". Include the scheme, e.g. https://example.com/path`);
  }
  if (!/^https?:$|^ftp:$|^wss?:$|^file:$/i.test(u.protocol)) {
    // still allow any scheme the WHATWG parser accepts, but flag non-web ones
  }

  const params = [];
  for (const [key, value] of u.searchParams.entries()) params.push({ key, value });
  const paramsObject = {};
  for (const { key, value } of params) {
    paramsObject[key] = key in paramsObject
      ? (Array.isArray(paramsObject[key]) ? [...paramsObject[key], value] : [paramsObject[key], value])
      : value;
  }

  const labels = u.hostname.split('.').filter(Boolean);
  const tld = labels.length > 1 ? labels[labels.length - 1] : null;
  // Heuristic (no public-suffix list): all labels left after removing the last two.
  // For co.uk-style TLDs this includes the registry second level (e.g. "co").
  const subdomainCandidates = labels.length > 2 ? labels.slice(0, labels.length - 2) : [];
  const port = u.port || DEFAULT_PORTS[u.protocol] || null;

  return Response.json({
    input: raw,
    protocol: u.protocol.replace(':', ''),
    scheme: u.protocol,
    username: u.username || null,
    password: u.password ? '***' : null,
    has_credentials: Boolean(u.username),
    hostname: u.hostname,
    port: u.port || null,
    effective_port: port,
    default_port: !u.port,
    pathname: u.pathname,
    search: u.search || null,
    query_params: params,
    query_params_object: paramsObject,
    hash: u.hash ? u.hash.slice(1) : null,
    origin: u.origin === 'null' ? null : u.origin,
    subdomain_candidates: subdomainCandidates.length ? subdomainCandidates : [],
    tld: tld,
    is_ip_address: /^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname),
    is_private_or_local: isPrivateIp(u.hostname.toLowerCase()),
    url_length: raw.length,
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

function handleApi(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) return bad('Missing required parameter: url (URL-encoded), e.g. ?url=https%3A%2F%2Fexample.com%2Fpath');
  if (target.length > 8192) return bad('url too large (max 8KB)');
  return parseUrl(target);
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
