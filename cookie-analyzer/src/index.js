// Privacy-First Cookie Analyzer API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://cookie-analyzer-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/cookie-analyzer';
const MAX_BYTES = 8192;

const SET_COOKIE_ATTR_RE = /;\s*(expires|max-age|domain|path|samesite|secure|httponly|partitioned|priority)\s*(?:=|$)/i;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cookie Analyzer Online — Free &amp; Private</title>
<meta name="description" content="Parse any Cookie or Set-Cookie header into structured JSON: attributes, Secure/HttpOnly/SameSite flags, expiry, scope, __Host- prefix checks and security warnings. Free, zero tracking. Full tool on formatho.com.">
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
  "name": "Cookie Analyzer Online — Free & Private",
  "url": "https://cookie-analyzer-formatho.filesformatho.workers.dev/",
  "description": "Parse any Cookie or Set-Cookie header into structured JSON: attributes, Secure/HttpOnly/SameSite flags, expiry, scope, __Host- prefix checks and security warnings. Free, zero tracking. Full tool on formatho.com.",
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
  <h1>Cookie Analyzer — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — Set-Cookie header</h2>
<pre><code>curl "${HOST}/api?set-cookie=session%3Dabc123%3B%20Path%3D%2F%3B%20Secure%3B%20HttpOnly%3B%20SameSite%3DLax%3B%20Max-Age%3D3600"</code></pre>
<p>Returns name, value, attributes, flags, expiry classification, cookie scope and security warnings (missing Secure/HttpOnly/SameSite, <code>__Host-</code> prefix rule violations, oversize cookies).</p>
<h2>Usage — request Cookie header</h2>
<pre><code>curl "${HOST}/api?cookie=a%3D1%3B%20b%3D2"</code></pre>
<p>Split into name/value pairs with percent-decoding and duplicate detection. Omit both params to analyze the <em>Cookie header of your own request</em>.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> parsing runs in-memory at the edge; nothing you send is logged or stored.</div>
<h2>Full browser tool</h2>
<p>Analyze cookies entirely client-side: <a href="${FULL_TOOL}">Cookie Analyzer on formatho.com</a>.</p>
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

const LLMS_TXT = "# Cookie Analyzer Online — Free & Private\n\n> Parse any Cookie or Set-Cookie header into structured JSON: attributes, Secure/HttpOnly/SameSite flags, expiry, scope, __Host- prefix checks and security warnings. Free, zero tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://cookie-analyzer-formatho.filesformatho.workers.dev/\n- [JSON API]: https://cookie-analyzer-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/cookie-analyzer\n- [All 46 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

const byteLen = (s) => new TextEncoder().encode(s).length;

function tryDecode(v) {
  if (!/%[0-9a-fA-F]{2}/.test(v) && !v.includes('+')) return null;
  try { return decodeURIComponent(v); } catch { return null; }
}

function analyzeSetCookie(raw, warnings) {
  const semi = raw.indexOf(';');
  const nameValue = (semi === -1 ? raw : raw.slice(0, semi)).trim();
  const rest = semi === -1 ? '' : raw.slice(semi + 1);
  const eq = nameValue.indexOf('=');
  if (eq === -1) return { __invalid: `Set-Cookie string has no "=" in the name-value pair (RFC 6265 requires name=value; got "${nameValue}")` };
  const name = nameValue.slice(0, eq).trim();
  const value = nameValue.slice(eq + 1).trim();
  if (name === '') warnings.push('Cookie name is empty — most browsers will reject this cookie.');

  const attrs = { expires: null, max_age: null, domain: null, path: null, samesite: null, priority: null };
  const flags = { secure: false, http_only: false, partitioned: false };
  const seen = new Set();

  for (const partRaw of rest.split(';')) {
    const part = partRaw.trim();
    if (!part) continue;
    const peq = part.indexOf('=');
    const aname = (peq === -1 ? part : part.slice(0, peq)).trim().toLowerCase();
    const aval = peq === -1 ? null : part.slice(peq + 1).trim();
    const key = aname;
    if (seen.has(key) && aval !== null && key !== 'path' && key !== 'domain') warnings.push(`Duplicate attribute "${aname}" — RFC 6265 processing order means the last one wins.`);
    seen.add(key);
    switch (key) {
      case 'expires': {
        const ts = Date.parse(aval || '');
        if (!Number.isFinite(ts)) { warnings.push(`Expires value "${aval}" is not a valid HTTP date — attribute ignored.`); break; }
        attrs.expires = { raw: aval, parsed: new Date(ts).toISOString(), epoch_ms: ts };
        break;
      }
      case 'max-age': {
        if (aval === null || !/^-?\d+$/.test(aval)) { warnings.push(`Max-Age value "${aval}" is not an integer — attribute ignored.`); break; }
        const n = Number(aval);
        attrs.max_age = { raw: aval, seconds: n, expires_at: n < 0 ? new Date(0).toISOString() : new Date(Date.now() + n * 1000).toISOString() };
        break;
      }
      case 'domain': {
        const host = aval.replace(/^\./, '');
        if (!host) { warnings.push(`Domain value "${aval}" is empty — attribute ignored.`); break; }
        attrs.domain = { raw: aval, host, leading_dot: aval.startsWith('.') };
        break;
      }
      case 'path': attrs.path = aval; break;
      case 'samesite': {
        const v = (aval || '').toLowerCase();
        if (!['strict', 'lax', 'none'].includes(v)) { warnings.push(`SameSite value "${aval}" is not Strict, Lax or None — attribute ignored.`); break; }
        attrs.samesite = v;
        break;
      }
      case 'priority': {
        const v = (aval || '').toLowerCase();
        if (!['low', 'medium', 'high'].includes(v)) { warnings.push(`Priority value "${aval}" is not Low, Medium or High — attribute ignored.`); break; }
        attrs.priority = v;
        break;
      }
      case 'secure': flags.secure = true; break;
      case 'httponly': flags.http_only = true; break;
      case 'partitioned': flags.partitioned = true; break;
      default: warnings.push(`Unknown attribute "${aname}" ignored.`);
    }
  }

  // Expiry classification (RFC 6265 §5.3: Max-Age takes precedence over Expires).
  let lifetime;
  if (attrs.max_age) lifetime = { type: 'persistent', source: 'max_age', max_age_seconds: attrs.max_age.seconds, expires_at: attrs.max_age.expires_at };
  else if (attrs.expires) lifetime = { type: 'persistent', source: 'expires', expires_at: attrs.expires.parsed, epoch_ms: attrs.expires.epoch_ms, already_expired: attrs.expires.epoch_ms <= Date.now() };
  else lifetime = { type: 'session', description: 'no Expires or Max-Age — cookie is deleted when the browser session ends' };

  // Scope.
  const hostOnly = !attrs.domain;
  const scope = {
    host_only: hostOnly,
    sent_to: hostOnly ? 'exact host that set it only' : `*.${attrs.domain.host} and all subdomains`,
    path: attrs.path || '/',
  };

  // Prefix rules.
  const prefixes = { has_host_prefix: false, has_secure_prefix: false, valid: true };
  if (name.startsWith('__Host-')) {
    prefixes.has_host_prefix = true;
    if (!flags.secure) { prefixes.valid = false; warnings.push('__Host- prefix requires the Secure attribute.'); }
    if (attrs.domain) { prefixes.valid = false; warnings.push('__Host- prefix must not contain a Domain attribute.'); }
    if (attrs.path !== '/') { prefixes.valid = false; warnings.push('__Host- prefix requires Path=/.'); }
  }
  if (name.startsWith('__Secure-')) {
    prefixes.has_secure_prefix = true;
    if (!flags.secure) { prefixes.valid = false; warnings.push('__Secure- prefix requires the Secure attribute.'); }
  }

  // Security recommendations.
  if (!flags.secure) warnings.push('Missing Secure — cookie can be sent over plain HTTP. Recommended for any authenticated cookie.');
  if (!flags.http_only) warnings.push('Missing HttpOnly — cookie is readable by JavaScript (XSS-exposed). Recommended for session cookies.');
  if (!attrs.samesite) warnings.push('Missing SameSite — browsers default to Lax; set it explicitly.');
  else if (attrs.samesite === 'none' && !flags.secure) warnings.push('SameSite=None requires Secure per the spec — the cookie will be rejected.');

  const sizeBytes = byteLen(name) + byteLen(value);
  if (sizeBytes > 4096) warnings.push(`Cookie is ${sizeBytes} bytes — browsers cap cookies around 4096 bytes; this cookie may be silently dropped.`);

  const decoded = tryDecode(value);

  return {
    name,
    value,
    decoded_value: decoded ?? undefined,
    is_percent_encoded: decoded !== null,
    size_bytes: sizeBytes,
    attributes: attrs,
    flags,
    scope,
    lifetime,
    prefixes,
  };
}

function analyzeCookieHeader(raw, warnings) {
  const cookies = [];
  const names = new Map();
  for (const part of raw.split(';')) {
    const pair = part.trim();
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const name = (eq === -1 ? pair : pair.slice(0, eq)).trim();
    const value = eq === -1 ? '' : pair.slice(eq + 1).trim();
    if (name === '') warnings.push(`Segment "${pair}" has an empty cookie name.`);
    if (eq === -1 && pair !== '') warnings.push(`Segment "${pair}" has no "=" — treated as name with empty value.`);
    names.set(name, (names.get(name) || 0) + 1);
    const decoded = tryDecode(value);
    cookies.push({ name, value, decoded_value: decoded ?? undefined, is_percent_encoded: decoded !== null, size_bytes: byteLen(name) + byteLen(value) });
  }
  for (const [n, c] of names) if (c > 1) warnings.push(`Cookie name "${n}" appears ${c} times — RFC 6265 servers should not send duplicates; browsers send all of them in order.`);
  if (cookies.length === 0) warnings.push('No cookie pairs found in the header.');
  return { count: cookies.length, total_size_bytes: byteLen(raw), cookies };
}

async function parseArgs(request) {
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return { __bad: true };
    return { cookie: body.cookie, setCookie: body['set-cookie'], type: body.type };
  }
  const url = new URL(request.url);
  return { cookie: url.searchParams.get('cookie'), setCookie: url.searchParams.get('set-cookie'), type: url.searchParams.get('type') };
}

async function handleApi(request) {
  let { cookie, setCookie, type, __bad } = await parseArgs(request);
  if (__bad) return err400('POST body must be JSON: {"set-cookie": "..."} or {"cookie": "..."}');

  if (type !== null && type !== undefined && !['auto', 'cookie', 'set-cookie'].includes(type)) return err400(`type must be "cookie", "set-cookie" or "auto" (got "${type}")`);

  // No explicit input → analyze the request's own Cookie header (UA-parser pattern).
  if ((cookie === null || cookie === '') && (setCookie === null || setCookie === '')) {
    const own = request.headers.get('Cookie');
    if (!own) return err400('Missing input: pass ?set-cookie=... or ?cookie=... (or a Cookie header on the request itself)');
    cookie = own;
  }
  if (cookie && setCookie) return err400('Pass only one of ?set-cookie= or ?cookie= per call (analyze one header at a time).');

  const raw = setCookie ?? cookie ?? '';
  if (byteLen(raw) > MAX_BYTES) return err400(`Input too large: ${byteLen(raw)} bytes (max ${MAX_BYTES}).`);
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(raw)) return err400('Input contains control characters, which are not valid in cookie headers.');

  const warnings = [];
  let mode;
  if (setCookie !== null && setCookie !== undefined && setCookie !== '') mode = 'set-cookie';
  else if (cookie !== null && cookie !== undefined && cookie !== '') mode = 'cookie';
  else mode = 'set-cookie';
  if (type && type !== 'auto' && type !== mode) mode = type;

  if (mode === 'cookie') {
    const result = analyzeCookieHeader(raw, warnings);
    return Response.json({ type: 'cookie-header', header: raw, ...result, warnings, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  }

  // Auto-detect: looks like a Cookie request header (multiple ; separated name=value pairs, no Set-Cookie attributes)?
  const looksLikeSetCookie = SET_COOKIE_ATTR_RE.test(raw) || /^[^=;]+=[^;]*$/.test(raw.trim());
  let effectiveMode = mode === 'set-cookie' && type === 'auto' && !looksLikeSetCookie && raw.includes(';') ? 'cookie' : 'set-cookie';

  if (effectiveMode === 'cookie') {
    const result = analyzeCookieHeader(raw, warnings);
    return Response.json({ type: 'cookie-header', auto_detected: true, header: raw, ...result, warnings, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
  }

  const parsed = analyzeSetCookie(raw, warnings);
  if (parsed.__invalid) return err400(parsed.__invalid);
  return Response.json({ type: 'set-cookie', header: raw, cookie: parsed, warnings, calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
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
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
