// Privacy-First IBAN Validator API — formatho.com
// ISO 13616: structure + per-country length + mod-97 check.
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/iban-validator';

// IBAN lengths per the SWIFT IBAN registry (subset of common countries).
const IBAN_LENGTHS = {
  AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BE: 16, BA: 20, BR: 29, BG: 22,
  CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28, EE: 20, FO: 18, FI: 18,
  FR: 27, GE: 22, DE: 22, GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26,
  IE: 22, IL: 23, IT: 27, JO: 30, KW: 30, KZ: 20, LV: 21, LB: 28, LI: 21,
  LT: 20, LU: 20, LY: 25, MK: 19, MT: 31, MR: 27, MU: 30, MC: 27, MD: 24,
  ME: 22, NL: 18, NO: 15, PK: 24, PS: 29, PL: 28, PT: 25, QA: 29, RO: 24,
  SM: 27, SA: 24, RS: 22, SC: 31, SK: 24, SI: 19, ES: 24, SE: 24, CH: 21,
  TN: 24, TR: 26, UA: 29, AE: 23, GB: 22, VA: 22, VG: 24,
};
const COUNTRY_NAMES = {
  DE: 'Germany', FR: 'France', GB: 'United Kingdom', NL: 'Netherlands', BE: 'Belgium',
  ES: 'Spain', IT: 'Italy', CH: 'Switzerland', AT: 'Austria', PT: 'Portugal',
  IE: 'Ireland', LU: 'Luxembourg', SE: 'Sweden', DK: 'Denmark', FI: 'Finland',
  NO: 'Norway', PL: 'Poland', CZ: 'Czechia', HU: 'Hungary', RO: 'Romania',
  GR: 'Greece', TR: 'Turkey', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
  QA: 'Qatar', IL: 'Israel', BR: 'Brazil', AU: 'not IBAN', CA: 'not IBAN',
};

function validateIban(raw) {
  const input = String(raw);
  const electronic = input.replace(/[\s.\-]/g, '').toUpperCase();
  const errors = [];
  const out = {
    input,
    electronic,
    formatted: electronic.match(/.{1,4}/g)?.join(' ') || electronic,
  };

  if (!electronic) { errors.push('No IBAN provided'); }
  if (electronic.length > 34) errors.push(`Too long: ${electronic.length} characters (max 34)`);
  if (!/^[A-Z]{2}/.test(electronic)) errors.push('Must start with a 2-letter country code');
  else if (!/^\d{2}/.test(electronic.slice(2))) errors.push('Country code must be followed by 2 check digits');

  const country = electronic.slice(0, 2);
  const expectedLen = IBAN_LENGTHS[country];
  out.country = country || null;
  out.country_name = COUNTRY_NAMES[country] || null;
  out.length_known = expectedLen !== undefined;
  out.length_ok = expectedLen === undefined ? null : electronic.length === expectedLen;
  if (expectedLen !== undefined && electronic.length !== expectedLen) {
    errors.push(`Length ${electronic.length} is wrong for ${country} (expected ${expectedLen})`);
  }
  if (!/^[A-Z0-9]+$/.test(electronic)) errors.push('Contains invalid characters (letters and digits only)');

  out.check_digits = electronic.slice(2, 4) || null;
  out.mod_97 = null;
  if (electronic.length >= 5 && /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(electronic)) {
    // Move first 4 chars to the end, expand letters to digits, mod 97.
    const rearranged = electronic.slice(4) + electronic.slice(0, 4);
    const expanded = [...rearranged].map(c => (c >= 'A' && c <= 'Z') ? String(c.charCodeAt(0) - 55) : c).join('');
    // BigInt mod is exact and instant at IBAN sizes (max ~68 digits).
    out.mod_97 = Number(BigInt(expanded) % 97n);
    if (out.mod_97 !== 1) errors.push(`mod-97 check failed (${out.mod_97} ≠ 1) — IBAN is invalid or mistyped`);
  }

  out.valid = errors.length === 0;
  if (errors.length) out.errors = errors;
  return out;
}

async function api(request) {
try {
  const url = new URL(request.url);
  let iban = url.searchParams.get('iban');

  if (!iban && request.method === 'POST') {
    const body = await request.text();
    iban = body.trim().startsWith('{') ? (JSON.parse(body).iban ?? null) : body;
  }

  if (!iban) {
    return new Response(JSON.stringify({
      error: 'Missing iban parameter',
      usage: 'GET /api?iban=GB82WEST12345698765432 — spaces/dots/dashes ignored, case-insensitive. POST raw IBAN body also works.',
      privacy: 'Zero tracking, zero data collection',
      full_tool: FULL_TOOL,
    }, null, 2), { headers: JSON_HEADERS });
  }

  const result = validateIban(iban);
  return new Response(JSON.stringify({
    ...result, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
  }, null, 2), { headers: JSON_HEADERS });
} catch (error) {
  return new Response(JSON.stringify({
    error: error.message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
  }, null, 2), { status: 400, headers: JSON_HEADERS });
}
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IBAN Validator &amp; Checker Online — Free &amp; Private</title>
<meta name="description" content="Validate IBANs instantly — ISO 13616 structure, per-country length rules and the mod-97 checksum. Formats to electronic &amp; paper form. Free, privacy-first, zero tracking.">
<link rel="canonical" href="https://iban-validator-formatho.filesformatho.workers.dev/">
<link rel="alternate" type="application/json" href="https://iban-validator-formatho.filesformatho.workers.dev/api">
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
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "IBAN Validator & Checker Online — Free & Private",
  "url": "https://iban-validator-formatho.filesformatho.workers.dev/",
  "description": "Validate IBANs instantly — ISO 13616 structure, per-country length rules and the mod-97 checksum. Formats to electronic & paper form. Free, privacy-first, zero tracking.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Free edge API",
    "Zero tracking",
    "No data collection",
    "No signup required"
  ],
  "publisher": {
    "@type": "Organization",
    "name": "Formatho",
    "url": "https://formatho.com"
  }
}
</script>
</head>
<body>
<header>
  <h1>IBAN Validator &amp; Checker Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code>curl &quot;https://iban-validator-formatho.filesformatho.workers.dev/api?iban=GB82WEST12345698765432&quot;</code></pre>
<pre><code>curl "https://iban-validator-formatho.filesformatho.workers.dev/api?iban=DE89 3704 0044 0532 0130 00"</code></pre>
<p>Full parameter reference and live response: <a href="https://iban-validator-formatho.filesformatho.workers.dev/api">/api endpoint</a>.</p>

<h2>What gets checked?</h2>
<p>The validator runs the full ISO 13616 gauntlet: country-code structure, per-country IBAN length from the SWIFT registry (60+ countries), allowed character set, and the <strong>mod-97 checksum</strong> computed over the rearranged, digit-expanded IBAN. You also get the electronic (no spaces) and paper (4-character groups) formats back.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> every request is processed in-memory on Cloudflare's edge and answered immediately. No logs, no analytics, no cookies, no data collection — your IBAN never leaves the edge node that served you. See the <a href="https://formatho.com">Formatho privacy philosophy</a>.
</div>

<h2>Full browser tool</h2>
<p>Prefer a UI? Use the complete client-side version — validation happens right in your browser: <a href="https://formatho.com/tools/iban-validator">IBAN Validator on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://iban-validator-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://iban-validator-formatho.filesformatho.workers.dev/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://iban-validator-formatho.filesformatho.workers.dev/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

const LLMS_TXT = "# IBAN Validator & Checker Online — Free & Private\n\n> Validate IBANs instantly — ISO 13616 structure, per-country length rules and the mod-97 checksum. Formats to electronic & paper form. Free, privacy-first, zero tracking. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://iban-validator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://iban-validator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/iban-validator\n- [All 38 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

export default {
  async fetch(request) {
    const url = new URL(request.url);
if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
        if (url.pathname === '/sitemap.xml') {
      return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/api' || url.pathname === '/api/') {
      return api(request);
    }
    if (url.pathname === '/') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Privacy-Policy': 'Zero tracking, zero data collection' } });
    }
    return new Response('Not found. See <a href="/">the tool page</a> or <a href="/api">/api</a>.', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
