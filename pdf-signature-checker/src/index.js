// PDF Digital Signature Checker (structural coverage analysis) — formatho.com
// Examines /ByteRange coverage, signature dictionary metadata, and incremental
// updates. Structural check only — it does NOT cryptographically verify the
// PKCS#7/CMS blob (the full tool on formatho.com does client-side crypto).

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://pdf-signature-checker-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/pdf-signature-checker';

const MAX_PDF = 20 * 1024 * 1024; // 20MB

const DEC = new TextDecoder('latin1'); // byte-preserving 1:1 view of the file

function parsePdfDate(raw) {
  // PDF date: D:YYYYMMDDHHmmSSOHH'mm — return ISO-ish or null
  const m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(raw || '');
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const pad = (x) => (x || '01').padStart(2, '0');
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h || '00')}:${pad(mi || '00')}:${pad(s || '00')}${raw && /Z|([-+]\d{2}')/.test(raw) ? (raw.includes('Z') ? 'Z' : '') : ''}`;
}

function analyzePdf(bytes) {
  const size = bytes.length;
  const text = DEC.decode(bytes);
  if (!text.startsWith('%PDF-')) throw Object.assign(new Error('input does not look like a PDF (missing %PDF- header)'), { status: 400 });
  const headerVersion = (/^%PDF-(\d\.\d)/.exec(text) || [])[1] || null;

  const eofCount = (text.match(/%%EOF/g) || []).length;

  const sigFlagsMatch = /\/SigFlags\s+(\d+)/.exec(text);
  const sigFlags = sigFlagsMatch ? parseInt(sigFlagsMatch[1], 10) : null;

  // All /ByteRange [o1 l1 o2 l2] entries (signature dicts are plain-text in virtually all signed PDFs)
  const sigs = [];
  const BR_RE = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  let m;
  while ((m = BR_RE.exec(text)) !== null) {
    const [o1, l1, o2, l2] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10)];
    const brStart = m.index;
    const covered = l1 + l2;
    const gapStart = o1 + l1;
    const gapLen = o2 - gapStart; // the /Contents <hex> placeholder sits here
    const trailing = size - (o2 + l2);

    // The /Contents hex string belonging to THIS ByteRange: its hex VALUE starts inside the gap region
    let contentsBytes = null;
    const CONT_RE = /\/Contents\s*<([0-9A-Fa-f\s]*)>/g;
    let c;
    while ((c = CONT_RE.exec(text)) !== null) {
      const hexStart = text.indexOf('<', c.index) + 1; // first byte of the hex VALUE
      if (hexStart >= gapStart && hexStart < o2) {
        contentsBytes = c[1].replace(/\s+/g, '').length / 2;
        break;
      }
    }

    // Pull signature-dict metadata found just before/after this ByteRange (±600 chars)
    const ctxStart = Math.max(0, brStart - 600);
    const ctx = text.slice(ctxStart, brStart + 600);
    const sub = (/\/SubFilter\s*\/([A-Za-z0-9.]+)/.exec(ctx) || [])[1] || null;
    const rawM = (/\/M\s*\(D:([^)]*)\)/.exec(ctx) || [])[1] || null;
    const reason = (/\/Reason\s*\(((?:\\.|[^)\\])*)\)/.exec(ctx) || [])[1] || null;
    const name = (/\/Name\s*\(((?:\\.|[^)\\])*)\)/.exec(ctx) || [])[1] || null;
    const contact = (/\/ContactInfo\s*\(((?:\\.|[^)\\])*)\)/.exec(ctx) || [])[1] || null;

    sigs.push({
      byte_range: [o1, l1, o2, l2],
      covered_bytes: covered,
      coverage_pct: size > 0 ? Math.round((covered / size) * 1000) / 10 : 0,
      gap_bytes: gapLen,
      contents_bytes: contentsBytes,
      subfilter: sub,
      signing_time: rawM ? { raw: 'D:' + rawM, iso: parsePdfDate('D:' + rawM) } : null,
      reason: reason ? reason.replace(/\\([()\\])/g, '$1') : null,
      signer_name: name ? name.replace(/\\([()\\])/g, '$1') : null,
      contact_info: contact ? contact.replace(/\\([()\\])/g, '$1') : null,
      bytes_before_signed_range: o1,
      trailing_bytes_after_signature: trailing,
      range_within_file: o1 + l1 <= size && o2 + l2 <= size,
    });
  }

  if (sigs.length === 0) {
    return {
      signed: false,
      file_size: size,
      header_version: headerVersion,
      revisions_eof_markers: eofCount,
      sig_flags: sigFlags,
      signatures: [],
      verdict: 'no digital signature found (no /ByteRange entries in the document)',
      is_fully_covered: false,
      limitations: 'structural analysis only — cryptographic validation of the signature blob is done by the full tool',
    };
  }

  // Unsigned-content analysis against the LAST signature (latest revision)
  const last = sigs[sigs.length - 1];
  const [o1, l1, o2, l2] = last.byte_range;
  const problems = [];
  if (last.bytes_before_signed_range > 0) problems.push(`${last.bytes_before_signed_range} byte(s) before the signed range are not covered`);
  if (last.trailing_bytes_after_signature > 0) problems.push(`${last.trailing_bytes_after_signature} byte(s) were appended AFTER the signature (incremental update or modification) — not covered by it`);
  for (let i = 0; i < sigs.length - 1; i++) {
    const [a1, b1, a2, b2] = sigs[i].byte_range;
    if (o2 + l2 < a2 + b2) { /* later sig covers more */ }
  }
  const fullyCovered = last.bytes_before_signed_range === 0 && last.trailing_bytes_after_signature === 0;

  let verdict;
  if (fullyCovered) verdict = 'signed range covers the entire document — no unsigned content detected (structural check; cryptographic validity not assessed here)';
  else verdict = 'UNSIGNED CONTENT DETECTED: ' + problems.join('; ');

  return {
    signed: true,
    file_size: size,
    header_version: headerVersion,
    revisions_eof_markers: eofCount,
    sig_flags: sigFlags,
    signatures: sigs,
    verdict,
    is_fully_covered: fullyCovered,
    limitations: 'structural analysis only — cryptographic validation of the PKCS#7/CMS blob is done client-side by the full tool',
  };
}

async function handleApi(request) {
  if (request.method !== 'POST') {
    return Response.json({
      how_to_use: 'POST the PDF as the raw request body (Content-Type: application/pdf) or as JSON {"pdf_base64": "..."}',
      max_size_bytes: MAX_PDF,
      example: `curl --data-binary @signed.pdf -H 'Content-Type: application/pdf' ${HOST}/api`,
      returns: 'per-signature /ByteRange coverage, signature metadata (SubFilter, signing time, reason, signer), unsigned/trailing bytes, incremental-update count, and a structural verdict',
      limitation: 'structural coverage check — does not cryptographically verify the certificate chain or digest',
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    }, { headers: JSON_HEADERS });
  }

  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  let bytes;
  try {
    if (ct.includes('application/json')) {
      let body;
      try { body = await request.json(); } catch (e) { throw Object.assign(new Error('request body is not valid JSON'), { status: 400 }); }
      if (!body || typeof body !== 'object' || typeof body.pdf_base64 !== 'string') {
        throw Object.assign(new Error('JSON body must contain a "pdf_base64" string'), { status: 400 });
      }
      const b64 = body.pdf_base64.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
      const bin = atob(b64);
      if (bin === null || (b64.length !== 0 && bin.length === 0 && !/^[A-Za-z0-9+/=]*$/.test(b64))) throw Object.assign(new Error('pdf_base64 is not valid base64'), { status: 400 });
      bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    } else {
      const buf = await request.arrayBuffer();
      bytes = new Uint8Array(buf);
    }
  } catch (e) {
    if (e && typeof e === 'object' && e.status) return Response.json({ error: e.message }, { status: e.status, headers: JSON_HEADERS });
    return Response.json({ error: 'failed to read request body: ' + (e && e.message || e) }, { status: 400, headers: JSON_HEADERS });
  }

  if (bytes.length === 0) return Response.json({ error: 'empty request body — POST a PDF file' }, { status: 400, headers: JSON_HEADERS });
  if (bytes.length > MAX_PDF) return Response.json({ error: `PDF too large (max ${MAX_PDF} bytes)` }, { status: 413, headers: JSON_HEADERS });

  let result;
  try { result = analyzePdf(bytes); }
  catch (e) { return Response.json({ error: e.message }, { status: e.status || 400, headers: JSON_HEADERS }); }

  return Response.json({ ...result, decoded_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PDF Signature Checker — ByteRange &amp; Coverage Analysis — Free &amp; Private</title>
<meta name="description" content="Check a signed PDF's digital signature coverage: /ByteRange analysis, unsigned or appended content, signing time, reason and SubFilter — free API, zero tracking. Full cryptographic verification on formatho.com.">
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
  "name": "PDF Signature Checker — ByteRange & Coverage Analysis",
  "url": "https://pdf-signature-checker-formatho.filesformatho.workers.dev/",
  "description": "Check a signed PDF's digital signature coverage: ByteRange analysis, unsigned or appended content, signing time, reason and SubFilter — free API, zero tracking. Full cryptographic verification on formatho.com.",
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
  <h1>PDF Signature Checker — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl --data-binary @signed.pdf -H 'Content-Type: application/pdf' ${HOST}/api
# or: curl -H 'Content-Type: application/json' -d '{"pdf_base64": "..."}' ${HOST}/api</code></pre>
<p>POST a PDF (raw body up to 20&nbsp;MB, or JSON <code>{"pdf_base64": "…"}</code>). Returns every signature's <code>/ByteRange</code>, signed-byte coverage %, the <code>/Contents</code> placeholder size, SubFilter (<code>adbe.pkcs7.detached</code>, <code>ETSI.CAdES.detached</code>, …), signing time, reason and signer name — plus byte counts of any content <em>outside</em> the signed ranges (unsigned modifications, appended incremental updates) and a structural verdict.</p>
<p><strong>What's checked:</strong> whether the signed ranges cover the whole file, whether bytes were appended after signing, how many revisions (<code>%%EOF</code> markers) exist, and AcroForm <code>/SigFlags</code>. This is a structural check — cryptographic verification of the certificate and digest happens client-side in the full tool.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> the PDF is parsed in-memory at the edge and never logged or stored. For fully offline checking use the browser tool — files never leave your machine.</div>
<h2>Full browser tool</h2>
<p>Verify PDF signatures entirely client-side, including cryptographic checks: <a href="${FULL_TOOL}">PDF Signature Checker on formatho.com</a>.</p>
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

const LLMS_TXT = "# PDF Signature Checker — Free & Private\n\n> Structural analysis of signed PDFs: every /ByteRange with signed-byte coverage %, /Contents placeholder size, SubFilter (adbe.pkcs7.detached, ETSI.CAdES.detached...), signing time, reason, signer name, count of unsigned/appended bytes (incremental updates after signing), revisions (%%EOF markers) and AcroForm /SigFlags, plus a verdict. POST the PDF (raw or pdf_base64 JSON, up to 20MB). Structural coverage check only — cryptographic verification of the PKCS#7/CMS blob is done client-side by the full tool. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://pdf-signature-checker-formatho.filesformatho.workers.dev/\n- [JSON API]: https://pdf-signature-checker-formatho.filesformatho.workers.dev/api — POST raw PDF or JSON, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/pdf-signature-checker\n- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

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
