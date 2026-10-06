// Privacy-First CSP (Content-Security-Policy) Generator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://csp-generator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/csp-generator';

const FETCH_DIRECTIVES = new Set(['default-src', 'script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr', 'img-src', 'font-src', 'connect-src', 'media-src', 'frame-src', 'object-src', 'child-src', 'worker-src', 'manifest-src', 'prefetch-src']);
const OTHER_DIRECTIVES = new Set(['base-uri', 'form-action', 'frame-ancestors', 'navigate-to', 'sandbox', 'plugin-types', 'report-uri', 'report-to', 'require-trusted-types-for', 'trusted-types', 'upgrade-insecure-requests', 'block-all-mixed-content', 'disown-opener']);
const ALL_DIRECTIVES = new Set([...FETCH_DIRECTIVES, ...OTHER_DIRECTIVES]);
const KEYWORD_SOURCES = new Set(["'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "'unsafe-allow-redirects'", "'strict-dynamic'", "'report-sample'", "'wasm-unsafe-eval'", "'allow'"]);
const SANDBOX_TOKENS = new Set(['allow-downloads', 'allow-forms', 'allow-modals', 'allow-orientation-lock', 'allow-pointer-lock', 'allow-popups', 'allow-popups-to-escape-sandbox', 'allow-presentation', 'allow-same-origin', 'allow-scripts', 'allow-storage-access-by-user-activation', 'allow-top-navigation', 'allow-top-navigation-by-user-activation', 'allow-top-navigation-to-custom-protocols']);
// host-source: optional scheme://, optional *., host or *, optional :port|:*, optional /path — no whitespace, quotes or ;
const HOST_RE = /^(?:(?:https?|wss?|ftp|chrome-extension|moz-extension):\/\/)?(?:\*\.)?(?:\*|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)?(?::(?:\d+|\*))?(?:\/[^\s'"`;]*)?$/;
const SCHEME_RE = /^(?:https?|wss?|ftp|data|blob|filesystem|mediastream|mailto|tel|file|chrome-extension|moz-extension):$/;
const NONCE_RE = /^'nonce-[A-Za-z0-9+/_-]+={0,2}'$/;
const HASH_RE = /^'(?:sha256|sha384|sha512)-[A-Za-z0-9+/]+={0,2}'$/;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CSP Header Generator Online — Free &amp; Private</title>
<meta name="description" content="Generate Content-Security-Policy headers from directives with a free, privacy-first edge API. Token validation, best-practice warnings, report-only mode. Zero tracking.">
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
  "name": "CSP Header Generator Online — Free & Private",
  "url": "https://csp-generator-formatho.filesformatho.workers.dev/",
  "description": "Generate Content-Security-Policy headers from directives with a free, privacy-first edge API. Token validation, best-practice warnings, report-only mode. Zero tracking.",
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
  <h1>CSP Header Generator — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — enforce mode</h2>
<pre><code>curl "${HOST}/api?default-src=self&amp;script-src=self+cdn.example.com&amp;base-uri=self"</code></pre>
<p>Any query parameter is treated as a directive name; values are space- or comma-separated tokens. Returns the canonical <code>Content-Security-Policy</code> header value plus best-practice warnings.</p>
<h2>Usage — report-only mode</h2>
<pre><code>curl "${HOST}/api?default-src=self&amp;report-only=true&amp;report-to=csp-endpoint"</code></pre>
<p>Emits <code>Content-Security-Policy-Report-Only</code> so you can trial a policy before enforcing it.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> generation runs in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Build policies with a full UI: <a href="${FULL_TOOL}">CSP Generator on formatho.com</a>.</p>
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

const LLMS_TXT = "# CSP Header Generator Online — Free & Private\n\n> Generate Content-Security-Policy headers from directives with a free, privacy-first edge API. Token validation, best-practice warnings, report-only mode. Zero tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://csp-generator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://csp-generator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/csp-generator\n- [All 49 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

const BARE_KEYWORDS = new Set(['self', 'none', 'unsafe-inline', 'unsafe-eval', 'unsafe-hashes', 'unsafe-allow-redirects', 'strict-dynamic', 'report-sample', 'wasm-unsafe-eval', 'allow']);
function normalizeToken(t) {
  // Convenience: accept bare self/none/unsafe-inline… and bare nonce-/hash- tokens; the spec requires quotes.
  if (BARE_KEYWORDS.has(t)) return `'${t}'`;
  if (/^nonce-[A-Za-z0-9+/_=-]+$/.test(t) || /^(?:sha256|sha384|sha512)-[A-Za-z0-9+/=-]+$/.test(t)) return `'${t}'`;
  return t;
}

function validateToken(tok, directive) {
  if (/[\u0000-\u001F\u007F]/.test(tok) || tok.includes(';') || tok.includes("'") && !KEYWORD_SOURCES.has(tok) && !NONCE_RE.test(tok) && !HASH_RE.test(tok) && tok !== "'none'") return false;
  if (KEYWORD_SOURCES.has(tok) || NONCE_RE.test(tok) || HASH_RE.test(tok) || SCHEME_RE.test(tok) || HOST_RE.test(tok)) return true;
  return false;
}

async function parseArgs(request) {
  if (request.method === 'POST') return request.json().then(body => body).catch(() => ({ __bad: true }));
  const url = new URL(request.url);
  const args = {};
  for (const [k, v] of url.searchParams.entries()) args[k.toLowerCase()] = v;
  return args;
}

async function handleApi(request) {
  const raw = await parseArgs(request);
  if (raw === null || raw === undefined || raw.__bad) return err400('POST body must be JSON, e.g. {"directives": {"default-src": "\'self\'"}, "report_only": true}');

  const reportOnly = String(raw['report-only'] ?? raw.report_only ?? '').toLowerCase() === 'true';
  const reportTo = raw['report-to'] ?? raw.report_to ?? null;
  const reportUri = raw['report-uri'] ?? raw.report_uri ?? null;
  const directivesRaw = raw.directives && typeof raw.directives === 'object' ? raw.directives : (() => {
    const { 'report-only': ro, report_only: ro2, 'report-to': rt, report_to: rt2, 'report-uri': ru, report_uri: ru2, directives: dd, ...rest } = raw;
    return rest;
  })();

  if (typeof directivesRaw !== 'object' || directivesRaw === null || Array.isArray(directivesRaw)) return err400('No directives provided. Pass directive names as query params (?default-src=self) or POST {"directives": {...}}');
  const names = Object.keys(directivesRaw);
  if (!names.length) return err400('No directives provided. Pass at least one, e.g. ?default-src=self');

  const warnings = [];
  const directives = {};
  for (const name of names) {
    const d = name.toLowerCase().trim();
    if (!ALL_DIRECTIVES.has(d)) return err400(`Unknown directive "${d}". See ${HOST}/api for the supported CSP directive list.`);
    let tokens = directivesRaw[name];
    if (Array.isArray(tokens)) tokens = tokens.join(' ');
    if (typeof tokens !== 'string') return err400(`Directive "${d}" must be a string or array of tokens`);
    // URLSearchParams already decodes '+' to space; also split commas for convenience
    tokens = tokens.split(/[,\s]+/).map(t => t.trim()).filter(Boolean).map(normalizeToken);
    if (!tokens.length) return err400(`Directive "${d}" has no tokens`);
    if (d === 'upgrade-insecure-requests' || d === 'block-all-mixed-content' || d === 'disown-opener') { directives[d] = []; continue; }
    if (d === 'sandbox') {
      for (const t of tokens) if (!SANDBOX_TOKENS.has(t)) return err400(`Invalid sandbox token "${t}" (must be an allow-* keyword or omitted for maximal sandbox)`);
      directives[d] = tokens; continue;
    }
    for (const t of tokens) {
      if (!validateToken(t, d)) return err400(`Invalid source token "${t}" in directive "${d}"`);
    }
    if (tokens.includes("'none'") && tokens.length > 1) warnings.push(`${d}: 'none' must be the only source — other tokens are ignored by the spec`);
    if ((d === 'script-src' || d === 'script-src-elem') && tokens.includes("'unsafe-inline'") && (tokens.some(t => NONCE_RE.test(t) || HASH_RE.test(t)) || tokens.includes("'strict-dynamic'"))) warnings.push(`${d}: 'unsafe-inline' is ignored when a nonce, hash or 'strict-dynamic' is present (per spec)`);
    directives[d] = tokens;
  }
  if (reportTo && !directives['report-to']) directives['report-to'] = [reportTo];
  if (reportUri && !directives['report-uri']) directives['report-uri'] = [reportUri];

  // Best-practice warnings
  const get = d => directives[d] || directives['default-src'];
  for (const d of ['script-src', 'script-src-elem']) {
    const t = directives[d];
    if (t && t.includes("'unsafe-inline'")) warnings.push(`${d}: 'unsafe-inline' allows injected inline scripts — prefer nonces or hashes`);
    if (t && t.includes("'unsafe-eval'")) warnings.push(`${d}: 'unsafe-eval' weakens XSS protections (eval(), new Function)`);
  }
  if (directives['style-src'] && directives['style-src'].includes("'unsafe-inline'")) warnings.push("style-src: 'unsafe-inline' allows injected styles — acceptable for many sites, but consider hashes");
  for (const [d, t] of Object.entries(directives)) {
    if (!FETCH_DIRECTIVES.has(d) && d !== 'default-src') continue;
    if (t.includes('*')) warnings.push(`${d}: "*" allows any host — prefer explicit origins`);
    else if (t.includes('https:')) warnings.push(`${d}: scheme-source "https:" allows ANY https host — prefer explicit origins`);
    else if (t.includes('http:')) warnings.push(`${d}: "http:" allows insecure origins and any http host`);
    if (t.includes('http://')) warnings.push(`${d}: http:// origin is insecure (mixed content)`);
  }
  if (!directives['default-src']) warnings.push("No default-src: directives you omit fall back to allowing everything. Set default-src 'none' (or 'self') and allow what you need");
  if (!directives['base-uri']) warnings.push("Consider base-uri 'self' or 'none' — blocks <base> hijacking (no default-src fallback applies)");
  if (!directives['object-src'] && !directives['default-src']?.includes("'none'") && !directives['object-src']?.includes("'none'")) warnings.push("Consider object-src 'none' — blocks <object>/<embed>/<applet> plugins");
  if (!directives['frame-ancestors']) warnings.push("Consider frame-ancestors 'none' (or 'self') — clickjacking protection (no default-src fallback applies)");
  if (reportOnly && !directives['report-to'] && !directives['report-uri']) warnings.push("Report-Only mode without report-to/report-uri: violations are logged to console only, not collected");
  if (reportUri && directives['report-to']) warnings.push("report-uri is deprecated in favor of report-to; modern browsers ignore report-uri when report-to is present");

  const order = ['default-src', 'script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr', 'img-src', 'font-src', 'connect-src', 'media-src', 'frame-src', 'child-src', 'worker-src', 'object-src', 'manifest-src', 'prefetch-src', 'base-uri', 'form-action', 'frame-ancestors', 'navigate-to', 'sandbox', 'plugin-types', 'require-trusted-types-for', 'trusted-types', 'upgrade-insecure-requests', 'block-all-mixed-content', 'disown-opener', 'report-to', 'report-uri'];
  const ordered = order.filter(d => directives[d]);
  for (const d of Object.keys(directives)) if (!ordered.includes(d)) ordered.push(d); // future-proof
  const policy = ordered.map(d => directives[d].length ? `${d} ${directives[d].join(' ')}` : d).join('; ');

  return Response.json({
    header: reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    policy,
    directives: Object.fromEntries(ordered.map(d => [d, directives[d]])),
    report_only: reportOnly,
    warnings,
    warnings_count: warnings.length,
    spec: 'W3C CSP Level 3',
    generated_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

const API_HELP = {
  description: 'CSP header generator. Pass directives as query params (?default-src=self&script-src=self+cdn.example.com) or POST {"directives": {...}, "report_only": true, "report_to": "name"}. Values: space/comma-separated tokens.',
  example_get: `${HOST}/api?default-src=self&script-src=self+https://cdn.example.com&object-src=none&base-uri=self`,
  example_post: `curl -X POST ${HOST}/api -H 'Content-Type: application/json' -d '{"directives":{"default-src":["\'self\'","https:"],"img-src":"data: blob:"},"report_only":true,"report_to":"csp"}'`,
  flags: { 'report-only': 'true → emit Content-Security-Policy-Report-Only', 'report-to': 'reporting group name', 'report-uri': 'legacy reporting endpoint URL' },
  directives: [...FETCH_DIRECTIVES, ...OTHER_DIRECTIVES].sort(),
  token_forms: ["'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", "'report-sample'", "'nonce-<b64>'", "'sha256|sha384|sha512-<b64>'", 'host (example.com, *.example.com)', 'scheme (https:)', 'host with port/path (https://example.com:8443/path)'],
  full_tool: FULL_TOOL,
};

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
      if (url.searchParams.toString() === '' && request.method === 'GET' && !url.search) return Response.json(API_HELP, { headers: JSON_HEADERS });
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
