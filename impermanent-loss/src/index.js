// Privacy-First Impermanent Loss Calculator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection. Pure math, no state, nothing logged',
};
const HOST = 'https://impermanent-loss-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/impermanent-loss';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Impermanent Loss Calculator API — Free &amp; Private</title>
<meta name="description" content="Calculate impermanent loss via API: constant-product AMM (x·y=k) LP value vs HODL for any price ratio, with deposit amounts, exit balances, fee break-even and a 10-point scenario table. Privacy-first edge API.">
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
  "name": "Impermanent Loss Calculator API — Free & Private",
  "url": "https://impermanent-loss-formatho.filesformatho.workers.dev/",
  "description": "Calculate impermanent loss via API: constant-product AMM (x·y=k) LP value vs HODL for any price ratio, with deposit amounts, exit balances, fee break-even and a 10-point scenario table. Privacy-first edge API.",
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
  <h1>Impermanent Loss Calculator — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?amount_a=1&amp;amount_b=4000&amp;p1=8000"

curl -X POST ${HOST}/api -H 'Content-Type: application/json' \\
  -d '{"price_change":100,"amount_a":1,"amount_b":4000}'</code></pre>
<p>Constant-product AMM (Uniswap&nbsp;V2-style, <code>x·y=k</code>) impermanent loss: give your deposit as <code>amount_a</code>/<code>amount_b</code> (token A priced in token B) plus the exit price <code>p1</code>, or just two prices <code>p0</code>/<code>p1</code>, or a <code>price_change</code> percent. Returns LP exit balances vs HODL, the loss in percent and token-B units, the fee yield needed to break even, and a scenario table from −75% to +300%.</p>
<p class="tagline">Pure math at the edge — nothing is logged or stored.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> calculations run in-memory at the edge; no logs, no storage, no telemetry.</div>
<h2>Full browser tool</h2>
<p>Model with a full UI: <a href="${FULL_TOOL}">Impermanent Loss Calculator on formatho.com</a>. Also see the <a href="https://apy-calculator-formatho.filesformatho.workers.dev/">APY Calculator</a>.</p>
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

const LLMS_TXT = "# Impermanent Loss Calculator API — Free & Private\n\n> Constant-product AMM (x·y=k, Uniswap V2-style) impermanent loss: LP value vs HODL for any price ratio, deposit/exit balances, fee break-even, scenario table. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://impermanent-loss-formatho.filesformatho.workers.dev/\n- [JSON API]: https://impermanent-loss-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/impermanent-loss\n- [All 55 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

const SCENARIOS = [-75, -50, -25, -10, 10, 25, 50, 75, 100, 200, 300];
const r6 = (x) => Math.round(x * 1e6) / 1e6;
const r8 = (x) => Math.round(x * 1e8) / 1e8;

function ilAtRatio(r) {
  return (2 * Math.sqrt(r)) / (1 + r) - 1; // ≤ 0
}

function parseNum(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function compute({ amountA, amountB, p0, p1 }) {
  const k = amountA * amountB;
  const ratio = p1 / p0;
  const lpA = Math.sqrt(k / p1);
  const lpB = Math.sqrt(k * p1);
  const lpValue = lpA * p1 + lpB; // = 2·√(k·p1)
  const depositValue = amountA * p0 + amountB;
  const hodlValue = amountA * p1 + amountB;
  const ilPct = lpValue / hodlValue - 1;
  const feeBreakeven = hodlValue / lpValue - 1;
  return {
    model: 'constant-product AMM x·y=k (Uniswap V2-style); excludes LP fees, rebalancing and gas',
    formula: 'IL = 2·√r/(1+r) − 1 where r = p1/p0',
    deposit: { amount_a: r6(amountA), amount_b: r6(amountB), value_b: r6(depositValue) },
    initial_price: r8(p0),
    exit_price: r8(p1),
    price_ratio: r8(ratio),
    price_change_pct: r6((ratio - 1) * 100),
    exit: {
      lp: { amount_a: r6(lpA), amount_b: r6(lpB), value_b: r6(lpValue) },
      hodl: { amount_a: r6(amountA), amount_b: r6(amountB), value_b: r6(hodlValue) },
    },
    impermanent_loss_pct: r8(ilPct * 100),
    il_amount_b: r6(lpValue - hodlValue),
    fee_breakeven_pct: r8(feeBreakeven * 100),
    scenarios: SCENARIOS.map(pc => {
      const p = p0 * (1 + pc / 100);
      return { price_change_pct: pc, exit_price: r8(p), impermanent_loss_pct: r8(ilAtRatio(p / p0) * 100) };
    }),
    full_tool: FULL_TOOL,
    privacy: 'Computed in-memory at the edge; never logged or stored',
    generated_by: 'Formatho edge API — zero tracking',
  };
}

function buildInputs(raw) {
  const amountA = parseNum(raw.amount_a);
  const amountB = parseNum(raw.amount_b);
  const p0 = parseNum(raw.p0 ?? raw.initial_price);
  const p1 = parseNum(raw.p1 ?? raw.exit_price ?? raw.future_price);
  const priceChange = parseNum(raw.price_change);
  const hasAmounts = amountA !== undefined && amountB !== undefined;

  if (hasAmounts) {
    if (amountA <= 0 || amountB <= 0 || Number.isNaN(amountA) || Number.isNaN(amountB)) return { err: 'amount_a and amount_b must both be positive numbers (token A priced in token B).' };
    const base = p0 ?? amountB / amountA;
    if (base <= 0) return { err: 'p0 must be positive.' };
    if (p1 === undefined && priceChange === undefined) return { err: 'Provide the exit price p1 (or price_change) — deposit amounts alone give p0 = amount_b/amount_a.' };
    const exit = p1 !== undefined ? p1 : base * (1 + priceChange / 100);
    if (Number.isNaN(exit) || exit <= 0) return { err: 'Exit price must be a positive number (price_change of -100% means the price hit zero — no pool exists).' };
    return { amountA, amountB, p0: base, p1: exit };
  }

  if (p0 !== undefined || p1 !== undefined) {
    if (p0 === undefined || p1 === undefined) return { err: 'Provide both p0 (initial price) and p1 (exit price), or amount_a + amount_b + p1.' };
    if (p0 <= 0 || p1 <= 0 || Number.isNaN(p0) || Number.isNaN(p1)) return { err: 'p0 and p1 must both be positive numbers.' };
    return { amountA: 1, amountB: p0, p0, p1 };
  }

  if (priceChange !== undefined) {
    if (Number.isNaN(priceChange) || priceChange <= -100) return { err: 'price_change must be a number greater than -100 (percent). -100% means the price hit zero.' };
    return { amountA: 1, amountB: 1, p0: 1, p1: 1 + priceChange / 100 };
  }

  return { err: 'No inputs. Provide amount_a + amount_b + p1 (recommended), or p0 + p1, or price_change. amount_a=1.5 ETH & amount_b=6000 USDC deposits 1.5 ETH priced at 4000 USDC.' };
}

async function handleApi(request) {
  let raw;
  if (request.method === 'POST') {
    raw = await request.json().catch(() => ({ __bad: true }));
    if (raw === null || raw === undefined || raw.__bad) return err400('POST body must be JSON, e.g. {"amount_a":1,"amount_b":4000,"p1":8000}');
  } else {
    const url = new URL(request.url);
    raw = {};
    for (const [k, v] of url.searchParams.entries()) raw[k.toLowerCase()] = v;
  }
  const inputs = buildInputs(raw);
  if (inputs.err) return err400(inputs.err);
  return Response.json(compute(inputs), { headers: JSON_HEADERS });
}

const API_HELP = {
  description: 'Impermanent loss for constant-product AMM (x·y=k) liquidity providers: LP vs HODL value, exit balances, fee break-even, scenario table.',
  example_post: `curl -X POST ${HOST}/api -H 'Content-Type: application/json' -d '{"amount_a":1,"amount_b":4000,"p1":8000}'`,
  example_get: `${HOST}/api?price_change=100`,
  params: {
    amount_a: 'deposit quantity of token A (positive number)',
    amount_b: 'deposit quantity of token B (positive number); with amount_a this sets p0 = amount_b/amount_a',
    p0: 'initial price of token A in token B (alternative to amounts)',
    p1: 'exit price of token A in token B (required unless price_change given)',
    price_change: 'percent change of token A vs token B at exit, e.g. 50 = +50%, -75 = −75% (alternative to p1)',
  },
  known_values: { '1.25x': '-0.62%', '1.5x': '-2.02%', '2x': '-5.72%', '3x': '-13.40%', '4x': '-20.00%', '5x': '-25.46%' },
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
      if (url.searchParams.toString() === '' && request.method === 'GET') return Response.json(API_HELP, { headers: JSON_HEADERS });
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
