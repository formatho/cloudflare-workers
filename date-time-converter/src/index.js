// Privacy-First Date-Time Converter API (ISO 8601 / Unix / RFC formats + timezones) — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://date-time-converter-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/date-time-converter';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Date-Time Converter Online (ISO 8601, Unix, Timezones) — Free &amp; Private</title>
<meta name="description" content="Convert dates and times between ISO 8601, Unix timestamps (s/ms/µs/ns), RFC 2822 and HTTP dates — with timezone conversion for any IANA zone. Free, privacy-first API. Full tool on formatho.com.">
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
  "name": "Date-Time Converter Online (ISO 8601, Unix, Timezones) — Free & Private",
  "url": "https://date-time-converter-formatho.filesformatho.workers.dev/",
  "description": "Convert dates and times between ISO 8601, Unix timestamps (s/ms/µs/ns), RFC 2822 and HTTP dates — with timezone conversion for any IANA zone. Free, privacy-first API. Full tool on formatho.com.",
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
  <h1>Date-Time Converter Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code># ISO 8601 → every format
curl "${HOST}/api?input=2026-10-13T15:00:00%2B05:30"

# Unix timestamp (auto s/ms/µs/ns) → ISO
curl "${HOST}/api?input=1760329200"

# Timezone conversion (naive input read in &from, wall clock output in &to)
curl "${HOST}/api?input=2026-10-13T15:00:00&from=Asia/Kolkata&to=America/New_York"</code></pre>
<p>Returns Unix seconds/milliseconds/microseconds/nanoseconds, ISO 8601 (UTC), RFC 2822, HTTP date, plus wall-clock date, time, weekday, ISO week, day of year, quarter, UTC offset and DST status in the target timezone.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> conversion happens in-memory at the edge and is never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Convert dates entirely client-side: <a href="${FULL_TOOL}">Date-Time Converter on formatho.com</a>.</p>
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

const LLMS_TXT = "# Date-Time Converter Online (ISO 8601, Unix, Timezones) — Free & Private\n\n> Convert dates and times between ISO 8601, Unix timestamps (s/ms/µs/ns), RFC 2822 and HTTP dates, with timezone conversion for any IANA zone. Free, privacy-first API with zero tracking. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://date-time-converter-formatho.filesformatho.workers.dev/\n- [JSON API]: https://date-time-converter-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/date-time-converter\n- [All Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_INPUT = 100;
const FORMATS = ['iso', 'unix_s', 'unix_ms', 'unix_us', 'unix_ns', 'rfc2822', 'http', 'datetime', 'date', 'time', 'offset', 'relative'];

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

function validTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// Offset (minutes east of UTC) of timezone tz at instant dateMs.
function tzOffsetMinutes(dateMs, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(dateMs)).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - Math.floor(dateMs / 1000) * 1000) / 60000);
}

// Interpret a naive wall-clock ISO string in timezone tz → epoch ms.
function naiveToMs(iso, tz) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, ms] = m;
  const guess = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0), +(ms || 0));
  if (!Number.isFinite(guess)) return null;
  const off1 = tzOffsetMinutes(guess, tz) * 60000;
  const t1 = guess - off1;
  const off2 = tzOffsetMinutes(t1, tz) * 60000; // refine once (DST edges)
  const t = guess - off2;
  if (!Number.isFinite(t) || Math.abs(t) > 8.64e15) return null;
  return t;
}

function pad2(n) { return String(n).padStart(2, '0'); }

function isoWeek(dateObj) {
  const d = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { week, week_year: d.getUTCFullYear() };
}

function dayOfYear(dateObj) {
  const start = Date.UTC(dateObj.getUTCFullYear(), 0, 1);
  return Math.floor((Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()) - start) / 86400000) + 1;
}

function relativeString(diffMs) {
  const abs = Math.abs(diffMs);
  const units = [
    [31536000000, 'year'], [2592000000, 'month'], [604800000, 'week'],
    [86400000, 'day'], [3600000, 'hour'], [60000, 'minute'], [1000, 'second'],
  ];
  for (const [ms, name] of units) {
    if (abs >= ms) {
      const v = Math.round(abs / ms);
      return diffMs >= 0 ? `${v} ${name}${v > 1 ? 's' : ''} ago` : `in ${v} ${name}${v > 1 ? 's' : ''}`;
    }
  }
  return 'just now';
}

async function readParams(request, url) {
  const p = {
    input: url.searchParams.get('input'),
    from: url.searchParams.get('from') || 'UTC',
    to: url.searchParams.get('to') || 'UTC',
    format: url.searchParams.get('format'),
  };
  if (request.method === 'POST') {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      try {
        const body = await request.json();
        if (body && typeof body === 'object' && !Array.isArray(body)) {
          if (typeof body.input === 'string') p.input = body.input;
          if (typeof body.from === 'string') p.from = body.from;
          if (typeof body.to === 'string') p.to = body.to;
          if (typeof body.format === 'string') p.format = body.format;
        }
      } catch (e) { throw new Error('request body is not valid JSON'); }
    }
  }
  return p;
}

async function handleApi(request) {
  const url = new URL(request.url);
  let p;
  try {
    p = await readParams(request, url);
  } catch (e) {
    return err400(e.message);
  }
  if (p.input == null || p.input.trim() === '') return err400('Missing required parameter: input (ISO 8601 string or Unix timestamp)');
  const input = p.input.trim();
  if (input.length > MAX_INPUT) return err400(`input too long (max ${MAX_INPUT} chars)`);
  if (p.format != null && !FORMATS.includes(p.format)) return err400(`Invalid format "${p.format}" — supported: ${FORMATS.join(', ')}`);
  if (!validTz(p.from)) return err400(`Unknown from timezone "${p.from}" — use an IANA name like Asia/Kolkata`);
  if (!validTz(p.to)) return err400(`Unknown to timezone "${p.to}" — use an IANA name like America/New_York`);

  let ms = null;
  let kind = null;

  if (/^-?\d{1,19}$/.test(input)) {
    const digits = input.replace('-', '').length;
    const v = BigInt(input);
    if (digits <= 10) { ms = Number(v) * 1000; kind = 'epoch_s'; }
    else if (digits <= 13) { ms = Number(v); kind = 'epoch_ms'; }
    else if (digits <= 16) { ms = Number(v) / 1000; kind = 'epoch_us'; }
    else { ms = Number(v) / 1e6; kind = 'epoch_ns'; }
    if (!Number.isFinite(ms) || Math.abs(ms) >= 8.64e15) return err400('Timestamp out of supported range (dates must be within ±100,000,000 days of Unix epoch)');
  } else {
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input);
    const normalized = input.replace(' ', 'T');
    let parsed = Date.parse(normalized);
    if (Number.isFinite(parsed) && !hasTz && /T\d{2}:\d{2}/.test(normalized)) {
      ms = naiveToMs(normalized, p.from); // naive wall clock → interpret in from tz
      if (ms == null) return err400('Unparseable date-time: expected ISO 8601 like 2026-10-13T15:00:00 or 2026-10-13');
      kind = 'naive_datetime';
    } else if (Number.isFinite(parsed)) {
      ms = parsed;
      kind = /T\d{2}:\d{2}/.test(normalized) ? 'iso_datetime' : 'date_only';
    } else {
      return err400('Unparseable date-time: expected ISO 8601 (2026-10-13, 2026-10-13T15:00:00Z) or Unix timestamp');
    }
  }

  const date = new Date(ms);
  if (isNaN(date.getTime())) return err400('Invalid date');
  const msBig = BigInt(Math.trunc(ms));
  const usBig = msBig * 1000n;
  const nsBig = usBig * 1000n;

  const offMin = tzOffsetMinutes(ms, p.to);
  const sign = offMin >= 0 ? '+' : '-';
  const offAbs = Math.abs(offMin);
  const offsetStr = `${sign}${pad2(Math.floor(offAbs / 60))}:${pad2(offAbs % 60)}`;

  // Wall clock in target tz
  const wall = new Date(ms + offMin * 60000); // shifted so UTC getters show wall clock
  const wallDate = `${wall.getUTCFullYear()}-${pad2(wall.getUTCMonth() + 1)}-${pad2(wall.getUTCDate())}`;
  const wallTime = `${pad2(wall.getUTCHours())}:${pad2(wall.getUTCMinutes())}:${pad2(wall.getUTCSeconds())}`;

  // DST heuristic for target tz: active when offset differs from the smaller of Jan/Jul offsets
  const y = wall.getUTCFullYear();
  const janOff = tzOffsetMinutes(Date.UTC(y, 0, 15), p.to);
  const julOff = tzOffsetMinutes(Date.UTC(y, 6, 15), p.to);
  const dstActive = offMin > Math.min(janOff, julOff);

  const tzAbbr = new Intl.DateTimeFormat('en-US', { timeZone: p.to, timeZoneName: 'short' })
    .formatToParts(date).find((x) => x.type === 'timeZoneName')?.value || '';

  const wk = isoWeek(wall);
  const daysInMonth = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() + 1, 0)).getUTCDate();
  const isLeap = (wall.getUTCFullYear() % 4 === 0 && wall.getUTCFullYear() % 100 !== 0) || wall.getUTCFullYear() % 400 === 0;

  const iso = date.toISOString();
  const rfc2822 = `${WEEKDAYS[date.getUTCDay()].slice(0, 3)}, ${pad2(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} +0000`;
  const httpDate = `${WEEKDAYS[date.getUTCDay()].slice(0, 3)}, ${pad2(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} GMT`;

  const out = {
    input,
    input_kind: kind,
    unix_s: Math.floor(ms / 1000),
    unix_ms: Math.trunc(ms),
    unix_us: usBig.toString(),
    unix_ns: nsBig.toString(),
    iso8601: iso,
    rfc2822,
    http_date: httpDate,
    timezone: p.to,
    date: wallDate,
    time: wallTime,
    datetime: `${wallDate}T${wallTime}`,
    utc_offset: offsetStr,
    tz_abbr: tzAbbr,
    weekday: WEEKDAYS[wall.getUTCDay()],
    iso_week: wk.week,
    iso_week_year: wk.week_year,
    day_of_year: dayOfYear(wall),
    quarter: Math.floor(wall.getUTCMonth() / 3) + 1,
    days_in_month: daysInMonth,
    is_leap_year: isLeap,
    dst_active: dstActive,
    relative_to_now: relativeString(Date.now() - ms),
    from_timezone_used: kind === 'naive_datetime' ? p.from : null,
    note: 'dst_active is a heuristic (offset vs Jan/Jul of the same year); ISO 8601 date-only inputs are UTC midnight per spec',
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  };

  if (p.format != null) {
    const map = {
      iso: out.iso8601, unix_s: String(out.unix_s), unix_ms: String(out.unix_ms),
      unix_us: out.unix_us, unix_ns: out.unix_ns, rfc2822, http: httpDate,
      datetime: out.datetime, date: wallDate, time: wallTime, offset: offsetStr,
      relative: out.relative_to_now,
    };
    out.formatted = map[p.format];
  }

  return Response.json(out, { headers: JSON_HEADERS });
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
