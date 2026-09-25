// Privacy-First Text Statistics API (word & character counter) — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://text-statistics-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/text-statistics';
const MAX_CHARS = 1_000_000;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Text Statistics API (Word &amp; Character Counter) — Free &amp; Private</title>
<meta name="description" content="Free text statistics API: characters, words, unique words, sentences, paragraphs, lines, reading &amp; speaking time, top words — one call, zero tracking. Full tool on formatho.com.">
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
  <h1>Text Statistics API — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?text=Hello%20world.%20Hello%20there!"

# include the 5 most frequent words:
curl "${HOST}/api?text=...&amp;top=5"

# POST the text as the raw body:
curl -X POST --data-binary @essay.txt "${HOST}/api"</code></pre>
<p>Returns characters, characters without spaces, words, unique words, sentences, paragraphs, lines, average word/sentence length, reading time (200 wpm), speaking time (130 wpm) and optional top-N frequent words.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> text is analyzed in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Count words &amp; characters entirely client-side: <a href="${FULL_TOOL}">Text Statistics on formatho.com</a>.</p>
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

const round2 = (n) => Math.round(n * 100) / 100;
const fmtDuration = (seconds) => {
  if (seconds < 1) return 'under 1 second';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m === 0 ? `${s}s` : `${m}m ${s.toString().padStart(2, '0')}s`;
};

function analyze(text, topN) {
  const tokens = text.match(/\S+/g) || [];
  const words = tokens.map((t) => t.replace(/^[^\w']+|[^\w']+$/g, '')).filter(Boolean);
  const sentences = (text.match(/[.!?…]+(?=\s|$)/g) || []).length || (text.trim() ? 1 : 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const lines = text.split('\n').length;
  const unique = new Set(words.map((w) => w.toLowerCase()));
  const wordChars = words.reduce((a, w) => a + w.length, 0);

  const out = {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: words.length,
    uniqueWords: unique.size,
    sentences,
    paragraphs,
    lines,
    avgWordLength: words.length ? round2(wordChars / words.length) : 0,
    avgSentenceLength: sentences ? round2(words.length / sentences) : 0,
    readingTime: { wordsPerMinute: 200, seconds: Math.max(words.length ? 1 : 0, Math.round((words.length / 200) * 60)), human: fmtDuration((words.length / 200) * 60) },
    speakingTime: { wordsPerMinute: 130, seconds: Math.max(words.length ? 1 : 0, Math.round((words.length / 130) * 60)), human: fmtDuration((words.length / 130) * 60) },
    computed_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  };

  if (topN > 0) {
    const freq = new Map();
    for (const w of words) {
      const k = w.toLowerCase();
      freq.set(k, (freq.get(k) || 0) + 1);
    }
    out.topWords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, topN)
      .map(([word, count]) => ({ word, count }));
  }
  return out;
}

function respondStats(text, topRaw) {
  if (text.length > MAX_CHARS) {
    return Response.json({ error: `Text too large: ${text.length} characters (max ${MAX_CHARS}).` }, { status: 413, headers: JSON_HEADERS });
  }
  let topN = 0;
  if (topRaw !== null) {
    topN = Number(topRaw);
    if (!Number.isInteger(topN) || topN < 1 || topN > 50) {
      return Response.json({ error: "Parameter 'top' must be an integer 1–50." }, { status: 400, headers: JSON_HEADERS });
    }
  }
  return Response.json(analyze(text, topN), { headers: JSON_HEADERS });
}

async function handleApi(request) {
  const url = new URL(request.url);
  if (request.method === 'POST') {
    const text = await request.text();
    if (!text) return Response.json({ error: 'Missing text: POST the text as the raw request body.' }, { status: 400, headers: JSON_HEADERS });
    return respondStats(text, url.searchParams.get('top'));
  }
  const text = url.searchParams.get('text');
  if (text === null || text === '') {
    return Response.json({ error: 'Missing required parameter: text (or POST the text as the raw body). Example: /api?text=hello%20world' }, { status: 400, headers: JSON_HEADERS });
  }
  return respondStats(text, url.searchParams.get('top'));
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
