// Privacy-First GTIN Validator & Check Digit Calculator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://gtin-validator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/gtin-validator';
const VALID_LENGTHS = new Set([8, 12, 13, 14]);
const TYPE_NAMES = { 8: 'GTIN-8 (EAN/UCC-8)', 12: 'GTIN-12 (UPC-A / UCC-12)', 13: 'GTIN-13 (EAN-13 / UCC-13)', 14: 'GTIN-14 (ITF-14 / EAN/UCC-14)' };

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GTIN Validator &amp; Check Digit Calculator Online — Free &amp; Private</title>
<meta name="description" content="Validate GTIN-8/12/13/14 (EAN/UPC/ITF-14) barcodes and compute GS1 mod-10 check digits with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com.">
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
  "name": "GTIN Validator & Check Digit Calculator Online — Free & Private",
  "url": "https://gtin-validator-formatho.filesformatho.workers.dev/",
  "description": "Validate GTIN-8/12/13/14 (EAN/UPC/ITF-14) barcodes and compute GS1 mod-10 check digits with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com.",
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
  <h1>GTIN Validator &amp; Check Digit Calculator — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — validate</h2>
<pre><code>curl "${HOST}/api?gtin=4006381333931"</code></pre>
<p>Checks structure (digits, length) and the GS1 mod-10 check digit; returns the expected digit, GTIN-14 padded form and type name.</p>
<h2>Usage — compute a check digit</h2>
<pre><code>curl "${HOST}/api?base=629104150021"</code></pre>
<p>Give the first 7/11/12/13 digits, get the check digit that completes a valid GTIN.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> validation runs in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Validate barcodes entirely client-side: <a href="${FULL_TOOL}">GTIN Validator on formatho.com</a>.</p>
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

const LLMS_TXT = "# GTIN Validator & Check Digit Calculator Online — Free & Private\n\n> Validate GTIN-8/12/13/14 (EAN/UPC/ITF-14) barcodes and compute GS1 mod-10 check digits with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://gtin-validator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://gtin-validator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/gtin-validator\n- [All 42 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

// GS1 spec: from the rightmost digit (the check digit) moving left, weights alternate 3,1,3,1…
function checkDigitFor(digitsNoCheck) {
  const rev = [...digitsNoCheck].reverse();
  let sum = 0;
  for (let i = 0; i < rev.length; i++) sum += rev[i] * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

function parseArgs(request) {
  if (request.method === 'POST') return request.json().then(body => ({ gtin: body.gtin, base: body.base })).catch(() => ({ __bad: true }));
  const url = new URL(request.url);
  return Promise.resolve({ gtin: url.searchParams.get('gtin'), base: url.searchParams.get('base') });
}

async function handleApi(request) {
  const { gtin, base, __bad } = await parseArgs(request);
  if (__bad) return err400('POST body must be JSON: {"gtin": "4006381333931"} or {"base": "629104150021"}');

  // Check-digit calculator mode: base = all digits except the final check digit.
  if (base !== null && base !== undefined) {
    const clean = String(base).replace(/[\s-]/g, '');
    if (!/^\d+$/.test(clean)) return err400('base must contain only digits (spaces and hyphens are stripped)');
    if (!VALID_LENGTHS.has(clean.length + 1)) return err400(`base must be 7, 11, 12, or 13 digits (got ${clean.length}, which yields no valid GTIN length)`);
    const d = clean.split('').map(Number);
    const cd = checkDigitFor(d);
    const full = clean + cd;
    return Response.json({
      base: clean,
      check_digit: cd,
      gtin: full,
      type: TYPE_NAMES[full.length],
      gtin14: full.padStart(14, '0'),
      spec: 'GS1 General Specifications, mod-10 (weights 3/1 alternating from the right)',
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    }, { headers: JSON_HEADERS });
  }

  if (gtin === null || gtin === undefined || gtin === '') return err400('Missing required parameter: gtin (or base to compute a check digit)');
  const clean = String(gtin).replace(/[\s-]/g, '');
  if (!/^\d+$/.test(clean)) return err400('gtin must contain only digits (spaces and hyphens are stripped)');
  if (!VALID_LENGTHS.has(clean.length)) return err400(`gtin must be 8, 12, 13, or 14 digits (got ${clean.length})`);
  const d = clean.split('').map(Number);
  const expected = checkDigitFor(d.slice(0, -1));
  const valid = d[d.length - 1] === expected;
  return Response.json({
    gtin: clean,
    type: TYPE_NAMES[clean.length],
    valid,
    check_digit: d[d.length - 1],
    expected_check_digit: expected,
    gtin14: clean.padStart(14, '0'),
    spec: 'GS1 General Specifications, mod-10 (weights 3/1 alternating from the right)',
    decoded_by: 'Formatho edge API — zero tracking',
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
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
