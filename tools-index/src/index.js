// Formatho Tools Index — directory of all free privacy-first edge APIs
// HTML index at /, JSON list at /api, sitemap at /sitemap.xml

const TOOLS = [
  ['JSON Formatter', 'Format & validate JSON with configurable indent.', 'https://json-formatter-formatho.filesformatho.workers.dev/', 'https://formatho.com/json-formatter'],
  ['Base64 Encoder/Decoder', 'Unicode-safe Base64 encode & decode.', 'https://base64-formatho.filesformatho.workers.dev/', 'https://formatho.com/base64-encoder-decoder'],
  ['URL Encoder/Decoder', 'Percent-encode & decode URLs.', 'https://url-encoder-formatho.filesformatho.workers.dev/', 'https://formatho.com/url-encoder-decoder'],
  ['MD5 Generator', 'MD5 hashes for checksums & legacy use.', 'https://md5-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/md5-generator'],
  ['UUID Generator', 'RFC 4122 v4 UUIDs, bulk up to 100.', 'https://uuid-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/uuid-generator'],
  ['SHA-256 Generator', 'SHA-256 hashes via Web Crypto.', 'https://sha256-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/sha256-generator'],
  ['Random String Generator', 'Crypto-secure random strings, 4 charsets.', 'https://random-string-formatho.filesformatho.workers.dev/', 'https://formatho.com/random-string-generator'],
  ['Timestamp Converter', 'Unix ⇄ ISO/UTC, auto s/ms detection.', 'https://timestamp-converter-formatho.filesformatho.workers.dev/', 'https://formatho.com/timestamp-converter'],
  ['Slug Generator', 'SEO-friendly URL slugs, diacritic folding.', 'https://slug-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/slug-generator'],
  ['Hash Generator', 'MD5, SHA-1, SHA-256, SHA-512 in one call.', 'https://hash-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/hash-generator'],
  ['JWT Decoder', 'Decode JWT header, payload & claims (no verification).', 'https://jwt-decoder-formatho.filesformatho.workers.dev/', 'https://formatho.com/jwt'],
  ['Cron Expression Explainer', 'Plain-English cron explanations + next run times.', 'https://cron-parser-formatho.filesformatho.workers.dev/', 'https://formatho.com/crontab-generator'],
  ['Case Converter', 'camelCase, snake_case, kebab-case & 8 more in one call.', 'https://case-converter-formatho.filesformatho.workers.dev/', 'https://formatho.com/case-converter'],
  ['Lorem Ipsum Generator', 'Placeholder paragraphs/sentences, json|text|html.', 'https://lorem-ipsum-formatho.filesformatho.workers.dev/', 'https://formatho.com/lorem'],
  ['HTML Entity Encoder/Decoder', 'Encode text to HTML entities & decode them back, Unicode-aware.', 'https://html-entity-encoder-formatho.filesformatho.workers.dev/', 'https://formatho.com/html-entity-encoder'],
  ['Password Generator', 'Crypto-secure passwords, 8–128 chars, custom charsets, bulk.', 'https://password-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/password-generator'],
  ['CSV to JSON Converter', 'CSV → JSON with headers, quoted fields, auto-typing, GET or POST.', 'https://csv-to-json-formatho.filesformatho.workers.dev/', 'https://formatho.com/csv-to-json'],
  ['JSON to CSV Converter', 'JSON arrays → CSV with RFC 4180 escaping & custom delimiters.', 'https://json-to-csv-formatho.filesformatho.workers.dev/', 'https://formatho.com/json-to-csv'],
  ['Regex Tester', 'Test regular expressions — matches, capture & named groups, indices as JSON.', 'https://regex-tester-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/regex-tester'],
  ['Color Converter', 'HEX ⇄ RGB ⇄ HSL ⇄ HSV/CMYK + WCAG luminance in one call.', 'https://color-converter-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/color-converter'],
  ['Diff Checker', 'Compare two texts line by line — Myers diff, unified hunks, ignore-whitespace.', 'https://diff-checker-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/diff'],
  ['Number Base Converter', 'Binary, octal, decimal, hex & any base 2-36 — BigInt-safe.', 'https://base-converter-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/integer-base-converter'],
  ['Roman Numeral Converter', 'Numbers ⇄ Roman numerals, strict canonical validation.', 'https://roman-numeral-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/roman-numeral-converter'],
  ['IPv4 Subnet Calculator', 'CIDR math: netmask, broadcast, host range, class & privacy flags.', 'https://subnet-calculator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/ipv4-subnet-calculator'],
  ['XML Formatter', 'Pretty-print, minify & validate XML with error line/column.', 'https://xml-formatter-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/xml-formatter'],
  ['chmod Calculator', '755 ⇄ rwxr-xr-x both ways, setuid/setgid/sticky, plain English.', 'https://chmod-calculator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/chmod-calculator'],
  ['HMAC Generator', 'HMAC signatures: SHA-1/256/384/512, hex or Base64.', 'https://hmac-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/hmac-generator'],
  ['URL Parser', 'Any URL → protocol, host, port, path, query params, hash as JSON.', 'https://url-parser-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/url-parser'],
  ['Text ⇄ Binary Converter', 'Text → UTF-8 binary/hex/codepoints and back, Unicode-safe.', 'https://text-to-binary-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/text-to-binary'],
  ['JSON ⇄ YAML Converter', 'JSON → YAML and YAML → JSON, block scalars & flow style, clean 400s.', 'https://json-yaml-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/json-yaml'],
  ['TOTP Code Generator', 'RFC 6238/4226 codes: SHA-1/256/512, 6–8 digits, otpauth:// URLs.', 'https://totp-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/otp-code-generator'],
];

const SELF = 'https://formatho-tools.filesformatho.workers.dev';

function htmlPage() {
  const items = TOOLS.map(([name, desc, url, tool]) => `
  <article>
    <h2><a href="${url}" rel="noopener">${name}</a></h2>
    <p>${desc}</p>
    <p class="links">API: <a href="${url}" rel="noopener">${url.replace('https://', '')}</a> · Browser tool: <a href="${tool}" rel="noopener">formatho.com${new URL(tool).pathname}</a></p>
  </article>`).join('\n');

  const sitemapUrls = TOOLS.map(([,, url]) => `  <url><loc>${url}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Formatho Tools — Free Privacy-First Developer APIs</title>
<meta name="description" content="Directory of 31 free, privacy-first developer tool APIs: JSON, CSV, YAML, Base64, regex, color, diff checker, URL & HTML entity encoders, hashes, HMAC, TOTP, UUID, passwords, timestamps, JWT and more. Zero tracking.">
<link rel="canonical" href="${SELF}/">
<style>
:root { color-scheme: light dark; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem 3rem; line-height: 1.6; }
h1 { font-size: 1.6rem; }
article { border-bottom: 1px solid #8883; padding: 1rem 0; }
article h2 { margin: 0 0 .25rem; font-size: 1.15rem; }
article p { margin: .25rem 0; }
.links { font-size: .85rem; color: #888; }
a { color: #06c; }
footer { margin-top: 2rem; color: #888; font-size: .85rem; }
</style>
</head>
<body>
<h1>Formatho Tools — Free Privacy-First APIs</h1>
<p>${TOOLS.length} free developer tool APIs running on Cloudflare's edge. <strong>Zero tracking, zero data collection, zero logging.</strong> Every tool also has a full client-side version on <a href="https://formatho.com">formatho.com</a> where your data never leaves your browser.</p>
<section id="limits">
<h2>Cloudflare free-plan limits</h2>
<p>These APIs run on the Cloudflare Workers <strong>free plan</strong>. The request quota is <strong>per account</strong> — all Formatho edge APIs above share <strong>100,000 requests/day</strong> (resets 00:00 UTC) with <strong>10 ms CPU</strong> and <strong>128 MB memory</strong> per invocation. If the daily cap is exhausted, Cloudflare returns <a href="https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1027/" rel="noopener">error 1027</a> until the UTC reset; CPU or memory overruns surface as error 1102. For unlimited use, run the browser tools on <a href="https://formatho.com">formatho.com</a> (no server involved) or self-deploy any Worker on your own free account. Full limits: <a href="https://developers.cloudflare.com/workers/platform/limits/" rel="noopener">official Cloudflare docs</a>.</p>
</section>
${items}
<footer>© <a href="https://formatho.com">formatho.com</a> — privacy-first developer tools · <a href="/sitemap.xml">sitemap.xml</a> · <a href="/api">JSON list</a></footer>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/sitemap.xml') {
      const urls = TOOLS.map(([,, u]) => `  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SELF}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n${urls}\n</urlset>\n`;
      return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/api') {
      return new Response(JSON.stringify({
        count: TOOLS.length,
        tools: TOOLS.map(([name, desc, api, tool]) => ({ name, description: desc, api, browser_tool: tool })),
        site: 'https://formatho.com',
        privacy: 'Zero tracking, zero data collection',
        limits: {
          plan: 'Cloudflare Workers Free (per-account, shared by all workers above)',
          requests_per_day: 100000,
          daily_reset: '00:00 UTC',
          cpu_ms_per_request: 10,
          memory_mb: 128,
          on_daily_limit_exceeded: 'Cloudflare error 1027 until reset',
          on_cpu_or_memory_exceeded: 'Cloudflare error 1102',
          docs: 'https://developers.cloudflare.com/workers/platform/limits/',
        },
      }, null, 2), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Privacy-Policy': 'Zero tracking, zero data collection' } });
    }
    return new Response(htmlPage(), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Privacy-Policy': 'Zero tracking, zero data collection' } });
  },
};
