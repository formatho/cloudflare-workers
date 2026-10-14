// Privacy-First DMARC Record Parser API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://dmarc-parser-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/dmarc-parser';
const MAX_RECORD_BYTES = 8192;
const DOH = 'https://cloudflare-dns.com/dns-query';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DMARC Record Parser — Check &amp; Validate DMARC | Free &amp; Private</title>
<meta name="description" content="Parse and validate DMARC records against RFC 7489: policy, pct, rua/ruf destinations, alignment modes, common mistakes — or look up a domain's live record over DNS. Free, privacy-first edge API. Full tool on formatho.com.">
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
  "name": "DMARC Record Parser — Free & Private",
  "url": "https://dmarc-parser-formatho.filesformatho.workers.dev/",
  "description": "Parse and validate DMARC records against RFC 7489: policy, pct, rua/ruf destinations, alignment modes, common mistakes — or look up a domain's live record over DNS. Free, privacy-first edge API. Full tool on formatho.com.",
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
  <h1>DMARC Record Parser — Check &amp; Validate</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — validate a record</h2>
<pre><code>curl "${HOST}/api?record=v%3DDMARC1%3B%20p%3Dreject%3B%20rua%3Dmailto%3Admarc%40example.com"</code></pre>
<p>Every tag is checked against RFC 7489: required <code>p</code>, valid policies, <code>pct</code> range, URI limits (max 2, 1024 chars each), alignment modes, duplicate tags, unknown tags — each with a plain-English explanation.</p>
<h2>Usage — look up a domain's live record</h2>
<pre><code>curl "${HOST}/api?domain=gmail.com"</code></pre>
<p>Fetches the <code>_dmarc.gmail.com</code> TXT record over DNS (Cloudflare DoH) and validates it. Multiple DMARC records are flagged — receivers reject those.</p>
<h2>Common mistakes it catches</h2>
<ul>
  <li>Missing <code>p=</code> (policy) or <code>v=DMARC1</code> not first</li>
  <li><code>rua</code> with more than 2 URIs or oversized URIs (must be ≤1024 bytes)</li>
  <li><code>pct</code> outside 0–100, non-numeric <code>ri</code>, invalid <code>adkim</code>/<code>aspf</code> modes</li>
  <li><code>fo=0</code> combined with <code>1</code>/<code>d</code>/<code>s</code>, duplicate tags, stray quotes from zone-file pastes</li>
</ul>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> parsing runs in-memory at the edge; domain lookups resolve via public DNS only, nothing you send is logged or stored.</div>
<h2>Full browser tool</h2>
<p>Check DMARC entirely client-side: <a href="${FULL_TOOL}">DMARC Parser on formatho.com</a>.</p>
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

const LLMS_TXT = "# DMARC Record Parser — Free & Private\n\n> Parse and validate DMARC records against RFC 7489: policy, pct, rua/ruf destinations, alignment modes, common mistakes — or look up a domain's live record over DNS. Free, privacy-first edge API. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://dmarc-parser-formatho.filesformatho.workers.dev/\n- [JSON API]: https://dmarc-parser-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/dmarc-parser\n- [All 71 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

const byteLen = (s) => new TextEncoder().encode(s).length;

const TAG_DOC = {
  v: 'Protocol version — must be DMARC1 and must be the first tag',
  p: 'Policy for the domain: none (monitor), quarantine (spam), reject',
  sp: 'Policy for subdomains (falls back to p when absent)',
  np: 'Policy for non-existent subdomains (RFC 7489 bis extension)',
  pct: 'Percentage of messages the policy applies to (0-100)',
  rua: 'Addresses receiving aggregate (daily) reports',
  ruf: 'Addresses receiving forensic/failure reports',
  adkim: 'DKIM alignment mode: r (relaxed, default) or s (strict)',
  aspf: 'SPF alignment mode: r (relaxed, default) or s (strict)',
  fo: 'Failure reporting options: 0, 1, d, s (comma-separated)',
  rf: 'Report format — only afrf is registered',
  ri: 'Report interval in seconds (default 86400)',
};

const POLICIES = ['none', 'quarantine', 'reject'];

// --- validation ---
function validateRecord(record) {
  const errors = [];
  const warnings = [];
  const tags = [];
  const parsed = {};
  const seen = new Map();

  // Strip stray zone-file quotes: "v=DMARC1; p=none"
  let rec = record.trim();
  if (rec.length >= 2 && rec.startsWith('"') && rec.endsWith('"')) rec = rec.slice(1, -1).trim();

  const parts = rec.split(';');
  if (parts[parts.length - 1].trim() === '') parts.pop(); // trailing ';'

  parts.forEach((part, idx) => {
    const seg = part.trim();
    if (!seg) { errors.push({ message: `Empty tag segment (check for ";;" or a stray ";")` }); return; }
    const eq = seg.indexOf('=');
    if (eq === -1) { errors.push({ message: `Tag "${seg}" has no "=" value separator` }); return; }
    const tag = seg.slice(0, eq).trim();
    const value = seg.slice(eq + 1).trim();
    if (!/^[a-z][a-z0-9_-]*$/i.test(tag)) { errors.push({ tag, message: `Invalid tag name "${tag}"` }); return; }
    const lower = tag.toLowerCase();
    if (seen.has(lower)) errors.push({ tag: lower, message: `Duplicate tag "${lower}" (first at position ${seen.get(lower) + 1}) — receivers use undefined behavior` });
    seen.set(lower, idx);
    const entry = { tag: lower, value, valid: true, description: TAG_DOC[lower] || 'Unknown tag (not in RFC 7489)' };
    if (!(lower in TAG_DOC)) { entry.valid = false; warnings.push({ tag: lower, message: `Unknown tag "${lower}" — not defined in RFC 7489; receivers must ignore it` }); }
    if (idx === 0 && lower !== 'v') errors.push({ tag: lower, message: `First tag must be v=DMARC1 (found "${lower}")` });

    switch (lower) {
      case 'v':
        if (!/^DMARC1$/i.test(value)) { entry.valid = false; errors.push({ tag: 'v', message: `v must be "DMARC1" (found "${value}")` }); }
        break;
      case 'p':
      case 'sp':
      case 'np': {
        if (!POLICIES.includes(value.toLowerCase())) {
          entry.valid = false;
          errors.push({ tag: lower, message: `${lower} must be one of: none, quarantine, reject (found "${value}")` });
        } else {
          parsed[lower === 'p' ? 'policy' : lower === 'sp' ? 'subdomain_policy' : 'nonexistent_subdomain_policy'] = value.toLowerCase();
          if (lower === 'p' && value.toLowerCase() === 'none') warnings.push({ tag: 'p', message: 'p=none is monitor-only — no protection, you only receive reports' });
        }
        break;
      }
      case 'pct': {
        if (!/^\d{1,3}$/.test(value) || Number(value) > 100) { entry.valid = false; errors.push({ tag: 'pct', message: `pct must be an integer between 0 and 100 (found "${value}")` }); }
        else parsed.pct = Number(value);
        break;
      }
      case 'rua':
      case 'ruf': {
        const uris = value.split(',').map((u) => u.trim()).filter(Boolean);
        const out = [];
        uris.forEach((u) => {
          const m = /^(mailto|https):(.+?)(!:?(\d+)([kKmMgG])?)?$/i.exec(u);
          if (!m) { entry.valid = false; errors.push({ tag: lower, message: `Invalid URI "${u}" — must start with mailto: or https:` }); return; }
          if (byteLen(u) > 1024) { entry.valid = false; errors.push({ tag: lower, message: `URI exceeds 1024 bytes ("${u.slice(0, 40)}…" is ${byteLen(u)} bytes)` }); return; }
          if (m[3]) warnings.push({ tag: lower, message: `Size hint "!${m[3]}${m[4] || ''}" on "${m[1]}:${m[2]}" — legal but ignored by most receivers` });
          if (/^https:/i.test(m[1])) warnings.push({ tag: lower, message: `https: URI "${u}" — many receivers only implement mailto:` });
          out.push(m[1].toLowerCase() + ':' + m[2]);
        });
        if (uris.length > 2) { entry.valid = false; errors.push({ tag: lower, message: `${lower} lists ${uris.length} URIs — RFC 7489 caps a URI list at 2` }); }
        if (lower === 'rua') parsed.aggregate_report_uris = out; else parsed.forensic_report_uris = out;
        break;
      }
      case 'adkim':
      case 'aspf': {
        if (!/^[rs]$/i.test(value)) { entry.valid = false; errors.push({ tag: lower, message: `${lower} must be r (relaxed) or s (strict) (found "${value}")` }); }
        else parsed[lower === 'adkim' ? 'dkim_alignment' : 'spf_alignment'] = value.toLowerCase();
        break;
      }
      case 'fo': {
        const opts = value.split(',').map((s) => s.trim()).filter(Boolean);
        const valid = opts.every((o) => /^[01ds]$/.test(o));
        const has0 = opts.includes('0');
        const others = opts.some((o) => o !== '0');
        if (!valid) { entry.valid = false; errors.push({ tag: 'fo', message: `fo must be a comma list of 0, 1, d, s (found "${value}")` }); }
        else if (has0 && others) { entry.valid = false; errors.push({ tag: 'fo', message: `fo=0 cannot be combined with 1/d/s ("${value}")` }); }
        else parsed.failure_options = opts;
        break;
      }
      case 'rf': {
        if (value.toLowerCase() !== 'afrf') warnings.push({ tag: 'rf', message: `rf "${value}" — only afrf is registered; receivers must ignore unknown formats` });
        parsed.report_format = value.toLowerCase();
        break;
      }
      case 'ri': {
        if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 4294967295) {
          entry.valid = false;
          errors.push({ tag: 'ri', message: `ri must be a positive integer of seconds (found "${value}")` });
        } else parsed.report_interval_seconds = Number(value);
        break;
      }
    }
    tags.push(entry);
  });

  if (!seen.has('v')) errors.unshift({ tag: 'v', message: 'Missing required tag v=DMARC1' });
  if (!seen.has('p')) errors.push({ tag: 'p', message: 'Missing required tag p (policy: none/quarantine/reject)' });
  if (seen.has('sp') && !seen.has('p')) errors.push({ tag: 'sp', message: 'sp present without p — sp only overrides p for subdomains' });
  if (seen.has('ruf') && !seen.has('p')) warnings.push({ tag: 'ruf', message: 'ruf without p — forensic reports without a policy have limited value' });

  return { record: rec, tags, parsed, errors, warnings, valid: errors.length === 0 };
}

// --- DoH lookup ---
function validDomain(d) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+\.?$/i.test(d) && d.length <= 253;
}

async function lookupDomain(domain) {
  const name = '_dmarc.' + domain.replace(/\.$/, '');
  let res;
  try {
    res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=TXT`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(8000) });
  } catch (e) {
    return { error: `DNS lookup failed: ${String(e.message || e).slice(0, 120)}`, queried_name: name };
  }
  if (!res.ok) return { error: `DNS lookup returned HTTP ${res.status}`, queried_name: name };
  const data = await res.json().catch(() => null);
  if (!data) return { error: 'DNS response was not valid JSON', queried_name: name };
  const txts = (data.Answer || []).filter((a) => a.type === 16).map((a) => (a.data || '').replace(/^"|"$/g, ''));
  if (txts.length === 0) return { error: `No TXT record found at ${name} — no DMARC policy is published for this domain`, queried_name: name, txt_count: 0 };
  const dmarcRecords = txts.filter((t) => /^v\s*=\s*DMARC1/i.test(t));
  if (dmarcRecords.length > 1) {
    return {
      queried_name: name, txt_count: txts.length, dmarc_count: dmarcRecords.length,
      error: `Multiple (${dmarcRecords.length}) DMARC records published — RFC 7489 forbids this; receivers treat DMARC as absent. Keep exactly one.`,
      records: dmarcRecords,
    };
  }
  if (dmarcRecords.length === 0) {
    return { queried_name: name, txt_count: txts.length, dmarc_count: 0, error: `TXT record(s) exist at ${name} but none is a DMARC record (must start with v=DMARC1)`, records: txts };
  }
  return { queried_name: name, txt_count: txts.length, dmarc_count: 1, record: dmarcRecords[0] };
}

async function parseArgs(request) {
  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return { __bad: true };
      return { record: body.record ?? body.txt, domain: body.domain };
    }
    const text = await request.text();
    if (text) return { record: text };
    return {};
  }
  const url = new URL(request.url);
  return { record: url.searchParams.get('record'), domain: url.searchParams.get('domain') };
}

async function handleApi(request) {
  const { record, domain, __bad } = await parseArgs(request);
  if (__bad) return err400('POST body must be JSON: {"record": "v=DMARC1; ..."} or {"domain": "example.com"} (or send the raw record as text body)');

  const base = { calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL };

  if (record && domain) return err400('Provide either record or domain, not both');
  if (!record && !domain) return err400('Missing required parameter: record (a DMARC record like "v=DMARC1; p=none") or domain (looks up _dmarc.<domain> over DNS)');

  let rec = record;
  let lookup = null;
  if (domain) {
    if (!validDomain(String(domain))) return err400(`Invalid domain "${String(domain).slice(0, 100)}" — must be a plain hostname like example.com`);
    lookup = await lookupDomain(String(domain));
    if (lookup.error) return Response.json({ valid: false, ...lookup, ...base }, { headers: JSON_HEADERS });
    rec = lookup.record;
  }

  rec = String(rec);
  if (byteLen(rec) > MAX_RECORD_BYTES) return err400(`Record too large: ${byteLen(rec)} bytes (max ${MAX_RECORD_BYTES}).`);
  const result = validateRecord(rec);
  return Response.json({ valid: result.valid, ...(lookup ? { dns: lookup, fetched_via_doh: true } : {}), ...result, ...base }, { headers: JSON_HEADERS });
}

// /api directory listing (GET without params)
function apiIndex(request) {
  const url = new URL(request.url);
  if (url.searchParams.has('record') || url.searchParams.has('domain')) return null;
  return Response.json({
    tool: 'DMARC Record Parser', method: 'GET/POST',
    params: {
      record: 'a DMARC record, e.g. v=DMARC1; p=quarantine; rua=mailto:d@example.com',
      domain: 'looks up _dmarc.<domain> TXT over DNS (Cloudflare DoH) and validates it',
      'POST body': '{"record": "..."} or {"domain": "..."} (or raw record as text body)',
    },
    returns: { valid: 'boolean', tags: '[{tag, value, valid, description}]', parsed: '{policy, pct, aggregate_report_uris, ...}', errors: '[{tag?, message}]', warnings: '[{tag?, message}]', dns: 'present for domain lookups (queried_name, txt_count)' },
    limits: { max_record_bytes: MAX_RECORD_BYTES },
    example: `${HOST}/api?domain=gmail.com`,
    calculated_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL,
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
    if (url.pathname === '/api') {
      if (request.method === 'GET') { const idx = apiIndex(request); if (idx) return idx; }
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=300' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
