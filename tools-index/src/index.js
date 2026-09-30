// Formatho Tools Index — directory of all free privacy-first edge APIs
// HTML index at /, JSON list at /api, sitemap at /sitemap.xml

const TOOLS = [
  ['JSON Formatter', 'Format & validate JSON with configurable indent.', 'https://json-formatter-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/json-viewer'],
  ['Base64 Encoder/Decoder', 'Unicode-safe Base64 encode & decode.', 'https://base64-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/base64'],
  ['URL Encoder/Decoder', 'Percent-encode & decode URLs.', 'https://url-encoder-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/url-encoder'],
  ['MD5 Generator', 'MD5 hashes for checksums & legacy use.', 'https://md5-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/hash-text'],
  ['UUID Generator', 'RFC 4122 v4 UUIDs, bulk up to 100.', 'https://uuid-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/uuid'],
  ['SHA-256 Generator', 'SHA-256 hashes via Web Crypto.', 'https://sha256-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/hash-text'],
  ['Random String Generator', 'Crypto-secure random strings, 4 charsets.', 'https://random-string-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/token-generator'],
  ['Timestamp Converter', 'Unix ⇄ ISO/UTC, auto s/ms detection.', 'https://timestamp-converter-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/unix-timestamp'],
  ['Slug Generator', 'SEO-friendly URL slugs, diacritic folding.', 'https://slug-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/slugify-string'],
  ['Hash Generator', 'MD5, SHA-1, SHA-256, SHA-512 in one call.', 'https://hash-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/hash-text'],
  ['JWT Decoder', 'Decode JWT header, payload & claims (no verification).', 'https://jwt-decoder-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/jwt'],
  ['Cron Expression Explainer', 'Plain-English cron explanations + next run times.', 'https://cron-parser-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/crontab-generator'],
  ['Case Converter', 'camelCase, snake_case, kebab-case & 8 more in one call.', 'https://case-converter-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/case-converter'],
  ['Lorem Ipsum Generator', 'Placeholder paragraphs/sentences, json|text|html.', 'https://lorem-ipsum-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/lorem'],
  ['HTML Entity Encoder/Decoder', 'Encode text to HTML entities & decode them back, Unicode-aware.', 'https://html-entity-encoder-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/html-entities'],
  ['Password Generator', 'Crypto-secure passwords, 8–128 chars, custom charsets, bulk.', 'https://password-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/password-generator'],
  ['CSV to JSON Converter', 'CSV → JSON with headers, quoted fields, auto-typing, GET or POST.', 'https://csv-to-json-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/json-csv'],
  ['JSON to CSV Converter', 'JSON arrays → CSV with RFC 4180 escaping & custom delimiters.', 'https://json-to-csv-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/json-csv'],
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
  ['Percentage Calculator', 'X% of Y, X is what % of Y, and % increase/decrease.', 'https://percentage-calculator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/percentage-calculator'],
  ['Text Statistics', 'Words, characters, sentences, paragraphs, reading time, top words.', 'https://text-statistics-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/text-statistics'],
  ['Temperature Converter', 'Celsius ⇄ Fahrenheit ⇄ Kelvin ⇄ Rankine, absolute-zero checks.', 'https://temperature-converter-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/temperature-converter'],
  ['ULID Generator', 'Sortable 26-char ULIDs — bulk up to 100, monotonic mode, decode & validate.', 'https://ulid-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/ulid-generator'],
  ['IBAN Validator', 'ISO 13616 validation: structure, country lengths, mod-97 checksum + formatting.', 'https://iban-validator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/iban-validator'],
  ['HTTP Status Codes', 'Any code 100-599: reason phrase, category, meaning, spec reference; class lists.', 'https://http-status-codes-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/http-status-codes'],
  ['Meta Tag Generator', 'SEO + Open Graph + Twitter meta tags from one call, with length warnings.', 'https://meta-tag-generator-formatho.filesformatho.workers.dev/', 'https://formatho.com/tools/meta-tag-generator'],
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
<meta name="description" content="Directory of 38 free, privacy-first tool APIs: JSON, CSV, YAML, regex, diff checker, hashes, HMAC, TOTP, UUID, ULID, passwords, IBAN validator, HTTP status codes, meta tag generator and more. Zero tracking.">
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
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Formatho Tools — Free Privacy-First Developer APIs",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "JSON Formatter",
      "url": "https://json-formatter-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Base64 Encoder/Decoder",
      "url": "https://base64-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "URL Encoder/Decoder",
      "url": "https://url-encoder-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "MD5 Generator",
      "url": "https://md5-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 5,
      "name": "UUID Generator",
      "url": "https://uuid-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 6,
      "name": "SHA-256 Generator",
      "url": "https://sha256-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 7,
      "name": "Random String Generator",
      "url": "https://random-string-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 8,
      "name": "Timestamp Converter",
      "url": "https://timestamp-converter-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 9,
      "name": "Slug Generator",
      "url": "https://slug-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 10,
      "name": "Hash Generator",
      "url": "https://hash-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 11,
      "name": "JWT Decoder",
      "url": "https://jwt-decoder-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 12,
      "name": "Cron Expression Explainer",
      "url": "https://cron-parser-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 13,
      "name": "Case Converter",
      "url": "https://case-converter-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 14,
      "name": "Lorem Ipsum Generator",
      "url": "https://lorem-ipsum-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 15,
      "name": "HTML Entity Encoder/Decoder",
      "url": "https://html-entity-encoder-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 16,
      "name": "Password Generator",
      "url": "https://password-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 17,
      "name": "CSV to JSON Converter",
      "url": "https://csv-to-json-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 18,
      "name": "JSON to CSV Converter",
      "url": "https://json-to-csv-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 19,
      "name": "Regex Tester",
      "url": "https://regex-tester-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 20,
      "name": "Color Converter",
      "url": "https://color-converter-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 21,
      "name": "Diff Checker",
      "url": "https://diff-checker-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 22,
      "name": "Number Base Converter",
      "url": "https://base-converter-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 23,
      "name": "Roman Numeral Converter",
      "url": "https://roman-numeral-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 24,
      "name": "IPv4 Subnet Calculator",
      "url": "https://subnet-calculator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 25,
      "name": "XML Formatter",
      "url": "https://xml-formatter-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 26,
      "name": "chmod Calculator",
      "url": "https://chmod-calculator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 27,
      "name": "HMAC Generator",
      "url": "https://hmac-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 28,
      "name": "URL Parser",
      "url": "https://url-parser-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 29,
      "name": "Text ⇄ Binary Converter",
      "url": "https://text-to-binary-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 30,
      "name": "JSON ⇄ YAML Converter",
      "url": "https://json-yaml-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 31,
      "name": "TOTP Code Generator",
      "url": "https://totp-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 32,
      "name": "Percentage Calculator",
      "url": "https://percentage-calculator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 33,
      "name": "Text Statistics",
      "url": "https://text-statistics-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 34,
      "name": "Temperature Converter",
      "url": "https://temperature-converter-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 35,
      "name": "ULID Generator",
      "url": "https://ulid-generator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 36,
      "name": "IBAN Validator",
      "url": "https://iban-validator-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 37,
      "name": "HTTP Status Codes",
      "url": "https://http-status-codes-formatho.filesformatho.workers.dev"
    },
    {
      "@type": "ListItem",
      "position": 38,
      "name": "Meta Tag Generator",
      "url": "https://meta-tag-generator-formatho.filesformatho.workers.dev"
    }
  ]
}
</script>
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

const LLMS_TXT = "# Formatho Edge Tools — 38 free instant developer tools\n\n> Directory of 38 privacy-first developer micro-tools, each running on Cloudflare's edge with zero tracking, zero data collection, and nothing logged. Every tool has an HTML page with usage examples plus a JSON API at /api (GET/POST, CORS-enabled). No signup, no cookies, no analytics.\n\n## Tools\n- [JSON Formatter]: https://json-formatter-formatho.filesformatho.workers.dev/ — Format & validate JSON with configurable indent. Browser version: https://formatho.com/tools/json-viewer\n- [Base64 Encoder/Decoder]: https://base64-formatho.filesformatho.workers.dev/ — Unicode-safe Base64 encode & decode. Browser version: https://formatho.com/tools/base64\n- [URL Encoder/Decoder]: https://url-encoder-formatho.filesformatho.workers.dev/ — Percent-encode & decode URLs. Browser version: https://formatho.com/tools/url-encoder\n- [MD5 Generator]: https://md5-generator-formatho.filesformatho.workers.dev/ — MD5 hashes for checksums & legacy use. Browser version: https://formatho.com/tools/hash-text\n- [UUID Generator]: https://uuid-generator-formatho.filesformatho.workers.dev/ — RFC 4122 v4 UUIDs, bulk up to 100. Browser version: https://formatho.com/tools/uuid\n- [SHA-256 Generator]: https://sha256-generator-formatho.filesformatho.workers.dev/ — SHA-256 hashes via Web Crypto. Browser version: https://formatho.com/tools/hash-text\n- [Random String Generator]: https://random-string-formatho.filesformatho.workers.dev/ — Crypto-secure random strings, 4 charsets. Browser version: https://formatho.com/tools/token-generator\n- [Timestamp Converter]: https://timestamp-converter-formatho.filesformatho.workers.dev/ — Unix ⇄ ISO/UTC, auto s/ms detection. Browser version: https://formatho.com/tools/unix-timestamp\n- [Slug Generator]: https://slug-generator-formatho.filesformatho.workers.dev/ — SEO-friendly URL slugs, diacritic folding. Browser version: https://formatho.com/tools/slugify-string\n- [Hash Generator]: https://hash-generator-formatho.filesformatho.workers.dev/ — MD5, SHA-1, SHA-256, SHA-512 in one call. Browser version: https://formatho.com/tools/hash-text\n- [JWT Decoder]: https://jwt-decoder-formatho.filesformatho.workers.dev/ — Decode JWT header, payload & claims (no verification). Browser version: https://formatho.com/tools/jwt\n- [Cron Expression Explainer]: https://cron-parser-formatho.filesformatho.workers.dev/ — Plain-English cron explanations + next run times. Browser version: https://formatho.com/tools/crontab-generator\n- [Case Converter]: https://case-converter-formatho.filesformatho.workers.dev/ — camelCase, snake_case, kebab-case & 8 more in one call. Browser version: https://formatho.com/tools/case-converter\n- [Lorem Ipsum Generator]: https://lorem-ipsum-formatho.filesformatho.workers.dev/ — Placeholder paragraphs/sentences, json|text|html. Browser version: https://formatho.com/tools/lorem\n- [HTML Entity Encoder/Decoder]: https://html-entity-encoder-formatho.filesformatho.workers.dev/ — Encode text to HTML entities & decode them back, Unicode-aware. Browser version: https://formatho.com/tools/html-entities\n- [Password Generator]: https://password-generator-formatho.filesformatho.workers.dev/ — Crypto-secure passwords, 8–128 chars, custom charsets, bulk. Browser version: https://formatho.com/tools/password-generator\n- [CSV to JSON Converter]: https://csv-to-json-formatho.filesformatho.workers.dev/ — CSV → JSON with headers, quoted fields, auto-typing, GET or POST. Browser version: https://formatho.com/tools/json-csv\n- [JSON to CSV Converter]: https://json-to-csv-formatho.filesformatho.workers.dev/ — JSON arrays → CSV with RFC 4180 escaping & custom delimiters. Browser version: https://formatho.com/tools/json-csv\n- [Regex Tester]: https://regex-tester-formatho.filesformatho.workers.dev/ — Test regular expressions — matches, capture & named groups, indices as JSON. Browser version: https://formatho.com/tools/regex-tester\n- [Color Converter]: https://color-converter-formatho.filesformatho.workers.dev/ — HEX ⇄ RGB ⇄ HSL ⇄ HSV/CMYK + WCAG luminance in one call. Browser version: https://formatho.com/tools/color-converter\n- [Diff Checker]: https://diff-checker-formatho.filesformatho.workers.dev/ — Compare two texts line by line — Myers diff, unified hunks, ignore-whitespace. Browser version: https://formatho.com/tools/diff\n- [Number Base Converter]: https://base-converter-formatho.filesformatho.workers.dev/ — Binary, octal, decimal, hex & any base 2-36 — BigInt-safe. Browser version: https://formatho.com/tools/integer-base-converter\n- [Roman Numeral Converter]: https://roman-numeral-formatho.filesformatho.workers.dev/ — Numbers ⇄ Roman numerals, strict canonical validation. Browser version: https://formatho.com/tools/roman-numeral-converter\n- [IPv4 Subnet Calculator]: https://subnet-calculator-formatho.filesformatho.workers.dev/ — CIDR math: netmask, broadcast, host range, class & privacy flags. Browser version: https://formatho.com/tools/ipv4-subnet-calculator\n- [XML Formatter]: https://xml-formatter-formatho.filesformatho.workers.dev/ — Pretty-print, minify & validate XML with error line/column. Browser version: https://formatho.com/tools/xml-formatter\n- [chmod Calculator]: https://chmod-calculator-formatho.filesformatho.workers.dev/ — 755 ⇄ rwxr-xr-x both ways, setuid/setgid/sticky, plain English. Browser version: https://formatho.com/tools/chmod-calculator\n- [HMAC Generator]: https://hmac-generator-formatho.filesformatho.workers.dev/ — HMAC signatures: SHA-1/256/384/512, hex or Base64. Browser version: https://formatho.com/tools/hmac-generator\n- [URL Parser]: https://url-parser-formatho.filesformatho.workers.dev/ — Any URL → protocol, host, port, path, query params, hash as JSON. Browser version: https://formatho.com/tools/url-parser\n- [Text ⇄ Binary Converter]: https://text-to-binary-formatho.filesformatho.workers.dev/ — Text → UTF-8 binary/hex/codepoints and back, Unicode-safe. Browser version: https://formatho.com/tools/text-to-binary\n- [JSON ⇄ YAML Converter]: https://json-yaml-formatho.filesformatho.workers.dev/ — JSON → YAML and YAML → JSON, block scalars & flow style, clean 400s. Browser version: https://formatho.com/tools/json-yaml\n- [TOTP Code Generator]: https://totp-generator-formatho.filesformatho.workers.dev/ — RFC 6238/4226 codes: SHA-1/256/512, 6–8 digits, otpauth:// URLs. Browser version: https://formatho.com/tools/otp-code-generator\n- [Percentage Calculator]: https://percentage-calculator-formatho.filesformatho.workers.dev/ — X% of Y, X is what % of Y, and % increase/decrease. Browser version: https://formatho.com/tools/percentage-calculator\n- [Text Statistics]: https://text-statistics-formatho.filesformatho.workers.dev/ — Words, characters, sentences, paragraphs, reading time, top words. Browser version: https://formatho.com/tools/text-statistics\n- [Temperature Converter]: https://temperature-converter-formatho.filesformatho.workers.dev/ — Celsius ⇄ Fahrenheit ⇄ Kelvin ⇄ Rankine, absolute-zero checks. Browser version: https://formatho.com/tools/temperature-converter\n- [ULID Generator]: https://ulid-generator-formatho.filesformatho.workers.dev/ — Sortable 26-char ULIDs — bulk up to 100, monotonic mode, decode & validate. Browser version: https://formatho.com/tools/ulid-generator\n- [IBAN Validator]: https://iban-validator-formatho.filesformatho.workers.dev/ — ISO 13616 validation: structure, country lengths, mod-97 checksum + formatting. Browser version: https://formatho.com/tools/iban-validator\n- [HTTP Status Codes]: https://http-status-codes-formatho.filesformatho.workers.dev/ — Any code 100-599: reason phrase, category, meaning, spec reference; class lists. Browser version: https://formatho.com/tools/http-status-codes\n- [Meta Tag Generator]: https://meta-tag-generator-formatho.filesformatho.workers.dev/ — SEO + Open Graph + Twitter meta tags from one call, with length warnings. Browser version: https://formatho.com/tools/meta-tag-generator\n\n## More\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side tools\n- [All tools directory]: https://formatho.com/tools\n";

export default {
  async fetch(request) {
    const url = new URL(request.url);
if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
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
