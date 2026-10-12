// Security Headers Checker & Generator — formatho.com
// Scans a URL's response headers, grades them, and generates config snippets.
// Landing at /, API at /api, sitemap.xml, llms.txt. Zero tracking, zero data collection.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://security-headers-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/security-headers';
const MAX_URL = 2048;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;

// --- SSRF guard: block private/loopback/local targets ---
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan') || h === '0.0.0.0') return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const o = m.slice(1).map(Number);
    if (o.some((x) => x > 255)) return true; // malformed IP-ish
    const [a, b] = o;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (h === '::1' || h === '::') return true;
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true; // fc00::/7 unique local
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true; // fe80::/10 link local
  if (h.toLowerCase().startsWith('::ffff:')) return isPrivateHost(h.slice(7));
  return false;
}

function parseTarget(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) throw new Error('url is required — the page to scan, e.g. https://example.com');
  let u = rawUrl.trim();
  const scheme = u.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):\/\//);
  if (scheme && !/^https?$/i.test(scheme[1])) throw new Error('only http:// and https:// URLs are supported');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u; // bare domains default to https
  if (u.length > MAX_URL) throw new Error('url exceeds the 2048-character limit');
  let parsed;
  try { parsed = new URL(u); } catch (e) { throw new Error('url is not valid: ' + e.message); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('only http:// and https:// URLs are supported');
  if (parsed.username || parsed.password) throw new Error('URLs with embedded credentials are not allowed');
  if (isPrivateHost(parsed.hostname)) throw new Error('private, loopback and link-local hosts cannot be scanned');
  return parsed;
}

// --- Header audit model ---
// Each check: id, title, weight, evaluate(h) -> {status:'pass'|'warn'|'fail', detail}
function auditHeaders(h, isHttps) {
  const get = (name) => h[name.toLowerCase()] ?? null;
  const checks = [];

  // HSTS
  const hsts = get('Strict-Transport-Security');
  {
    let status = 'fail';
    let detail = 'missing — browsers can be downgraded to HTTP on first visit (add it once HTTPS is fully rolled out)';
    let earned = 0;
    if (hsts) {
      const maxAge = hsts.match(/max-age=(\d+)/i);
      const ma = maxAge ? Number(maxAge[1]) : 0;
      const hasSub = /includesubdomains/i.test(hsts);
      const hasPreload = /preload/i.test(hsts);
      if (!maxAge) { status = 'warn'; detail = 'present but max-age missing'; earned = 10; }
      else if (ma < 15552000) { status = 'warn'; detail = 'max-age ' + ma + 's is below the 180-day (15552000s) minimum'; earned = 12; }
      else { status = 'pass'; detail = 'max-age ' + ma + 's' + (hasSub ? ', includeSubDomains' : '') + (hasPreload ? ', preload' : ''); earned = !hasSub ? 18 : 20; }
    } else if (!isHttps) { status = 'warn'; detail = 'not applicable over plain HTTP — HSTS requires HTTPS'; earned = 10; }
    checks.push({ id: 'hsts', title: 'Strict-Transport-Security (HSTS)', weight: 20, earned, status, detail });
  }

  // CSP
  const csp = get('Content-Security-Policy');
  const cspro = get('Content-Security-Policy-Report-Only');
  {
    let status = 'fail';
    let detail = 'missing — the strongest defense against XSS';
    let earned = 0;
    const policy = csp || cspro;
    if (csp) {
      const low = csp.toLowerCase();
      const risks = [];
      if (/unsafe-inline|unsafe-eval/.test(low)) risks.push('unsafe-inline/unsafe-eval weakens script protection');
      if (/default-src[^;]*\*|script-src[^;]*\*/.test(low)) risks.push('wildcard (*) source');
      if (!/default-src|script-src/.test(low)) risks.push('no default-src or script-src directive');
      status = risks.length ? 'warn' : 'pass';
      detail = risks.length ? risks.join('; ') : 'enforced policy present';
      earned = risks.length ? 15 : 25;
    } else if (cspro) {
      status = 'warn';
      detail = 'report-only mode — violations are logged but not blocked';
      earned = 10;
    }
    checks.push({ id: 'csp', title: 'Content-Security-Policy', weight: 25, earned, status, detail });
  }

  // X-Content-Type-Options
  const xcto = get('X-Content-Type-Options');
  checks.push({
    id: 'xcto', title: 'X-Content-Type-Options', weight: 10,
    earned: xcto && xcto.toLowerCase() === 'nosniff' ? 10 : 0,
    status: xcto ? (xcto.toLowerCase() === 'nosniff' ? 'pass' : 'warn') : 'fail',
    detail: !xcto ? 'missing — browsers may MIME-sniff responses into executable types' : (xcto.toLowerCase() === 'nosniff' ? 'nosniff' : 'value should be exactly "nosniff" (got "' + xcto + '")'),
  });

  // X-Frame-Options (or CSP frame-ancestors)
  const xfo = get('X-Frame-Options');
  const frameOk = /frame-ancestors/i.test(String(csp || ''));
  {
    const v = xfo ? xfo.toLowerCase() : null;
    const good = v === 'deny' || v === 'sameorigin';
    const earned = good ? 10 : frameOk ? 10 : v ? 5 : 0;
    checks.push({
      id: 'xfo', title: 'X-Frame-Options / frame-ancestors', weight: 10, earned,
      status: good || frameOk ? 'pass' : v ? 'warn' : 'fail',
      detail: good ? v : frameOk ? 'CSP frame-ancestors supersedes X-Frame-Options' : v ? 'value should be DENY or SAMEORIGIN (got "' + xfo + '")' : 'missing — clickjacking protection (set X-Frame-Options or CSP frame-ancestors)',
    });
  }

  // Referrer-Policy
  const rp = get('Referrer-Policy');
  {
    const strictVals = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
    const v = rp ? rp.trim().toLowerCase() : null;
    const good = strictVals.includes(v);
    const lax = v === 'origin' || v === 'origin-when-cross-origin' || v === 'no-referrer-when-downgrade';
    checks.push({
      id: 'rp', title: 'Referrer-Policy', weight: 15,
      earned: good ? 15 : lax ? 10 : v ? 5 : 0,
      status: good ? 'pass' : v ? 'warn' : 'fail',
      detail: good ? v : lax ? v + ' leaks full URLs to third parties' : v ? 'unrecognized value "' + rp + '"' : 'missing — defaults leak full URLs cross-origin',
    });
  }

  // Permissions-Policy
  const pp = get('Permissions-Policy') || get('Feature-Policy');
  checks.push({
    id: 'pp', title: 'Permissions-Policy', weight: 10,
    earned: pp ? 10 : 0,
    status: pp ? 'pass' : 'fail',
    detail: pp ? 'present' : 'missing — cameras, mic, geolocation etc. stay requestable by any embedded content',
  });

  // Cross-Origin isolation trio
  const coop = get('Cross-Origin-Opener-Policy');
  const coep = get('Cross-Origin-Embedder-Policy');
  const corp = get('Cross-Origin-Resource-Policy');
  {
    const earned = (coop ? 4 : 0) + (coep ? 3 : 0) + (corp ? 3 : 0);
    const missing = [coop ? null : 'COOP', coep ? null : 'COEP', corp ? null : 'CORP'].filter(Boolean);
    checks.push({
      id: 'coxx', title: 'Cross-Origin Isolation (COOP/COEP/CORP)', weight: 10, earned,
      status: earned === 10 ? 'pass' : earned > 0 ? 'warn' : 'fail',
      detail: earned === 10 ? 'COOP, COEP and CORP all present' : 'missing: ' + missing.join(', ') + ' — blocks Spectre-style side channels and cross-origin leaks',
    });
  }

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(checks.reduce((s, c) => s + c.earned, 0) * 100 / totalWeight);
  const grade = score >= 97 ? 'A+' : score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';

  const info = [];
  if (get('Server')) info.push({ note: 'Server header discloses software: "' + get('Server') + '" (informational — consider muting)' });
  if (get('X-Powered-By')) info.push({ note: 'X-Powered-By discloses stack: "' + get('X-Powered-By') + '" (informational — remove it)' });

  return { checks, score, grade, info };
}

function genSnippets(target, observed, isHttps) {
  const h = observed;
  const lines = { nginx: [], apache: [], express: [] };
  if (!h['strict-transport-security'] && isHttps) {
    lines.nginx.push('add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;');
    lines.apache.push('Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"');
    lines.express.push(`res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');`);
  }
  if (!h['content-security-policy']) {
    const cspVal = h['content-security-policy-report-only'] || "default-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'";
    lines.nginx.push('add_header Content-Security-Policy "' + cspVal.replace(/"/g, '\\"') + '" always;');
    lines.apache.push('Header always set Content-Security-Policy "' + cspVal.replace(/"/g, '\\"') + '"');
    lines.express.push(`res.setHeader('Content-Security-Policy', ${JSON.stringify(cspVal)});`);
  }
  if (!h['x-content-type-options']) {
    lines.nginx.push('add_header X-Content-Type-Options "nosniff" always;');
    lines.apache.push('Header always set X-Content-Type-Options "nosniff"');
    lines.express.push(`res.setHeader('X-Content-Type-Options', 'nosniff');`);
  }
  if (!h['x-frame-options'] && !/frame-ancestors/i.test(String(h['content-security-policy'] || ''))) {
    lines.nginx.push('add_header X-Frame-Options "SAMEORIGIN" always;');
    lines.apache.push('Header always set X-Frame-Options "SAMEORIGIN"');
    lines.express.push(`res.setHeader('X-Frame-Options', 'SAMEORIGIN');`);
  }
  if (!h['referrer-policy']) {
    lines.nginx.push('add_header Referrer-Policy "strict-origin-when-cross-origin" always;');
    lines.apache.push('Header always set Referrer-Policy "strict-origin-when-cross-origin"');
    lines.express.push(`res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');`);
  }
  if (!h['permissions-policy']) {
    lines.nginx.push('add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;');
    lines.apache.push('Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"');
    lines.express.push(`res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');`);
  }
  if (!h['cross-origin-opener-policy']) {
    lines.nginx.push('add_header Cross-Origin-Opener-Policy "same-origin" always;');
    lines.apache.push('Header always set Cross-Origin-Opener-Policy "same-origin"');
    lines.express.push(`res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');`);
  }
  if (!h['cross-origin-resource-policy']) {
    lines.nginx.push('add_header Cross-Origin-Resource-Policy "same-origin" always;');
    lines.apache.push('Header always set Cross-Origin-Resource-Policy "same-origin"');
    lines.express.push(`res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');`);
  }
  const wrap = (arr, cmt) => arr.length ? cmt + '\n' + arr.join('\n') : '# ' + target + ' already sends every audited header — nothing to add.';
  const apacheWrap = (arr) => arr.length ? '<IfModule mod_headers.c>\n  ' + arr.join('\n  ') + '\n</IfModule>' : '# ' + target + ' already sends every audited header — nothing to add.';
  const expressWrap = (arr) => arr.length ? `// app.use((req, res, next) => {\n  ${arr.join('\n  ')}\n  next();\n});` : '// ' + target + ' already sends every audited header — nothing to add.';
  return {
    nginx: wrap(lines.nginx, '# ' + target + ' — nginx (server/block level)'),
    apache: apacheWrap(lines.apache),
    express: expressWrap(lines.express),
  };
}

async function readParams(request, url) {
  const p = { url: url.searchParams.get('url'), method: url.searchParams.get('method') };
  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      let body;
      try { body = await request.json(); } catch (e) { throw new Error('request body is not valid JSON'); }
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        if (typeof body.url === 'string') p.url = p.url ?? body.url;
        if (typeof body.method === 'string') p.method = p.method ?? body.method;
      }
    }
  }
  return p;
}

async function handleApi(request) {
  const url = new URL(request.url);
  let p;
  try { p = await readParams(request, url); }
  catch (e) { return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS }); }

  let target;
  try { target = parseTarget(p.url); }
  catch (e) { return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS }); }

  const method = p.method && p.method.toUpperCase() === 'HEAD' ? 'HEAD' : 'GET';

  // Follow redirects manually so we can record the chain
  const redirects = [];
  let current = target;
  let resp;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let r;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      r = await fetch(current.toString(), { method, redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'Formatho-Security-Headers-Checker/1.0 (+https://formatho.com/tools/security-headers)' } });
      clearTimeout(t);
    } catch (e) {
      const why = e && e.name === 'AbortError' ? 'timed out after ' + FETCH_TIMEOUT_MS + 'ms' : e.message;
      return Response.json({ error: 'could not fetch ' + current.toString() + ' (' + why + ')' }, { status: 502, headers: JSON_HEADERS });
    }
    if ([301, 302, 303, 307, 308].includes(r.status) && r.headers.get('location')) {
      if (hop === MAX_REDIRECTS) return Response.json({ error: 'too many redirects (more than ' + MAX_REDIRECTS + ')' }, { status: 502, headers: JSON_HEADERS });
      let next;
      try { next = new URL(r.headers.get('location'), current); } catch (e) { break; }
      if (next.protocol !== 'https:' && next.protocol !== 'http:') break;
      redirects.push({ from: current.toString(), to: next.toString(), status: r.status });
      current = next;
      continue;
    }
    resp = r;
    break;
  }
  if (!resp) return Response.json({ error: 'could not fetch ' + current.toString() + ' (no response obtained)' }, { status: 502, headers: JSON_HEADERS });
  // cancel body download — we only need headers
  try { resp.body && resp.body.cancel(); } catch (e) {}

  const observed = {};
  for (const name of ['strict-transport-security', 'content-security-policy', 'content-security-policy-report-only', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-embedder-policy', 'cross-origin-resource-policy', 'server', 'x-powered-by']) {
    const v = resp.headers.get(name);
    if (v != null) observed[name] = v;
  }

  const isHttps = current.protocol === 'https:';
  const { checks, score, grade, info } = auditHeaders(observed, isHttps);
  const finalUrl = current.toString();

  return Response.json({
    tool: 'security-headers',
    url: target.toString(),
    final_url: finalUrl,
    redirects,
    http_status: resp.status,
    https: isHttps,
    score,
    grade,
    checks,
    info,
    headers: observed,
    snippets: genSnippets(target.hostname, observed, isHttps),
  }, { headers: JSON_HEADERS });
}


const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Security Headers Checker — Scan, Grade &amp; Generate HTTP Headers, Free &amp; Private</title>
<meta name="description" content="Free security headers scanner &amp; API. Scan any URL for HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy &amp; more — get a grade plus ready-to-paste nginx, Apache and Express config.">
<link rel="canonical" href="${HOST}/">
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a202c}h1{font-size:1.6rem}pre{background:#f6f8fa;padding:.8rem;border-radius:8px;overflow:auto;font-size:.85rem}code{background:#f6f8fa;padding:.1rem .3rem;border-radius:4px}</style>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebApplication","name":"Security Headers Checker","url":"${HOST}/","description":"Scan any URL's response headers for HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy and cross-origin isolation — graded A+ to F with nginx, Apache and Express config snippets. Free, private, no tracking.","applicationCategory":"DeveloperApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"publisher":{"@type":"Organization","name":"Formatho","url":"https://formatho.com"}}
</script>
</head>
<body>
<h1>Security Headers Checker &amp; Generator</h1>
<p>Fetches your URL once from the edge and audits nine security headers — <strong>HSTS, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options/frame-ancestors, Referrer-Policy, Permissions-Policy, COOP, COEP and CORP</strong> — then scores the site A+ to F. For every missing header you get ready-to-paste <strong>nginx, Apache and Express</strong> config generated from what your site actually lacks.</p>

<h2>API — GET /api</h2>
<pre>curl "https://security-headers-formatho.filesformatho.workers.dev/api?url=formatho.com"

curl -X POST https://security-headers-formatho.filesformatho.workers.dev/api \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://example.com","method":"HEAD"}'</pre>

<p>Parameters: <code>url</code> — the page to scan (bare domains default to https); <code>method</code> — <code>GET</code> (default) or <code>HEAD</code>. Redirects are followed (≤5) and reported. Private/loopback hosts are refused.</p>

<h2>Example response</h2>
<pre>{"url":"https://example.com/","https":true,"score":95,"grade":"A",
 "checks":[{"id":"hsts","title":"Strict-Transport-Security","weight":20,
            "earned":20,"status":"pass","detail":"max-age 31536000s, includeSubDomains"}, ...],
 "snippets":{"nginx":"add_header ...","apache":"Header always set ...","express":"res.setHeader(...)"}}</pre>

<h2>Private by design</h2>
<p>The URL you enter is fetched once to read response headers — nothing is logged or stored. No signup, no cookies, no rate limits on your own site's checks. Fully in-browser scanning also available in the <a href="${FULL_TOOL}">full security headers tool on formatho.com</a>.</p>

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

const LLMS_TXT = "# Security Headers Checker & Generator — Free & Private\n\n> Scan any public URL's response headers for HSTS, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options / CSP frame-ancestors, Referrer-Policy, Permissions-Policy and cross-origin isolation (COOP/COEP/CORP). Returns a weighted A+ to F grade, per-check pass/warn/fail detail, redirect chain, and ready-to-paste nginx/Apache/Express config for exactly the headers the site is missing. GET or POST (url, method), redirects followed up to 5, private and loopback hosts refused. Free, privacy-first API on Cloudflare's edge: no tracking, no signup.\n\n- [Use this tool]: https://security-headers-formatho.filesformatho.workers.dev/\n- [JSON API]: https://security-headers-formatho.filesformatho.workers.dev/api — GET and POST (url, method), CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/security-headers\n- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

export { auditHeaders, genSnippets, parseTarget, isPrivateHost };

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
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
