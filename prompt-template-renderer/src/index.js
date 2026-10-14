// Privacy-First Prompt Template Renderer API ({{variable}} substitution with JSON vars) — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://prompt-template-renderer-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/prompt-template-renderer';
const MAX_TEMPLATE = 65536;
const MAX_VARS = 65536;
const MISSING_POLICIES = ['keep', 'empty', 'error'];

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prompt Template Renderer Online ({{variable}} Substitution) — Free &amp; Private</title>
<meta name="description" content="Render prompt templates with JSON variables: {{var}} and {{ user.name }} dot-path substitution, missing-variable policies (keep, empty or error), used/missing/unused variable reports. Free, privacy-first API.">
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
  "name": "Prompt Template Renderer Online ({{variable}} Substitution) — Free & Private",
  "url": "https://prompt-template-renderer-formatho.filesformatho.workers.dev/",
  "description": "Render prompt templates with JSON variables: {{var}} and {{ user.name }} dot-path substitution, missing-variable policies (keep, empty or error), used/missing/unused variable reports. Free, privacy-first API.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["Free edge API", "Zero tracking", "Dot-path variables", "Missing-variable policies", "No signup required"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
  <h1>Prompt Template Renderer Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># Simple substitution
curl "${HOST}/api?template=Hello%20%7B%7Bname%7D%7D%2C%20welcome%20to%20%7B%7Bproduct%7D%7D!&vars=%7B%22name%22%3A%22Ada%22%2C%22product%22%3A%22Formatho%22%7D"

# Nested variables with dot paths
curl "${HOST}/api?template=%7B%7Buser.name%7D%7D%20(%7B%7Buser.role%7D%7D)%20filed%20%7B%7Bticket.count%7D%7D%20issues&vars=%7B%22user%22%3A%7B%22name%22%3A%22Grace%22%2C%22role%22%3A%22admin%22%7D%2C%22ticket%22%3A%7B%22count%22%3A7%7D%7D"

# Fail loudly on missing variables
curl "${HOST}/api?template=Hi%20%7B%7Bname%7D%7D&vars=%7B%7D&missing=error"</code></pre>
<p>Returns the rendered template plus <code>variables_used</code>, <code>variables_missing</code> and <code>variables_unused</code> lists — handy for auditing prompt templates before they reach an LLM. Missing variables can be kept as-is (default), replaced with an empty string, or raise a 400 error naming every gap. Values may be strings, numbers, booleans, null or nested objects (objects render as JSON).</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> templates and variables are rendered in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Render templates entirely client-side: <a href="${FULL_TOOL}">Prompt Template Renderer on formatho.com</a>.</p>
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

const LLMS_TXT = "# Prompt Template Renderer Online ({{variable}} Substitution) — Free & Private\n\n> Render prompt templates with JSON variables: {{var}} and {{ user.name }} dot-path substitution, missing-variable policies (keep, empty, error), and used/missing/unused variable reports for auditing templates before they reach an LLM. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://prompt-template-renderer-formatho.filesformatho.workers.dev/\n- [JSON API]: https://prompt-template-renderer-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/prompt-template-renderer\n- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

// Resolve a dotted path like "user.name" against vars. Returns undefined when any hop is missing.
function lookup(vars, path) {
  let cur = vars;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

function stringifyVal(v) {
  if (typeof v === 'string') return v;
  if (v === null) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  return JSON.stringify(v);
}

async function handleApi(request, url) {
  if (request.method !== 'GET' && request.method !== 'POST') return err400('method not allowed; use GET or POST');
  let p = {};
  if (request.method === 'GET') {
    for (const [k, v] of url.searchParams) p[k] = v;
  } else {
    const ct = request.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) p = await request.json();
      else { const f = await request.formData(); for (const [k, v] of f.entries()) p[k] = v; }
    } catch { return err400('body must be valid JSON or form data'); }
  }

  const template = p.template ?? p.text;
  if (typeof template !== 'string' || template.length === 0) return err400('template is required');
  if (template.length > MAX_TEMPLATE) return err400(`template exceeds ${MAX_TEMPLATE} characters`);

  let vars = {};
  if (p.vars != null) {
    let varsObj;
    if (typeof p.vars === 'string') {
      if (p.vars.length > MAX_VARS) return err400(`vars exceeds ${MAX_VARS} characters`);
      try { varsObj = JSON.parse(p.vars); } catch { return err400('vars must be a valid JSON object, e.g. {"name":"Ada"}'); }
    } else {
      varsObj = p.vars;
    }
    if (typeof varsObj !== 'object' || varsObj === null || Array.isArray(varsObj)) {
      return err400('vars must be a JSON object mapping variable names to values');
    }
    vars = varsObj;
  }

  const missingPolicy = p.missing == null ? 'keep' : String(p.missing);
  if (!MISSING_POLICIES.includes(missingPolicy)) return err400(`missing must be one of ${MISSING_POLICIES.join(', ')}`);

  const used = new Set();
  const missing = new Set();
  let substitutions = 0;
  const rendered = template.replace(/\{\{\s*([A-Za-z0-9_.\-]+)\s*\}\}/g, (m, path) => {
    const val = lookup(vars, path);
    if (val === undefined) {
      missing.add(path);
      if (missingPolicy === 'empty') return '';
      return m;
    }
    used.add(path);
    substitutions++;
    return stringifyVal(val);
  });

  if (missingPolicy === 'error' && missing.size > 0) {
    return err400(`undefined variables: ${[...missing].join(', ')}`);
  }

  // Top-level vars that were never used (exact or as a dot-path prefix).
  const unused = Object.keys(vars).filter((k) => {
    for (const u of used) if (u === k || u.startsWith(k + '.')) return false;
    return true;
  });

  return Response.json({
    rendered,
    variables_used: [...used],
    variables_missing: [...missing],
    variables_unused: unused,
    missing_policy: missingPolicy,
    stats: { template_chars: template.length, rendered_chars: rendered.length, substitutions },
    rendered_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
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
    if (url.pathname === '/api') return handleApi(request, url);
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
