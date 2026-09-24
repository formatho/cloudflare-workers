// Privacy-First Text ⇄ Binary Converter API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://text-to-binary-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/text-to-binary';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Text to Binary Converter Online (and Binary to Text) — Free &amp; Private</title>
<meta name="description" content="Convert text to binary UTF-8 bytes and binary back to text — free, privacy-first edge API with zero tracking. Unicode-safe, hex and codepoint output too.">
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
</head>
<body>
<header>
  <h1>Text to Binary Converter — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?text=hello"
curl "${HOST}/api?binary=0110100001100101011011000110110001101111"</code></pre>
<p><code>text</code> converts text → binary (UTF-8, space-separated 8-bit groups, plus hex and Unicode codepoints). <code>binary</code> converts binary → text back. Full reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> conversion happens in-memory at the edge and your text is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Convert entirely client-side: <a href="${FULL_TOOL}">Text to Binary on formatho.com</a>.</p>
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

function bad(message) {
  return Response.json({ error: message }, { status: 400, headers: JSON_HEADERS });
}

function textToBinary(text) {
  const bytes = new TextEncoder().encode(text);
  const groups = [...bytes].map(b => b.toString(2).padStart(8, '0'));
  const codepoints = [...text].map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
  return Response.json({
    input: text,
    binary: groups.join(' '),
    binary_joined: groups.join(''),
    hex: [...bytes].map(b => b.toString(16).padStart(2, '0')).join(' '),
    unicode_codepoints: codepoints,
    bytes: bytes.length,
    characters: [...text].length,
    encoding: 'UTF-8',
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

function binaryToText(binary) {
  const cleaned = binary.replace(/[\s,._-]/g, '');
  if (!cleaned.length) return bad('binary parameter is empty');
  if (!/^[01]+$/.test(cleaned)) return bad('binary contains non-binary characters (only 0 and 1 allowed; spaces/underscores as separators are fine)');
  if (cleaned.length % 8 !== 0) return bad(`binary length (${cleaned.length} bits) is not a multiple of 8 — each byte needs exactly 8 bits`);
  if (cleaned.length > 512 * 1024 * 8) return bad('binary too large (max 512KB of text)');
  const bytes = new Uint8Array(cleaned.length / 8);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(cleaned.slice(i * 8, i * 8 + 8), 2);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return bad('decoded bytes are not valid UTF-8 — check that every 8-bit group is correct');
  }
  return Response.json({
    input: binary.trim(),
    text: text,
    bytes: bytes.length,
    encoding: 'UTF-8',
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

function handleApi(request) {
  const url = new URL(request.url);
  const text = url.searchParams.get('text');
  const binary = url.searchParams.get('binary');
  if (text && binary) return bad('Provide either text (to encode) or binary (to decode), not both');
  if (text) {
    if (text.length > 256 * 1024) return bad('text too large (max 256KB)');
    return textToBinary(text);
  }
  if (binary) return binaryToText(binary);
  return bad('Missing required parameter: text (text → binary) or binary (binary → text)');
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
