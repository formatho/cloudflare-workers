// Privacy-First Percentage Calculator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://percentage-calculator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/percentage-calculator';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Percentage Calculator API (X% of Y, % Change) — Free &amp; Private</title>
<meta name="description" content="Free percentage calculator API: X% of Y, X is what percent of Y, and percentage increase/decrease (percent change) — one call each, zero tracking. Full tool on formatho.com.">
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
  <h1>Percentage Calculator API — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># What is 15% of 200?
curl "${HOST}/api?x=15&amp;y=200"

# 30 is what percent of 200?
curl "${HOST}/api?x=30&amp;y=200&amp;action=isWhatPercent"

# Percentage change from 150 to 180
curl "${HOST}/api?from=150&amp;to=180"</code></pre>
<p>Three actions in one endpoint: <code>percentOf</code> (X% of Y), <code>isWhatPercent</code> (X is what % of Y) and <code>percentChange</code> (percentage increase/decrease from → to). Without <code>action</code>, both X/Y actions are computed together.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> numbers are computed in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Calculate percentages entirely client-side: <a href="${FULL_TOOL}">Percentage Calculator on formatho.com</a>.</p>
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

const API_DOC = {
  endpoints: {
    'GET /api': 'Percentage calculations. Query params below.',
  },
  actions: {
    percentOf: 'x% of y  → params: x, y',
    isWhatPercent: 'x is what percent of y → params: x, y (y ≠ 0)',
    percentChange: 'relative change from → to → params: from, to',
  },
  default: 'No action: requires x & y; computes percentOf and isWhatPercent together (adds percentChange if from & to are also given).',
  examples: [
    `${HOST}/api?x=15&y=200`,
    `${HOST}/api?x=30&y=200&action=isWhatPercent`,
    `${HOST}/api?from=150&to=180`,
  ],
  full_tool: FULL_TOOL,
};

function num(v, name) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw { message: `Parameter '${name}' must be a finite number (got: ${JSON.stringify(v)})` };
  }
  return n;
}

const round10 = (n) => Math.round(n * 1e10) / 1e10;

function handleApi(request) {
  const p = new URL(request.url).searchParams;
  try {
    const action = p.get('action');
    if (p.get('')) {} // no-op
    const hasXY = p.has('x') || p.has('y');
    const hasFT = p.has('from') || p.has('to');

    if (!action && !hasXY && !hasFT) {
      return Response.json({ error: 'Missing parameters. Provide x & y, or from & to. Example: /api?x=15&y=200', usage: API_DOC }, { status: 400, headers: JSON_HEADERS });
    }
    if (action && !['percentOf', 'isWhatPercent', 'percentChange'].includes(action)) {
      return Response.json({ error: `Unknown action '${action}'. Valid: percentOf, isWhatPercent, percentChange`, usage: API_DOC }, { status: 400, headers: JSON_HEADERS });
    }

    const want = action ? [action] : [];
    if (!action) {
      if (hasXY) { want.push('percentOf', 'isWhatPercent'); }
      if (hasFT) { want.push('percentChange'); }
    }

    const out = { computed_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL };

    if (want.includes('percentOf') || want.includes('isWhatPercent')) {
      const x = num(p.get('x'), 'x');
      const y = num(p.get('y'), 'y');
      if (x === null || y === null) {
        return Response.json({ error: "Actions percentOf / isWhatPercent require numeric params 'x' and 'y'. Example: /api?x=15&y=200" }, { status: 400, headers: JSON_HEADERS });
      }
      if (want.includes('percentOf')) {
        out.percentOf = { question: `${x}% of ${y}`, result: round10((x / 100) * y), formula: `${x} / 100 × ${y}` };
      }
      if (want.includes('isWhatPercent')) {
        if (y === 0) {
          return Response.json({ error: "'y' cannot be 0 for isWhatPercent (division by zero). Use action=percentOf if you only need X% of Y." }, { status: 400, headers: JSON_HEADERS });
        }
        out.isWhatPercent = { question: `${x} is what percent of ${y}`, result: round10((x / y) * 100), formula: `${x} / ${y} × 100` };
      }
    }

    if (want.includes('percentChange')) {
      const from = num(p.get('from'), 'from');
      const to = num(p.get('to'), 'to');
      if (from === null || to === null) {
        return Response.json({ error: "Action percentChange requires numeric params 'from' and 'to'. Example: /api?from=150&to=180" }, { status: 400, headers: JSON_HEADERS });
      }
      if (from === 0) {
        return Response.json({ error: "'from' cannot be 0 for percentChange (division by zero)." }, { status: 400, headers: JSON_HEADERS });
      }
      const change = round10(((to - from) / Math.abs(from)) * 100);
      out.percentChange = { question: `percentage change from ${from} to ${to}`, result: change, direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'no change', formula: `(${to} − ${from}) / |${from}| × 100` };
    }

    return Response.json(out, { headers: JSON_HEADERS });
  } catch (e) {
    return Response.json({ error: e.message || 'Invalid input' }, { status: 400, headers: JSON_HEADERS });
  }
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
