// Privacy-First Cron Expression Parser/Explainer API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://cron-parser-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/crontab-generator';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cron Expression Explainer — Free &amp; Private | Formatho</title>
<meta name="description" content="Explain any cron expression in plain English and get its next run times — free, privacy-first API. Zero tracking. Full crontab generator on formatho.com.">
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
  <h1>Cron Expression Explainer — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?expr=0+9+*+*+1-5"</code></pre>
<p>Returns a plain-English explanation of the expression plus the next 5 run times (UTC). Supports standard 5-field cron and @yearly/@monthly/@weekly/@daily/@hourly/@reboot aliases.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> expressions are parsed in-memory at the edge. No logs, no analytics, no cookies.</div>
<h2>Full browser tool</h2>
<p>Build crontab schedules interactively, entirely client-side: <a href="${FULL_TOOL}">Crontab Generator on formatho.com</a>.</p>
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

const ALIASES = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function parseField(field, min, max, names) {
  // returns array of allowed values or null on error
  const out = new Set();
  for (const part of field.split(',')) {
    let step = 1;
    let range = part;
    const stepIdx = part.indexOf('/');
    if (stepIdx !== -1) {
      range = part.slice(0, stepIdx);
      step = parseInt(part.slice(stepIdx + 1), 10);
      if (!Number.isInteger(step) || step < 1) return null;
    }
    let lo, hi;
    if (range === '*') { lo = min; hi = max; }
    else {
      const r = range.split('-');
      if (r.length === 2) {
        lo = val(r[0]); hi = val(r[1]);
      } else {
        lo = hi = val(range);
        if (stepIdx !== -1) hi = max; // "n/step" means n..max
      }
      if (lo === null || hi === null || lo < min || hi > max || lo > hi) return null;
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out.size ? [...out] : null;

  function val(s) {
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (names) {
      const i = names.indexOf(s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
      if (i !== -1) return i + (names === MONTHS ? 1 : 0);
    }
    return null;
  }
}

function explain(fields) {
  const [m, h, dom, mon, dow] = fields;
  const fmtList = (arr, unit) => arr.length === 1 ? `${unit} ${arr[0]}` : `${unit}s ${arr.join(', ')}`;
  const parts = [];
  if (m.length === 60 && h.length === 24) parts.push('every minute');
  else if (h.length === 24) parts.push(`at minute ${m.length === 1 ? m[0] : 's ' + m.join(', ')} of every hour`);
  else parts.push(`at ${String(h[0]).padStart(2,'0')}:${String(m.length === 1 ? m[0] : m[0]).padStart(2,'0')}${h.length > 1 ? ` (hours ${h.join(', ')})` : ''}${m.length > 1 && h.length === 1 ? `, minutes ${m.join(', ')}` : ''}`);
  if (dow.length === 7 && dom.length === 31) parts.push('every day');
  else if (dom.length !== 31) parts.push(`on day${dom.length > 1 ? 's' : ''} ${dom.join(', ')} of the month`);
  else if (dow.length !== 7) parts.push(`on ${dow.map(d => DAYS[d]).join(', ')}`);
  if (mon.length !== 12) parts.push(`in ${mon.map(mm => MONTHS[mm - 1]).join(', ')}`);
  return 'Runs ' + parts.join(', ') + '.';
}

function nextRuns(fields, count) {
  const [m, h, dom, mon, dow] = fields.map(f => new Set(f));
  // Standard cron semantics: if both dom and dow are restricted, either may match.
  const domAll = dom.size === 31, dowAll = dow.size === 7;
  const dayMatches = (d) =>
    domAll && dowAll ? true :
    domAll ? dow.has(d.getUTCDay()) :
    dowAll ? dom.has(d.getUTCDate()) :
    dom.has(d.getUTCDate()) || dow.has(d.getUTCDay());
  const runs = [];
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  while (runs.length < count && d.getTime() < Date.now() + 366 * 864e5) {
    if (mon.has(d.getUTCMonth() + 1) && dayMatches(d)) {
      if (h.has(d.getUTCHours()) && m.has(d.getUTCMinutes())) {
        runs.push(d.toISOString().replace('.000Z', 'Z'));
        d.setUTCHours(d.getUTCHours() + 1, 0, 0, 0);
        continue;
      }
      if (!h.has(d.getUTCHours())) { d.setUTCHours(d.getUTCHours() + 1, 0, 0, 0); continue; }
    }
    d.setMinutes(d.getUTCMinutes() + 1);
  }
  return runs;
}

function handleApi(request) {
  const url = new URL(request.url);
  let expr = url.searchParams.get('expr');
  const count = Math.min(parseInt(url.searchParams.get('count') || '5', 10) || 5, 20);
  if (!expr) return Response.json({ error: 'Missing required parameter: expr' }, { status: 400, headers: JSON_HEADERS });
  expr = expr.trim();
  const alias = ALIASES[expr.toLowerCase()];
  if (alias) expr = alias;
  const fields = expr.split(/\s+/);
  if (fields.length !== 5) return Response.json({ error: 'Expected a 5-field cron expression (minute hour day-of-month month day-of-week)' }, { status: 400, headers: JSON_HEADERS });
  const parsed = [
    parseField(fields[0], 0, 59),
    parseField(fields[1], 0, 23),
    parseField(fields[2], 1, 31),
    parseField(fields[3], 1, 12, MONTHS),
    parseField(fields[4], 0, 6, DAYS),
  ];
  if (parsed.some(p => p === null)) return Response.json({ error: 'Invalid cron expression', expr: fields.join(' ') }, { status: 400, headers: JSON_HEADERS });
  return Response.json({
    expression: fields.join(' '),
    alias_used: alias || null,
    explanation: explain(parsed),
    next_runs_utc: nextRuns(parsed, count),
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
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
