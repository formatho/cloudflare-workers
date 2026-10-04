// Privacy-First APY Calculator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://apy-calculator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/apy-calculator';

const COMPOUND_LABELS = { 1: 'annually', 2: 'semi-annually', 4: 'quarterly', 6: 'every 2 months', 12: 'monthly', 24: 'semi-monthly', 26: 'bi-weekly', 52: 'weekly', 365: 'daily' };

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>APY Calculator Online — Free &amp; Private</title>
<meta name="description" content="Convert APR to APY for any compounding frequency (daily, monthly, continuous…) and project growth with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com.">
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
  "name": "APY Calculator Online — Free & Private",
  "url": "https://apy-calculator-formatho.filesformatho.workers.dev/",
  "description": "Convert APR to APY for any compounding frequency (daily, monthly, continuous…) and project growth with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com.",
  "applicationCategory": "FinanceApplication",
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
  <h1>APY Calculator — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — APR to APY</h2>
<pre><code>curl "${HOST}/api?apr=5&amp;n=12"</code></pre>
<p>5% APR compounded monthly → 5.1162% APY. Supports any compounding frequency from annually to daily, plus <code>n=continuous</code>.</p>
<h2>Usage — with growth projection</h2>
<pre><code>curl "${HOST}/api?apr=4.5&amp;n=365&amp;principal=10000&amp;years=5"</code></pre>
<p>Add a principal and term to get the final balance and interest earned.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> math runs in-memory at the edge; nothing you send is logged or stored.</div>
<h2>Full browser tool</h2>
<p>Compute APY entirely client-side: <a href="${FULL_TOOL}">APY Calculator on formatho.com</a>.</p>
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

const LLMS_TXT = "# APY Calculator Online — Free & Private\n\n> Convert APR to APY for any compounding frequency (daily, monthly, continuous…) and project growth with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://apy-calculator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://apy-calculator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/apy-calculator\n- [All 44 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

const round = (x, dp) => Math.round(x * 10 ** dp) / 10 ** dp;

async function parseArgs(request) {
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return { __bad: true };
    return {
      apr: body.apr,
      n: body.compoundings !== undefined ? body.compoundings : body.n,
      principal: body.principal,
      years: body.years,
    };
  }
  const url = new URL(request.url);
  return {
    apr: url.searchParams.get('apr'),
    n: url.searchParams.get('n'),
    principal: url.searchParams.get('principal'),
    years: url.searchParams.get('years'),
  };
}

async function handleApi(request) {
  const { apr, n, principal, years, __bad } = await parseArgs(request);
  if (__bad) return err400('POST body must be JSON: {"apr": 5, "n": 12, "principal": 10000, "years": 5}');

  if (apr === null || apr === undefined || apr === '') return err400('Missing required parameter: apr (annual percentage rate, e.g. 5 for 5%)');
  const aprNum = Number(apr);
  if (!Number.isFinite(aprNum)) return err400(`apr must be a number (got "${apr}")`);
  if (aprNum <= -100) return err400('apr must be greater than -100% (a rate of -100% or below wipes out any balance)');
  if (aprNum > 100000) return err400('apr must be at most 100000% (got ' + aprNum + ')');

  // Compounding frequency: 'continuous' or a positive integer per year (default 12 = monthly).
  const raw = n === null || n === undefined ? '' : String(n).trim().toLowerCase();
  const isContinuous = raw === 'continuous' || raw === 'inf';
  let nPerYear = 12;
  if (!isContinuous && raw !== '') {
    if (!/^\d+$/.test(raw)) return err400(`n must be a positive integer (compounds per year, 1-365) or "continuous" (got "${n}")`);
    nPerYear = Number(raw);
    if (nPerYear < 1 || nPerYear > 365) return err400('n must be between 1 and 365 compounds per year, or "continuous"');
  }

  // APY = (1 + r/n)^n - 1 ; continuous: e^r - 1
  const r = aprNum / 100;
  const apyDecimal = isContinuous ? Math.exp(r) - 1 : (1 + r / nPerYear) ** nPerYear - 1;

  const result = {
    apr_pct: aprNum,
    compounding: isContinuous
      ? { mode: 'continuous', times_per_year: null, description: 'compounded continuously' }
      : { mode: 'discrete', times_per_year: nPerYear, description: `compounded ${COMPOUND_LABELS[nPerYear] || nPerYear + ' times per year'}` },
    apy_pct: round(apyDecimal * 100, 6),
    apy_decimal: round(apyDecimal, 8),
    difference_vs_apr_pct: round(apyDecimal * 100 - aprNum, 6),
    formula: isContinuous ? 'APY = e^(APR/100) - 1' : 'APY = (1 + APR/100/n)^n - 1',
    calculated_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  };

  const hasPrincipal = principal !== null && principal !== undefined && principal !== '';
  if (hasPrincipal) {
    const p = Number(principal);
    if (!Number.isFinite(p) || p < 0) return err400(`principal must be a non-negative number (got "${principal}")`);
  }
  const hasYears = years !== null && years !== undefined && years !== '';
  if (hasYears) {
    const yv = Number(years);
    if (!Number.isFinite(yv) || yv < 0) return err400(`years must be a non-negative number (got "${years}")`);
    if (yv > 10000) return err400('years must be at most 10000');
  }

  if (hasPrincipal) {
    const p = Number(principal);
    const y = hasYears ? Number(years) : 1;
    const growthFactor = isContinuous ? Math.exp(r * y) : (1 + r / nPerYear) ** (nPerYear * y);
    result.projection = {
      principal: p,
      years: y,
      final_balance: round(p * growthFactor, 2),
      interest_earned: round(p * growthFactor - p, 2),
      total_return_pct: round((growthFactor - 1) * 100, 6),
    };
  }

  return Response.json(result, { headers: JSON_HEADERS });
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
