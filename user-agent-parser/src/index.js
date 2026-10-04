// Privacy-First User Agent Parser API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://user-agent-parser-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/user-agent-parser';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>User Agent Parser Online — Free &amp; Private</title>
<meta name="description" content="Parse any User-Agent string to browser, engine, OS, device type and bot detection with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com.">
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
  "name": "User Agent Parser Online — Free & Private",
  "url": "https://user-agent-parser-formatho.filesformatho.workers.dev/",
  "description": "Parse any User-Agent string to browser, engine, OS, device type and bot detection with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com.",
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
  <h1>User Agent Parser — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?ua=Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/131.0.0.0%20Safari/537.36"</code></pre>
<p>Returns browser + version, rendering engine, operating system, device type (desktop / mobile / tablet / bot) and bot detection in one JSON response.</p>
<h2>Parse your own User-Agent</h2>
<pre><code>curl "${HOST}/api"</code></pre>
<p>No <code>ua</code> parameter? The API parses the <code>User-Agent</code> header of the request itself — ideal for quick "what does my UA look like" checks.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> parsing runs in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Parse user agents entirely client-side: <a href="${FULL_TOOL}">User Agent Parser on formatho.com</a>.</p>
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

const LLMS_TXT = "# User Agent Parser Online — Free & Private\n\n> Parse any User-Agent string to browser, engine, OS, device type and bot detection with a free, privacy-first edge API. Zero tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://user-agent-parser-formatho.filesformatho.workers.dev/\n- [JSON API]: https://user-agent-parser-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/user-agent-parser\n- [All 44 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

// --- Detection tables (order matters: specific before generic) ---

const BOTS = [
  [/Google(?:bot|-InspectionTool|-Extended|bot-Image|bot-News|bot-Mobile|AdsBot-Google|Mediapartners)[/\s]?([\d.]*)/i, 'Googlebot'],
  [/bingbot\/?([\d.]*)/i, 'Bingbot'],
  [/bingpreview/i, 'Bing Preview'],
  [/DuckDuck(Bot|Go-Favicon|Go)\/?([\d.]*)/i, 'DuckDuckBot'],
  [/Baiduspider/i, 'Baidu Spider'],
  [/Sogou (web|news) spider/i, 'Sogou Spider'],
  [/Yandex(Bot|Images|Metrika)\/?([\d.]*)/i, 'YandexBot'],
  [/Slurp/i, 'Yahoo! Slurp'],
  [/facebookexternalhit|meta-externalagent|FacebookBot/i, 'Facebook Bot'],
  [/Twitterbot/i, 'Twitterbot'],
  [/LinkedInBot/i, 'LinkedInBot'],
  [/TelegramBot|Telegram.*\(like/i, 'TelegramBot'],
  [/WhatsApp/i, 'WhatsApp Bot'],
  [/Discordbot/i, 'Discord Bot'],
  [/Slackbot-LinkExpanding|Slack-ImgProxy/i, 'Slackbot'],
  [/SemrushBot/i, 'SemrushBot'],
  [/AhrefsBot/i, 'AhrefsBot'],
  [/MJ12bot/i, 'MJ12bot'],
  [/DotBot/i, 'DotBot'],
  [/PetalBot/i, 'PetalBot'],
  [/GPTBot/i, 'GPTBot'],
  [/ClaudeBot|Claude-Web|anthropic-ai/i, 'ClaudeBot'],
  [/PerplexityBot/i, 'PerplexityBot'],
  [/CCBot/i, 'CCBot'],
  [/Bytespider/i, 'Bytespider'],
  [/Amazonbot/i, 'Amazonbot'],
  [/Applebot(?!-Extended)/i, 'Applebot'],
  [/Chrome-Lighthouse/i, 'Lighthouse'],
  [/HeadlessChrome\/([\d.]+)/i, 'Headless Chrome'],
  [/\bcurl\/([\d.]+)/i, 'curl'],
  [/\bwget\/([\d.]+)/i, 'Wget'],
  [/python-requests\/([\d.]+)/i, 'python-requests'],
  [/python-httpx\/([\d.]+)/i, 'python-httpx'],
  [/httpx\/([\d.]+)/i, 'HTTPie'],
  [/node-fetch/i, 'node-fetch'],
  [/axios\/([\d.]+)/i, 'axios'],
  [/Go-http-client\/([\d.]+)/i, 'Go HTTP client'],
  [/Java\/([\d.]+)/i, 'Java HTTP client'],
  [/okhttp\/([\d.]+)/i, 'okhttp'],
  [/Apache-HttpClient\/([\d.]+)/i, 'Apache HttpClient'],
  [/PostmanRuntime\/([\d.]+)/i, 'Postman'],
  [/Feedfetcher-Google|FeedValidator|validator/i, 'Feed Validator'],
];

const WINDOWS_NT = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7', '6.0': 'Vista', '5.2': 'XP x64', '5.1': 'XP', '5.0': '2000' };

function detectBrowser(ua) {
  // Seamonkey contains "Firefox/" — test it first.
  if (/Seamonkey\/([\d.]+)/i.test(ua)) return { name: 'SeaMonkey', version: ua.match(/Seamonkey\/([\d.]+)/i)[1], engine: 'Gecko' };
  if (/Edg(?:e|A|iOS)?\/([\d.]+)/i.test(ua)) return { name: 'Microsoft Edge', version: ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/Edge\/([\d.]+)/i.test(ua)) return { name: 'Microsoft Edge (Legacy)', version: ua.match(/Edge\/([\d.]+)/i)[1], engine: 'EdgeHTML' };
  if (/SamsungBrowser\/([\d.]+)/i.test(ua)) return { name: 'Samsung Internet', version: ua.match(/SamsungBrowser\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/OPR\/([\d.]+)/i.test(ua)) return { name: 'Opera', version: ua.match(/OPR\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/Opera[ /]([\d.]+).*Presto/i.test(ua)) return { name: 'Opera (Presto)', version: ua.match(/Opera[ /]([\d.]+)/i)[1], engine: 'Presto' };
  if (/Opera Mini\/([\d.]+)/i.test(ua)) return { name: 'Opera Mini', version: ua.match(/Opera Mini\/([\d.]+)/i)[1], engine: 'Presto' };
  if (/Vivaldi\/([\d.]+)/i.test(ua)) return { name: 'Vivaldi', version: ua.match(/Vivaldi\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/DuckDuckGo\/([\d.]+)/i.test(ua)) return { name: 'DuckDuckGo Browser', version: ua.match(/DuckDuckGo\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/FxiOS\/([\d.]+)/i.test(ua)) return { name: 'Firefox for iOS', version: ua.match(/FxiOS\/([\d.]+)/i)[1], engine: 'WebKit' };
  if (/Firefox\/([\d.]+)/i.test(ua)) return { name: 'Firefox', version: ua.match(/Firefox\/([\d.]+)/i)[1], engine: 'Gecko' };
  const cm = ua.match(/Chrome\/([\d.]+)/);
  if (cm && !/HeadlessChrome/i.test(ua)) return { name: 'Chrome', version: cm[1], engine: Number(cm[1].split('.')[0]) < 28 ? 'WebKit' : 'Blink' };
  if (/Chromium\/([\d.]+)/i.test(ua)) return { name: 'Chromium', version: ua.match(/Chromium\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/CriOS\/([\d.]+)/i.test(ua)) return { name: 'Chrome for iOS', version: ua.match(/CriOS\/([\d.]+)/i)[1], engine: 'WebKit' };
  if (/MSIE ([\d.]+)/i.test(ua)) return { name: 'Internet Explorer', version: ua.match(/MSIE ([\d.]+)/i)[1], engine: 'Trident' };
  const trident = ua.match(/Trident\/[\d.]+.*rv:([\d.]+)/i);
  if (trident) return { name: 'Internet Explorer', version: trident[1], engine: 'Trident' };
  if (/UCBrowser\/([\d.]+)/i.test(ua)) return { name: 'UC Browser', version: ua.match(/UCBrowser\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/MiuiBrowser\/([\d.]+)/i.test(ua)) return { name: 'Mi Browser', version: ua.match(/MiuiBrowser\/([\d.]+)/i)[1], engine: 'Blink' };
  if (/YaBrowser\/([\d.]+)/i.test(ua)) return { name: 'Yandex Browser', version: ua.match(/YaBrowser\/([\d.]+)/i)[1], engine: 'Blink' };
  const vm = ua.match(/Version\/([\d.]+)[^)]*\bSafari\//);
  const safari = vm || (/\bSafari\/(\d+)/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR/i.test(ua) ? ua.match(/\bSafari\/(\d+)/) : null);
  if (safari) return { name: 'Safari', version: vm ? vm[1] : safari[1], engine: 'WebKit' };
  return { name: null, version: null, engine: null };
}

function detectOS(ua) {
  const win = ua.match(/Windows Phone(?: OS)? ([\d.]+)/i);
  if (win) return { name: 'Windows Phone', version: win[1] };
  const nt = ua.match(/Windows NT ([\d.]+)/);
  if (nt) return { name: 'Windows', version: WINDOWS_NT[nt[1]] || nt[1] };
  if (/Windows/i.test(ua)) return { name: 'Windows', version: null };
  const android = ua.match(/Android[ /]?([\d.]+)/i);
  if (android) return { name: 'Android', version: android[1] };
  const ios = ua.match(/(iPhone|iPad|iPod).*?OS (\d+(?:[_.]\d+)+)/i) || ua.match(/(iPhone|iPad|iPod)/i);
  if (ios) return { name: 'iOS', version: ios[2] ? ios[2].replace(/_/g, '.') : null };
  const mac = ua.match(/Mac OS X(?: )?([\d_.]+)/);
  if (mac && /Macintosh/i.test(ua)) return { name: 'macOS', version: mac[1].replace(/_/g, '.') };
  if (/CrOS/i.test(ua)) return { name: 'ChromeOS', version: (ua.match(/CrOS \S+ ([\d.]+)/) || [])[1] || null };
  if (/Macintosh|Mac_PowerPC/i.test(ua)) return { name: 'macOS', version: null };
  if (/Ubuntu/i.test(ua)) return { name: 'Ubuntu', version: (ua.match(/Ubuntu\/?([\d.]+)/) || [])[1] || null };
  if (/Fedora/i.test(ua)) return { name: 'Fedora', version: null };
  if (/[Ll]inux/i.test(ua)) return { name: 'Linux', version: null };
  if (/FreeBSD/i.test(ua)) return { name: 'FreeBSD', version: null };
  return { name: null, version: null };
}

function parseUA(ua) {
  let botName = null;
  for (const [re, name] of BOTS) {
    const m = ua.match(re);
    if (m) { botName = name; break; }
  }
  if (!botName && /bot|crawler|spider|scrap|fetcher|preview|monitor|uptime|archiver/i.test(ua)) botName = 'Generic Bot';

  const browser = botName ? { name: botName, version: null, engine: null } : detectBrowser(ua);
  const os = detectOS(ua);
  const engineVersion = (() => {
    const gecko = ua.match(/rv:([\d.]+)/);
    if (browser.engine === 'Gecko' && gecko) return gecko[1];
    const trident = ua.match(/Trident\/([\d.]+)/);
    if (browser.engine === 'Trident' && trident) return trident[1];
    return null;
  })();

  let deviceType = 'desktop';
  if (botName) deviceType = 'bot';
  else if (/iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua) || /Android.+Mobile/i.test(ua)) deviceType = 'mobile';
  else if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) deviceType = 'tablet';

  // Android model token: "Android 13; SM-X710)" (modern) or "...; SM-G991B Build/TP1A" (legacy).
  let model = null;
  if (/Android/i.test(ua)) {
    const mm = ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\s+Build\/|\s*[;)])/);
    const token = mm ? mm[1].trim() : null;
    if (token && !/^(mobile|tablet|wv|desktop)$/i.test(token)) model = token;
  } else {
    const im = ua.match(/iPhone(\d+,\d+)/);
    if (im) model = 'iPhone' + im[1];
  }
  return {
    browser: { name: browser.name, version: browser.version },
    engine: browser.engine ? { name: browser.engine, version: engineVersion } : { name: null, version: null },
    os,
    device: {
      type: deviceType,
      touch: /Touch/i.test(ua) || deviceType === 'mobile' || deviceType === 'tablet',
      model,
    },
    bot: { is_bot: Boolean(botName), name: botName },
  };
}

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

async function parseArgs(request) {
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return { __bad: true };
    return { ua: body.ua !== undefined ? String(body.ua) : undefined };
  }
  const url = new URL(request.url);
  const p = url.searchParams.get('ua');
  return { ua: p === null ? undefined : p };
}

async function handleApi(request) {
  let { ua, __bad } = await parseArgs(request);
  if (__bad) return err400('POST body must be JSON: {"ua": "Mozilla/5.0 ..."}');
  // No explicit ua → analyze the caller's own User-Agent header.
  if (ua === undefined) ua = request.headers.get('user-agent') || '';
  ua = ua.trim();
  if (!ua) return err400('Missing required parameter: ua (or send a non-empty User-Agent header)');
  if (ua.length > 512) return err400(`ua too long (${ua.length} chars, max 512)`);

  return Response.json({
    user_agent: ua,
    ...parseUA(ua),
    analyzed_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
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
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
