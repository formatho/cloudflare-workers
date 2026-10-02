// Privacy-First Gzip Compress & Decompress API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://gzip-converter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/gzip';
const MAX_BYTES = 1048576; // 1 MB input cap

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gzip Compress & Decompress Online — Free &amp; Private</title>
<meta name="description" content="Compress text to gzip (base64/hex output) and decompress gzip back to text via a free, privacy-first edge API. No uploads, no tracking. Full tool on formatho.com.">
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
  "name": "Gzip Compress & Decompress Online — Free & Private",
  "url": "https://gzip-converter-formatho.filesformatho.workers.dev/",
  "description": "Compress text to gzip (base64/hex output) and decompress gzip back to text via a free, privacy-first edge API. No uploads, no tracking. Full tool on formatho.com.",
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
  <h1>Gzip Compress &amp; Decompress Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage — compress</h2>
<pre><code>curl "${HOST}/api?text=hello%20hello%20hello"</code></pre>
<p>Returns the gzip bytes as <code>base64</code> and <code>hex</code>, plus the compression ratio. Unicode-safe (UTF-8).</p>
<h2>Usage — decompress</h2>
<pre><code>curl "${HOST}/api?mode=decompress&text=H4sIAAAAAAAA/NIyzihNLlFQSk4tLlbKz1XIALqlSXoAAAA%3D"</code></pre>
<p>Feed base64 (or hex via <code>&amp;encoding=hex</code>) gzipped data, get the original text back.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> compression runs in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Gzip files &amp; text entirely client-side: <a href="${FULL_TOOL}">Gzip on formatho.com</a>.</p>
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

const LLMS_TXT = "# Gzip Compress & Decompress Online — Free & Private\n\n> Compress text to gzip (base64/hex output) and decompress gzip back to text via a free, privacy-first edge API. No uploads, no tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://gzip-converter-formatho.filesformatho.workers.dev/\n- [JSON API]: https://gzip-converter-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/gzip\n- [All 42 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function bytesToB64(bytes) {
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToHex(bytes) {
  let h = '';
  for (const b of bytes) h += b.toString(16).padStart(2, '0');
  return h;
}
function hexToBytes(hex) {
  if (hex.length === 0 || hex.length % 2) throw new Error('hex input must have an even number of digits');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('hex input contains non-hex characters');
    out[i] = byte;
  }
  return out;
}

async function gzipCompress(bytes) {
  const cs = new CompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function gzipDecompress(bytes) {
  const ds = new DecompressionStream('gzip');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

async function handleApi(request) {
  let text, mode = 'compress', encoding = 'base64';
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      text = body.text;
      if (body.mode !== undefined) mode = body.mode;
      if (body.encoding !== undefined) encoding = body.encoding;
    } catch { return err400('POST body must be JSON: {"text": "...", "mode": "compress|decompress", "encoding": "base64|hex"}'); }
  } else {
    const url = new URL(request.url);
    text = url.searchParams.get('text');
    mode = url.searchParams.get('mode') || 'compress';
    encoding = url.searchParams.get('encoding') || 'base64';
  }

  if (text === null || text === undefined || text === '') return err400('Missing required parameter: text');
  if (typeof text !== 'string') return err400('Parameter text must be a string');
  if (mode !== 'compress' && mode !== 'decompress') return err400('mode must be "compress" or "decompress"');
  if (encoding !== 'base64' && encoding !== 'hex') return err400('encoding must be "base64" or "hex"');

  try {
    if (mode === 'compress') {
      const inputBytes = new TextEncoder().encode(text);
      if (inputBytes.length > MAX_BYTES) return err400(`Input exceeds ${MAX_BYTES} byte (1 MB) limit`);
      const out = await gzipCompress(inputBytes);
      const ratio = inputBytes.length ? Math.round((1 - out.length / inputBytes.length) * 1000) / 10 : 0;
      return Response.json({
        input_length_bytes: inputBytes.length,
        gzip_length_bytes: out.length,
        compression_ratio_pct: ratio,
        gzip_base64: bytesToB64(out),
        gzip_hex: bytesToHex(out),
        mode: 'compress',
        decoded_by: 'Formatho edge API — zero tracking',
        full_tool: FULL_TOOL,
      }, { headers: JSON_HEADERS });
    }

    // decompress
    const clean = text.replace(/\s+/g, '');
    let inputBytes;
    try {
      inputBytes = encoding === 'hex' ? hexToBytes(clean) : b64ToBytes(clean);
    } catch (e) {
      return err400(`Invalid ${encoding} input: ${e.message}`);
    }
    if (inputBytes.length > MAX_BYTES) return err400(`Input exceeds ${MAX_BYTES} byte (1 MB) limit`);
    let out;
    try {
      out = await gzipDecompress(inputBytes);
    } catch {
      return err400('Input is not valid gzip data (RFC 1952) — check that you copied the full compressed payload and the encoding setting');
    }
    let decoded;
    try {
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(out);
    } catch {
      return err400('Decompressed data is not valid UTF-8 text — it may be binary data');
    }
    return Response.json({
      input_length_bytes: inputBytes.length,
      decompressed_length_bytes: out.length,
      text: decoded,
      mode: 'decompress',
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    }, { headers: JSON_HEADERS });
  } catch (e) {
    return err400(`Processing failed: ${e.message}`);
  }
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
