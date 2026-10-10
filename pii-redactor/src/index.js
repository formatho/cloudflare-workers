// Privacy-First PII Redaction API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection. Prefer POST for real documents; GET URLs can appear in logs',
};
const HOST = 'https://pii-redactor-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/pii-redactor';
const MAX_BYTES = 1024 * 1024;

const TYPES = ['email', 'phone', 'credit_card', 'ssn', 'iban', 'ipv4'];
const TOKENS = {
  email: '[EMAIL]', phone: '[PHONE]', credit_card: '[CREDIT_CARD]',
  ssn: '[SSN]', iban: '[IBAN]', ipv4: '[IP]',
};

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PII Redaction API — Free &amp; Private</title>
<meta name="description" content="Redact PII from text via API: emails, phone numbers, credit cards (Luhn-verified), SSNs, IBANs (mod-97 verified) and IPv4 addresses. Token or mask mode, type filters, offset positions. Privacy-first edge API.">
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
  "name": "PII Redaction API — Free & Private",
  "url": "https://pii-redactor-formatho.filesformatho.workers.dev/",
  "description": "Redact PII from text via API: emails, phone numbers, credit cards (Luhn-verified), SSNs, IBANs (mod-97 verified) and IPv4 addresses. Token or mask mode, type filters, offset positions. Privacy-first edge API.",
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
  <h1>PII Redactor — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl -X POST ${HOST}/api -H 'Content-Type: application/json' \\
  -d '{"text":"Contact jane.doe@corp.com or +1 (415) 555-0132. Card 4111 1111 1111 1111."}'</code></pre>
<p>Detects and redacts <strong>emails</strong>, <strong>phone numbers</strong> (NANP &amp; international), <strong>credit cards</strong> (Luhn-verified, so order numbers survive), <strong>SSNs</strong>, <strong>IBANs</strong> (mod-97 verified) and <strong>IPv4 addresses</strong>. Two modes: <code>redact</code> (replace with <code>[EMAIL]</code>-style tokens) or <code>mask</code> (fixed-length <code>****</code>). Filter with <code>types=email,ssn</code>; get match offsets with <code>include_positions=true</code>. Overlapping candidates resolve to the longest, most specific match.</p>
<p class="tagline">Prefer POST for real documents — GET query strings can land in server logs. Redaction runs in-memory at the edge; matched values are never echoed back or stored.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> the text never leaves memory — no logs, no storage, no telemetry, and detection results contain counts/offsets only, never the PII itself.</div>
<h2>Full browser tool</h2>
<p>Redact with a full UI: <a href="${FULL_TOOL}">PII Redactor on formatho.com</a>. Need weak-secret scanning instead? <a href="https://password-strength-formatho.filesformatho.workers.dev/">Password Strength Checker</a>.</p>
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

const LLMS_TXT = "# PII Redaction API — Free & Private\n\n> Redact PII from text: emails, phone numbers, credit cards (Luhn-verified), SSNs, IBANs (mod-97 verified), IPv4 addresses. Token or mask mode, type filters, match offsets. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://pii-redactor-formatho.filesformatho.workers.dev/\n- [JSON API]: https://pii-redactor-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/pii-redactor\n- [All 55 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

function luhnOk(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function ibanOk(raw) {
  const s = raw.replace(/[^A-Z0-9]/g, '');
  if (s.length < 15 || s.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let n = '';
  for (const c of rearranged) n += /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
  try { return BigInt(n) % 97n === 1n; } catch { return false; }
}

const RAW_DETECTORS = [
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  // credit cards first among digit-based: 13-19 digits w/ optional single separators, Luhn-gated
  ['credit_card', /\b(?:\d[ -]?){12,18}\d\b/g, (m) => { const d = m.replace(/[^\d]/g, ''); return d.length >= 13 && d.length <= 19 && luhnOk(d); }],
  ['iban', /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{2,4}){3,8}\b/g, ibanOk],
  ['ssn', /\b\d{3}[ -]\d{2}[ -]\d{4}\b/g],
  // NANP: optional +1 country code, (xxx) or xxx, then 3-4 with separators; bare 10-digit runs match too
  ['phone', /(?:\+?1[ .-]?)?(?:\(\d{3}\)|\b\d{3})[ .-]?\d{3}[ .-]?\d{4}\b/g],
  // international: requires + country code, 7-14 further digits w/ optional separators
  ['phone', /\+\d{1,3}(?:[ .-]?\d){6,13}/g],
  ['ipv4', /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g],
];

function detect(text, typesWanted) {
  const found = [];
  for (const [type, re, validate] of RAW_DETECTORS) {
    if (!typesWanted.has(type)) continue;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (validate && !validate(m[0])) continue;
      found.push({ type, start: m.index, end: m.index + m[0].length });
    }
  }
  // resolve overlaps: earliest start wins; at equal start the longest/most-specific wins
  found.sort((a, b) => (a.start - b.start) || ((b.end - b.start) - (a.end - a.start)));
  const kept = [];
  let lastEnd = -1;
  for (const f of found) {
    if (f.start >= lastEnd) { kept.push(f); lastEnd = f.end; }
  }
  return kept;
}

function redact(text, matches, mode, maskChar) {
  const byType = {};
  let out = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    byType[m.type] = (byType[m.type] || 0) + 1;
    const repl = mode === 'mask' ? maskChar.repeat(m.end - m.start) : TOKENS[m.type];
    out = out.slice(0, m.start) + repl + out.slice(m.end);
  }
  return { out, byType };
}

function parseBool(v) {
  if (v === true || v === 'true' || v === '1') return true;
  return false;
}

async function handleApi(request) {
  let raw;
  if (request.method === 'POST') {
    raw = await request.json().catch(() => ({ __bad: true }));
    if (raw === null || raw === undefined || raw.__bad) return err400('POST body must be JSON, e.g. {"text":"Contact jane@corp.com","mode":"redact"}');
  } else {
    const url = new URL(request.url);
    raw = {};
    for (const [k, v] of url.searchParams.entries()) raw[k.toLowerCase()] = v;
  }
  const text = raw.text ?? raw.input ?? raw.value;
  if (typeof text !== 'string' || text.length === 0) return err400('Parameter "text" is required. Prefer POST over GET for real documents — query strings can appear in logs.');
  if (text.length > MAX_BYTES) return err400(`Text exceeds the 1 MB limit (${text.length} chars).`);

  const mode = raw.mode ?? 'redact';
  if (mode !== 'redact' && mode !== 'mask') return err400('Parameter "mode" must be "redact" (replace with tokens like [EMAIL]) or "mask" (fixed-length asterisks).');

  const maskChar = raw.mask_char ?? '*';
  if (mode === 'mask' && (typeof maskChar !== 'string' || maskChar.length !== 1)) return err400('Parameter "mask_char" must be exactly one character (default "*").');

  let typesWanted = new Set(TYPES);
  if (raw.types !== undefined) {
    const asked = String(raw.types).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    for (const t of asked) if (!TYPES.includes(t)) return err400(`Unknown type "${t}". Valid types: ${TYPES.join(', ')}.`);
    if (asked.length) typesWanted = new Set(asked);
  }

  const includePositions = parseBool(raw.include_positions ?? raw.positions);

  const matches = detect(text, typesWanted);
  const { out, byType } = redact(text, matches, mode, maskChar);
  const positions = matches.map(m => ({ type: m.type, start: m.start, end: m.end }));

  const body = {
    redacted_text: out,
    findings: {
      total: matches.length,
      by_type: Object.fromEntries(Object.entries(byType).sort()),
      types_scanned: [...typesWanted].sort(),
    },
    notes: 'Structured PII only: names, street addresses and free-text attributes require NLP and are out of scope. Credit cards are Luhn-verified and IBANs mod-97-verified to avoid over-redacting order numbers and reference codes.',
    privacy: 'Redacted in-memory at the edge; matched values are never echoed, logged or stored',
    full_tool: FULL_TOOL,
    generated_by: 'Formatho edge API — zero tracking',
  };
  if (includePositions) body.findings.positions = positions;
  return Response.json(body, { headers: JSON_HEADERS });
}

const API_HELP = {
  description: 'Redact structured PII from text: emails, phone numbers (NANP + international), credit cards (Luhn-verified), SSNs, IBANs (mod-97 verified), IPv4 addresses.',
  example_post: `curl -X POST ${HOST}/api -H 'Content-Type: application/json' -d '{"text":"Email jane.doe@corp.com, card 4111 1111 1111 1111, SSN 078-05-1120","mode":"redact"}'`,
  example_get: `${HOST}/api?text=Reach%20me%20at%20%2B44%207911%20123456&mode=mask`,
  params: {
    text: 'required — the text to redact (max 1 MB). Prefer POST for real documents.',
    mode: '"redact" (default) — replace matches with [EMAIL]/[PHONE]/[CREDIT_CARD]/[SSN]/[IBAN]/[IP] tokens; "mask" — replace with fixed-length mask characters',
    mask_char: 'single character used in mask mode (default "*")',
    types: 'comma-separated subset, e.g. "email,ssn". Default: all. Valid: email, phone, credit_card, ssn, iban, ipv4',
    include_positions: 'set true to include match offsets (type/start/end) for highlighters. Offsets refer to the input text',
  },
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
