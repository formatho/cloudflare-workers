#!/usr/bin/env node
// add-options-preflight.js — add CORS preflight (OPTIONS) handling to every fleet worker
// that already advertises CORS on its API responses (38 tools + tools-index).
//
// Why: every worker sends `Access-Control-Allow-Origin: *` on /api responses, but no worker
// answers `OPTIONS` preflights — a browser `fetch(url, {method:'POST', headers:{'Content-Type':
// 'application/json'}})` is rejected by the browser because the preflight response lacks
// Access-Control-Allow-Methods / Access-Control-Allow-Headers. GET works (simple request);
// advertised POST APIs do not. This makes "CORS-enabled" (landing pages + llms.txt) fully true.
//
// Idempotent: skips files already containing `request.method === 'OPTIONS'`.
// Scope guard: only touches src/index.js files containing 'Access-Control-Allow-Origin'
// (skips infra workers edge-cache/embed/geo-files/og-image which serve no public JSON API).
// Dry-run by default; apply with --write.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const APPLY = process.argv.includes('--write');

const PREFLIGHT = `    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
`;

// insertion point: first `const url = new URL(request.url);` that appears after `async fetch(request)`
const FETCH_URL_RE = /((async fetch\(request\) \{\s*\n\s*const url = new URL\(request\.url\);)\s*\n)/;

let patched = 0, skippedDone = 0, skippedScope = 0, failed = 0;

for (const dir of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const src = path.join(ROOT, dir.name, 'src', 'index.js');
  if (!fs.existsSync(src)) continue;
  const original = fs.readFileSync(src, 'utf8');

  if (original.includes("request.method === 'OPTIONS'")) { skippedDone++; continue; }
  if (!original.includes('Access-Control-Allow-Origin')) { skippedScope++; continue; }

  const m = original.match(FETCH_URL_RE);
  if (!m || m.index === undefined) { console.error(`FAIL: no fetch/url insertion point in ${dir.name}`); failed++; continue; }

  const updated = original.slice(0, m.index + m[1].length) + PREFLIGHT + original.slice(m.index + m[1].length);
  if (APPLY) fs.writeFileSync(src, updated);
  patched++;
  console.log(`${APPLY ? 'patched' : 'would patch'}: ${dir.name}`);
}

console.log(`\n${patched} ${APPLY ? 'patched' : 'to patch'}, ${skippedDone} already done, ${skippedScope} out of scope (no CORS), ${failed} failed`);
if (!APPLY) console.log('dry-run only — re-run with --write');
process.exit(failed > 0 ? 2 : 0);
