// Privacy-First Meta Tag Generator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://meta-tag-generator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/meta-tag-generator';

const TWITTER_CARDS = ['summary', 'summary_large_image', 'app', 'player'];
const ROBOTS_TOKENS = ['index', 'noindex', 'follow', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex', 'notranslate', 'max-snippet', 'max-image-preview', 'max-video-preview'];

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function validUrl(v) {
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}

function handleApi(request) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const title = p.get('title');
  const description = p.get('description');
  const keywords = p.get('keywords');
  const author = p.get('author');
  const canonical = p.get('canonical');
  const siteName = p.get('site_name');
  const ogType = p.get('og_type') || 'website';
  const ogImage = p.get('og_image');
  const twitterCard = p.get('twitter_card') || (ogImage ? 'summary_large_image' : 'summary');
  const twitterSite = p.get('twitter_site');
  const robots = p.get('robots') || 'index, follow';
  const themeColor = p.get('theme_color');
  const charset = p.get('charset') || 'utf-8';
  const viewport = p.get('viewport') || 'width=device-width, initial-scale=1';

  const inputs = { title, description, keywords, author, canonical, site_name: siteName, og_image: ogImage, twitter_site: twitterSite, theme_color: themeColor };
  if (!Object.values(inputs).some(Boolean)) {
    return Response.json({ error: 'Provide at least one parameter, e.g. ?title=My%20Page&description=... Supported: title, description, keywords, author, canonical, site_name, og_type, og_image, twitter_card, twitter_site, robots, theme_color, charset, viewport' }, { status: 400, headers: JSON_HEADERS });
  }
  const errors = [];
  const warnings = [];
  if (canonical && !validUrl(canonical)) errors.push('canonical must be an absolute http(s) URL');
  if (ogImage && !validUrl(ogImage)) errors.push('og_image must be an absolute http(s) URL');
  if (!TWITTER_CARDS.includes(twitterCard)) errors.push(`twitter_card must be one of: ${TWITTER_CARDS.join(', ')}`);
  if (themeColor && !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(themeColor)) errors.push('theme_color must be a hex color like #0a5 or #00aa55');
  if (charset && !/^[a-zA-Z0-9._:-]{3,32}$/.test(charset)) errors.push('charset looks invalid (try utf-8)');
  if (errors.length) return Response.json({ error: errors.join('; '), hints: errors.map((e) => e.split(' must ')[0]).map((k) => ({ [k]: 'check the docs at https://formatho.com/tools/meta-tag-generator' })) }, { status: 400, headers: JSON_HEADERS });

  if (title && title.length > 60) warnings.push(`title is ${title.length} chars — search results truncate around 60`);
  if (description && description.length > 160) warnings.push(`description is ${description.length} chars — search results truncate around 160`);
  const badRobots = robots.split(',').map((t) => t.trim().split(':')[0].toLowerCase()).filter((t) => t && !ROBOTS_TOKENS.includes(t));
  if (badRobots.length) warnings.push(`unknown robots token(s): ${badRobots.join(', ')} — allowed: ${ROBOTS_TOKENS.join(', ')}`);
  if (ogImage && !/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(ogImage) && !/\/(og|image|img|cover|share)/i.test(ogImage)) warnings.push('og_image does not look like an image URL (no image extension or /og|/image path) — Open Graph scrapers need a direct image');

  const tags = [];
  tags.push(`<meta charset="${esc(charset)}">`);
  tags.push(`<meta name="viewport" content="${esc(viewport)}">`);
  tags.push(`<title>${esc(title || '')}</title>`);
  tags.push(`<meta name="description" content="${esc(description || '')}">`);
  if (keywords) tags.push(`<meta name="keywords" content="${esc(keywords)}">`);
  if (author) tags.push(`<meta name="author" content="${esc(author)}">`);
  tags.push(`<meta name="robots" content="${esc(robots)}">`);
  if (themeColor) tags.push(`<meta name="theme-color" content="${esc(themeColor)}">`);
  tags.push('<!-- Open Graph -->');
  if (siteName) tags.push(`<meta property="og:site_name" content="${esc(siteName)}">`);
  tags.push(`<meta property="og:type" content="${esc(ogType)}">`);
  tags.push(`<meta property="og:title" content="${esc(title || '')}">`);
  tags.push(`<meta property="og:description" content="${esc(description || '')}">`);
  if (canonical) tags.push(`<meta property="og:url" content="${esc(canonical)}">`);
  if (ogImage) tags.push(`<meta property="og:image" content="${esc(ogImage)}">`);
  if (canonical) tags.push(`<link rel="canonical" href="${esc(canonical)}">`);
  tags.push('<!-- Twitter -->');
  tags.push(`<meta name="twitter:card" content="${esc(twitterCard)}">`);
  tags.push(`<meta name="twitter:title" content="${esc(title || '')}">`);
  tags.push(`<meta name="twitter:description" content="${esc(description || '')}">`);
  if (ogImage) tags.push(`<meta name="twitter:image" content="${esc(ogImage)}">`);
  if (twitterSite) tags.push(`<meta name="twitter:site" content="${esc(twitterSite)}">`);

  return Response.json({
    inputs: { title, description, keywords, author, canonical, site_name: siteName, og_type: ogType, og_image: ogImage, twitter_card: twitterCard, twitter_site: twitterSite, robots, theme_color: themeColor, charset, viewport },
    meta_tags: tags,
    html: tags.join('\n'),
    warnings,
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meta Tag Generator Online (SEO, Open Graph, Twitter) — Free &amp; Private API</title>
<meta name="description" content="Generate SEO meta tags — title, description, robots, Open Graph and Twitter cards — from one free JSON API call. Copy-paste HTML, zero tracking. Full tool on formatho.com.">
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
  "name": "Meta Tag Generator Online (SEO, Open Graph, Twitter) — Free & Private API",
  "url": "https://meta-tag-generator-formatho.filesformatho.workers.dev/",
  "description": "Generate SEO meta tags — title, description, robots, Open Graph and Twitter cards — from one free JSON API call. Copy-paste HTML, zero tracking. Full tool on formatho.com.",
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
  <h1>Meta Tag Generator — Free &amp; Private API</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?title=My%20Page&description=A%20great%20page&canonical=https://example.com/&og_image=https://example.com/og.png"</code></pre>
<p>Returns ready-to-paste meta tags: charset &amp; viewport, title, description, keywords, author, robots, theme-color, Open Graph (og:title/description/url/image/type/site_name), Twitter card tags and canonical link — plus length warnings when title/description exceed SERP truncation limits.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> tags are rendered in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Interactive generator with live preview: <a href="${FULL_TOOL}">Meta Tag Generator on formatho.com</a>.</p>
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

const LLMS_TXT = "# ${esc(title || '')}\n\n> ${esc(description || '')} Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://meta-tag-generator-formatho.filesformatho.workers.dev/\n- [JSON API]: https://meta-tag-generator-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/meta-tag-generator\n- [All 38 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

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
if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
        if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
