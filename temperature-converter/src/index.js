// Privacy-First Temperature Converter API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://temperature-converter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/temperature-converter';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Temperature Converter API (Celsius, Fahrenheit, Kelvin, Rankine) — Free &amp; Private</title>
<meta name="description" content="Free temperature converter API: Celsius ⇄ Fahrenheit ⇄ Kelvin ⇄ Rankine in one call, with absolute-zero validation — zero tracking. Full tool on formatho.com.">
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
  <h1>Temperature Converter API — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># 100 °C to Fahrenheit
curl "${HOST}/api?value=100&amp;from=c&amp;to=f"

# 25 °C in every unit (omit 'to')
curl "${HOST}/api?value=25&amp;from=celsius"</code></pre>
<p>Units: <code>c</code>/<code>celsius</code>/<code>centigrade</code>, <code>f</code>/<code>fahrenheit</code>, <code>k</code>/<code>kelvin</code>, <code>r</code>/<code>rankine</code> (case-insensitive). Every response includes the value in all four scales, and values below absolute zero are rejected.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> conversions are computed in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Convert temperatures entirely client-side: <a href="${FULL_TOOL}">Temperature Converter on formatho.com</a>.</p>
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
  endpoint: 'GET /api?value=<number>&from=<unit>&to=<unit>',
  units: {
    c: 'Celsius (aliases: celsius, centigrade)',
    f: 'Fahrenheit (alias: fahrenheit)',
    k: 'Kelvin (alias: kelvin)',
    r: 'Rankine (alias: rankine)',
  },
  notes: "'to' is optional — the response always includes Celsius, Fahrenheit, Kelvin and Rankine. Values below absolute zero return 400.",
  examples: [`${HOST}/api?value=100&from=c&to=f`, `${HOST}/api?value=98.6&from=fahrenheit`],
  full_tool: FULL_TOOL,
};

const UNITS = {
  c: 'celsius', celsius: 'celsius', centigrade: 'celsius',
  f: 'fahrenheit', fahrenheit: 'fahrenheit',
  k: 'kelvin', kelvin: 'kelvin',
  r: 'rankine', rankine: 'rankine',
};
const ABSOLUTE_ZERO = { celsius: -273.15, fahrenheit: -459.67, kelvin: 0, rankine: 0 };

const toCelsius = { celsius: (v) => v, fahrenheit: (v) => (v - 32) * (5 / 9), kelvin: (v) => v - 273.15, rankine: (v) => (v - 491.67) * (5 / 9) };
const fromCelsius = { celsius: (c) => c, fahrenheit: (c) => c * (9 / 5) + 32, kelvin: (c) => c + 273.15, rankine: (c) => (c + 273.15) * (9 / 5) };

const round4 = (n) => Math.round(n * 1e4) / 1e4;

function handleApi(request) {
  const p = new URL(request.url).searchParams;
  const valueRaw = p.get('value');
  const fromRaw = p.get('from') || 'celsius';
  const toRaw = p.get('to');

  if (valueRaw === null || String(valueRaw).trim() === '') {
    return Response.json({ error: "Missing required parameter: value. Example: /api?value=100&from=c&to=f", usage: API_DOC }, { status: 400, headers: JSON_HEADERS });
  }
  const value = Number(valueRaw);
  if (!Number.isFinite(value)) {
    return Response.json({ error: `Parameter 'value' must be a finite number (got: ${JSON.stringify(valueRaw)})`, usage: API_DOC }, { status: 400, headers: JSON_HEADERS });
  }

  const from = UNITS[String(fromRaw).toLowerCase()];
  if (!from) {
    return Response.json({ error: `Unknown 'from' unit '${fromRaw}'. Valid: c/celsius, f/fahrenheit, k/kelvin, r/rankine`, usage: API_DOC }, { status: 400, headers: JSON_HEADERS });
  }
  let to = null;
  if (toRaw !== null) {
    to = UNITS[String(toRaw).toLowerCase()];
    if (!to) {
      return Response.json({ error: `Unknown 'to' unit '${toRaw}'. Valid: c/celsius, f/fahrenheit, k/kelvin, r/rankine`, usage: API_DOC }, { status: 400, headers: JSON_HEADERS });
    }
  }

  if (value < ABSOLUTE_ZERO[from]) {
    return Response.json({ error: `${value}° ${from} is below absolute zero (${ABSOLUTE_ZERO[from]}° ${from}).` }, { status: 400, headers: JSON_HEADERS });
  }

  const c = toCelsius[from](value);
  const all = {
    celsius: round4(fromCelsius.celsius(c)),
    fahrenheit: round4(fromCelsius.fahrenheit(c)),
    kelvin: round4(fromCelsius.kelvin(c)),
    rankine: round4(fromCelsius.rankine(c)),
  };

  const out = {
    input: { value, unit: from },
    conversions: all,
    computed_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  };
  if (to) out.result = { unit: to, value: all[to] };
  return Response.json(out, { headers: JSON_HEADERS });
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
