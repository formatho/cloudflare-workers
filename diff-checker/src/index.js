// Privacy-First Diff Checker API — formatho.com
// Myers line diff with unified hunks. No tracking, no data collection.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/tools/diff';
const HOST = 'https://diff-checker-formatho.filesformatho.workers.dev';

const MAX_CHARS = 300000;   // per input
const MAX_LINES = 4000;     // per input
const MAX_D = 800;          // Myers edit-distance cap (additions + deletions) — 10ms CPU guard

function splitLines(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (normalized === '') return { lines: [], trailingNewline: false };
  const trailingNewline = normalized.endsWith('\n');
  const lines = normalized.split('\n');
  if (trailingNewline) lines.pop();
  return { lines, trailingNewline };
}

// Myers O(ND) diff — returns ops: ['=', ai, bi] | ['+', null, bi] | ['-', ai, null]
// (indices into the arrays passed in; 0-based)
function myers(a, b) {
  const N = a.length, M = b.length;
  if (N === 0 && M === 0) return [];
  const MAX = N + M;
  const offset = MAX;
  let V = new Int32Array(2 * MAX + 1);
  const trace = [];
  let foundD = -1;
  for (let d = 0; d <= MAX; d++) {
    if (d > MAX_D) {
      const err = new Error(`Diff too large for the edge API: more than ${MAX_D} changed lines (additions + deletions). Use the browser tool at ${FULL_TOOL} — it diffs locally with no size limit.`);
      err.status = 413;
      throw err;
    }
    trace.push(V.slice());
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && V[offset + k - 1] < V[offset + k + 1])) x = V[offset + k + 1];
      else x = V[offset + k - 1] + 1;
      let y = x - k;
      while (x < N && y < M && a[x] === b[y]) { x++; y++; }
      V[offset + k] = x;
      if (x >= N && y >= M) { foundD = d; break; }
    }
    if (foundD >= 0) break;
  }
  const ops = [];
  let x = N, y = M;
  for (let d = foundD; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    let prevK;
    if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) prevK = k + 1;
    else prevK = k - 1;
    const prevX = v[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { x--; y--; ops.push(['=', x, y]); }
    if (d > 0) {
      if (x === prevX) { y--; ops.push(['+', null, y]); }
      else { x--; ops.push(['-', x, null]); }
    }
  }
  ops.reverse();
  return ops;
}

function diffLines(aLines, bLines, ignoreWs) {
  const key = (s) => (ignoreWs ? s.replace(/\s+/g, ' ').trim() : s);
  const aKeys = aLines.map(key);
  const bKeys = bLines.map(key);

  // trim common prefix/suffix so Myers only sees the changed middle
  let pre = 0;
  while (pre < aKeys.length && pre < bKeys.length && aKeys[pre] === bKeys[pre]) pre++;
  let suf = 0;
  while (suf < aKeys.length - pre && suf < bKeys.length - pre &&
         aKeys[aKeys.length - 1 - suf] === bKeys[bKeys.length - 1 - suf]) suf++;

  const midA = aKeys.slice(pre, aKeys.length - suf);
  const midB = bKeys.slice(pre, bKeys.length - suf);

  const midOps = myers(midA, midB);
  // rebuild full op list: common prefix equals, mapped middle ops, common suffix equals
  const ops = [];
  for (let i = 0; i < pre; i++) ops.push(['=', i, i]);
  for (const [t, ai, bi] of midOps) {
    if (t === '=') ops.push(['=', pre + ai, pre + bi]);
    else if (t === '+') ops.push(['+', null, pre + bi]);
    else ops.push(['-', pre + ai, null]);
  }
  for (let i = 0; i < suf; i++) ops.push(['=', aKeys.length - suf + i, bKeys.length - suf + i]);
  return ops;
}

function buildHunks(ops, aTexts, bTexts, context) {
  const rows = ops.map(([t, ai, bi]) => ({
    op: t === '=' ? ' ' : t,
    aNo: t === '+' ? null : ai + 1, // 1-based
    bNo: t === '-' ? null : bi + 1,
    text: t === '+' ? bTexts[bi] : aTexts[ai],
  }));

  // nearest preceding a/b line number for every row (for "0-count" hunk headers)
  const lastA = new Array(rows.length).fill(0);
  const lastB = new Array(rows.length).fill(0);
  let la = 0, lb = 0;
  rows.forEach((r, i) => { if (r.aNo !== null) la = r.aNo; if (r.bNo !== null) lb = r.bNo; lastA[i] = la; lastB[i] = lb; });

  const changes = [];
  rows.forEach((r, i) => { if (r.op !== ' ') changes.push(i); });
  if (changes.length === 0) return [];

  // cluster changes separated by more than 2*context equal rows
  const clusters = [];
  let start = changes[0], prev = changes[0];
  for (let i = 1; i < changes.length; i++) {
    if (changes[i] - prev - 1 > 2 * context) { clusters.push([start, prev]); start = changes[i]; }
    prev = changes[i];
  }
  clusters.push([start, prev]);

  const hunks = [];
  for (const [cs, ce] of clusters) {
    const from = Math.max(0, cs - context);
    const to = Math.min(rows.length - 1, ce + context);
    const slice = rows.slice(from, to + 1);
    let aStart = 0, bStart = 0, aCount = 0, bCount = 0;
    for (const r of slice) {
      if (r.aNo !== null) { if (!aCount) aStart = r.aNo; aCount++; }
      if (r.bNo !== null) { if (!bCount) bStart = r.bNo; bCount++; }
    }
    // unified-diff convention: a zero count points at the line *before* the insertion
    if (aCount === 0) aStart = from > 0 ? lastA[from - 1] : 0;
    if (bCount === 0) bStart = from > 0 ? lastB[from - 1] : 0;
    hunks.push({
      a_start: aStart, a_count: aCount, b_start: bStart, b_count: bCount,
      lines: slice.map(r => ({
        op: r.op,
        op_name: r.op === '+' ? 'add' : r.op === '-' ? 'remove' : 'context',
        a_line: r.aNo, b_line: r.bNo, text: r.text,
      })),
    });
  }
  return hunks;
}

function unifiedDiff(hunks) {
  if (!hunks.length) return '';
  const out = ['--- original', '+++ modified'];
  for (const h of hunks) {
    const ah = h.a_count === 1 ? String(h.a_start) : `${h.a_start},${h.a_count}`;
    const bh = h.b_count === 1 ? String(h.b_start) : `${h.b_start},${h.b_count}`;
    out.push(`@@ -${ah} +${bh} @@`);
    for (const l of h.lines) out.push(l.op + l.text);
  }
  return out.join('\n') + '\n';
}

const truthy = (v) => v === '1' || v === 'true' || v === 'yes' || v === true;

async function api(request) {
  try {
    const url = new URL(request.url);
    let a, b, context = 3, ignoreWs = false;

    if (request.method === 'POST') {
      const body = await request.text();
      let json;
      try { json = JSON.parse(body); } catch { throw new Error('POST body must be JSON: {"a": "...", "b": "...", "context": 3, "ignore_ws": false}'); }
      a = json.a ?? json.original ?? json.text1 ?? json.left;
      b = json.b ?? json.modified ?? json.text2 ?? json.right;
      if (json.context !== undefined) context = json.context;
      ignoreWs = truthy(json.ignore_ws ?? json.ignoreWhitespace);
    } else {
      a = url.searchParams.get('a');
      b = url.searchParams.get('b');
      if (url.searchParams.get('context') !== null) context = +url.searchParams.get('context');
      ignoreWs = truthy(url.searchParams.get('ignore_ws'));
    }

    if (a === undefined || b === undefined || a === null || b === null) {
      throw new Error("Missing 'a' and 'b' parameters. GET /api?a=old%20text&b=new%20text or POST {\"a\":...,\"b\":...}");
    }
    a = String(a); b = String(b);
    if (a.length > MAX_CHARS || b.length > MAX_CHARS) {
      throw new Error(`Input too large: ${Math.max(a.length, b.length)} chars (max ${MAX_CHARS} per side). Use ${FULL_TOOL} instead — it runs entirely in your browser.`);
    }
    context = Math.max(0, Math.min(10, context | 0));

    const A = splitLines(a), B = splitLines(b);
    if (A.lines.length > MAX_LINES || B.lines.length > MAX_LINES) {
      throw new Error(`Input too large: ${Math.max(A.lines.length, B.lines.length)} lines (max ${MAX_LINES} per side). Use ${FULL_TOOL} instead.`);
    }

    const ops = diffLines(A.lines, B.lines, ignoreWs);
    const added = ops.filter(([t]) => t === '+').length;
    const removed = ops.filter(([t]) => t === '-').length;
    const unchanged = ops.filter(([t]) => t === '=').length;
    const hunks = buildHunks(ops, A.lines, B.lines, context);
    const trailingMismatch = A.trailingNewline !== B.trailingNewline;

    return new Response(JSON.stringify({
      identical: added === 0 && removed === 0,
      trailing_newline_mismatch: trailingMismatch,
      summary: {
        lines_a: A.lines.length,
        lines_b: B.lines.length,
        added, removed, unchanged,
        change_ratio: A.lines.length + B.lines.length === 0 ? 0
          : +((added + removed) / (A.lines.length + B.lines.length)).toFixed(4),
      },
      hunks_count: hunks.length,
      hunks,
      unified_diff: unifiedDiff(hunks),
      options: { context, ignore_ws: ignoreWs },
      privacy: 'Zero tracking, zero data collection',
      full_tool: FULL_TOOL,
    }, null, 2), { headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
    }, null, 2), { status: error.status || 400, headers: JSON_HEADERS });
  }
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diff Checker Online — Compare Two Texts &amp; Code — Free &amp; Private API</title>
<meta name="description" content="Free diff checker API: compare two texts or code snippets line by line. Myers diff algorithm, unified-diff hunks, ignore-whitespace option. Zero tracking, runs on the edge.">
<link rel="canonical" href="${HOST}/">
<link rel="alternate" type="application/json" href="${HOST}/api">
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
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th, td { border: 1px solid #8884; padding: .35rem .6rem; text-align: left; }
</style>
</head>
<body>
<header>
  <h1>Diff Checker — Free &amp; Private Text Comparison API</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>

<div class="badges">
  <span class="badge">🔓 Free</span>
  <span class="badge">🔒 Zero tracking</span>
  <span class="badge">🚫 No data collection</span>
  <span class="badge">⚡ Edge-fast</span>
</div>

<h2>Usage</h2>
<pre><code># GET — quick line diff:
curl "https://diff-checker-formatho.filesformatho.workers.dev/api?a=hello%20world&amp;b=hello%20there"

# POST — recommended for larger inputs (JSON body):
curl -X POST https://diff-checker-formatho.filesformatho.workers.dev/api \\
  -H 'Content-Type: application/json' \\
  -d '{"a":"line 1\\nline 2\\nline 3","b":"line 1\\nchanged\\nline 3","context":3}'

# Ignore whitespace-only changes:
curl ".../api?a=code%201%20%20&amp;b=code%201&amp;ignore_ws=1"</code></pre>

<h2>Parameters</h2>
<table>
<tr><th>Param</th><th>Default</th><th>Description</th></tr>
<tr><td><code>a</code></td><td><em>required</em></td><td>Original text (aliases on POST: <code>original</code>, <code>text1</code>, <code>left</code>).</td></tr>
<tr><td><code>b</code></td><td><em>required</em></td><td>Modified text (aliases on POST: <code>modified</code>, <code>text2</code>, <code>right</code>).</td></tr>
<tr><td><code>context</code></td><td><code>3</code></td><td>Unchanged context lines around each hunk (0–10).</td></tr>
<tr><td><code>ignore_ws</code></td><td><code>false</code></td><td>Compare lines with whitespace collapsed/trimmed (changes still shown with original text).</td></tr>
</table>

<h2>What you get</h2>
<p>One call returns a JSON diff built with the <strong>Myers algorithm</strong> (the same approach Git uses): per-line <strong>add / remove / context ops</strong> grouped into <strong>unified-diff hunks</strong> with line numbers, a ready-to-print <code>unified_diff</code> string, and a summary (<code>added</code>, <code>removed</code>, <code>unchanged</code>, <code>change_ratio</code>). <code>identical</code> is true when the texts match line-for-line.</p>

<p>Live response: <a href="https://diff-checker-formatho.filesformatho.workers.dev/api?a=hello%20world&amp;b=hello%20there">/api endpoint</a>.</p>

<div class="privacy">
  <strong>Privacy-first:</strong> inputs are diffed in-memory on Cloudflare's edge and discarded with the response. No logs, no analytics, no cookies, no data collection. Inputs never touch a disk.
</div>

<h2>What it handles</h2>
<p>CRLF and LF line endings, empty inputs, files without trailing newlines (reported as <code>trailing_newline_mismatch</code>), large edits, and whole-file rewrites up to ${'`'}800 changed lines${'`'} per diff. Limits per request: 300,000 chars and 4,000 lines per side (Cloudflare free-plan CPU/memory) — bigger diffs belong in the browser tool below.</p>

<h2>Full browser tool</h2>
<p>Prefer a side-by-side UI with syntax highlighting and unlimited size? Use the complete client-side version — your files never leave your machine: <a href="https://formatho.com/tools/diff">Diff Checker on formatho.com</a>.</p>

<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>

<footer>© formatho.com · <a href="https://diff-checker-formatho.filesformatho.workers.dev/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${HOST}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${HOST}/api</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/sitemap.xml') {
      return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/api' || url.pathname === '/api/') {
      return api(request);
    }
    if (url.pathname === '/') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Privacy-Policy': 'Zero tracking, zero data collection' } });
    }
    return new Response('Not found. See <a href="/">the tool page</a> or <a href="/api">/api</a>.', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
