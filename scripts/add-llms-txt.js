#!/usr/bin/env node
// add-llms-txt.js — inject an /llms.txt route into every fleet worker (38 tools + tools-index).
// Idempotent: skips files already containing "pathname === '/llms.txt'".
// Dry-run by default; apply with --write.
// Data source for cross-links: TOOLS array in tools-index/src/index.js.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const APPLY = process.argv.includes('--write');

// 1. Harvest TOOLS array from tools-index source: [name, desc, landing, browser_tool]
const indexSrc = fs.readFileSync(path.join(ROOT, 'tools-index/src/index.js'), 'utf8');
const TOOLS = [];
const tupleRe = /\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'(https:[^']+)'\s*,\s*'(https:[^']+)'\s*\]/g;
let m;
while ((m = tupleRe.exec(indexSrc)) !== null) {
  TOOLS.push({ name: m[1], desc: m[2].replace(/\\'/g, "'"), landing: m[3], browser: m[4] });
}
if (TOOLS.length < 38) {
  console.error(`FATAL: expected >=38 TOOLS entries, parsed ${TOOLS.length} — refusing to touch anything.`);
  process.exit(2);
}
const byHost = new Map(TOOLS.map(t => [new URL(t.landing).host, t]));
console.log(`Parsed ${TOOLS.length} tools from tools-index TOOLS array.`);

const INDEX_LLMS = `# Formatho Edge Tools — ${TOOLS.length} free instant developer tools

> Directory of ${TOOLS.length} privacy-first developer micro-tools, each running on Cloudflare's edge with zero tracking, zero data collection, and nothing logged. Every tool has an HTML page with usage examples plus a JSON API at /api (GET/POST, CORS-enabled). No signup, no cookies, no analytics.

## Tools
${TOOLS.map(t => `- [${t.name}]: ${t.landing} — ${t.desc} Browser version: ${t.browser}`).join('\n')}

## More
- [Formatho main site]: https://formatho.com/ — 100+ free client-side tools
- [All tools directory]: https://formatho.com/tools
`;

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function makeToolLlms(src, wranglerName) {
  const titleM = src.match(/<title>([^<]+)<\/title>/);
  const descM = src.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  if (!titleM || !descM) {
    return { err: `missing title/meta (title:${!!titleM} desc:${!!descM})` };
  }
  const host = `${wranglerName}.filesformatho.workers.dev`;
  const t = byHost.get(host);
  if (!t) return { err: `no TOOLS entry for host ${host}` };
  const title = decode(titleM[1].trim());
  const desc = decode(descM[1].trim());
  const canonical = t.landing;
  const lines = [
    `# ${title}`,
    ``,
    `> ${desc} Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.`,
    ``,
    `- [Use this tool]: ${canonical}`,
    `- [JSON API]: ${canonical.replace(/\/$/, '')}/api — GET and POST, CORS-enabled`,
  ];
  if (t) lines.push(`- [Full browser tool on formatho.com]: ${t.browser}`);
  lines.push(`- [All ${TOOLS.length} Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/`);
  lines.push(`- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools`);
  lines.push('');
  return { body: lines.join('\n') };
}

const ROUTE = `    if (url.pathname === '/llms.txt') {
      return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    }
`;

const dirs = fs.readdirSync(ROOT).filter(d => {
  const f = path.join(ROOT, d, 'src/index.js');
  return fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes("pathname === '/sitemap.xml'");
});

let changed = 0, skipped = 0, failed = 0;
for (const d of dirs) {
  const file = path.join(ROOT, d, 'src/index.js');
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes("pathname === '/llms.txt'")) { skipped++; console.log(`SKIP  ${d} (already has llms.txt)`); continue; }

  let body;
  if (d === 'tools-index') {
    body = INDEX_LLMS;
  } else {
    const toml = fs.readFileSync(path.join(ROOT, d, 'wrangler.toml'), 'utf8');
    const nameM = toml.match(/^name\s*=\s*["']([^"']+)["']/m);
    if (!nameM) { failed++; console.error(`FAIL  ${d}: no name in wrangler.toml`); continue; }
    const r = makeToolLlms(src, nameM[1]);
    if (r.err) { failed++; console.error(`FAIL  ${d}: ${r.err}`); continue; }
    body = r.body;
  }

  // Route: insert before the sitemap branch, matching its indentation.
  const routeNeedle = "if (url.pathname === '/sitemap.xml')";
  const iRoute = src.indexOf(routeNeedle);
  const iConst = src.indexOf('export default {');
  if (iRoute === -1 || iConst === -1) {
    failed++; console.error(`FAIL  ${d}: anchors missing (route:${iRoute} const:${iConst})`); continue;
  }
  const lineStart = src.lastIndexOf('\n', iRoute) + 1;
  const indent = src.slice(lineStart, iRoute);
  const route = `if (url.pathname === '/llms.txt') {\n${indent}  return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });\n${indent}}\n${indent}`;
  src = src.slice(0, lineStart) + route + src.slice(lineStart);

  const iConst2 = src.indexOf('export default {');
  src = src.slice(0, iConst2) + `const LLMS_TXT = ${JSON.stringify(body)};\n\n` + src.slice(iConst2);

  if (APPLY) fs.writeFileSync(file, src);
  changed++;
  console.log(`${APPLY ? 'WROTE' : 'DRY'}  ${d} (${body.length}B)`);
}

console.log(`\nDone: ${changed} ${APPLY ? 'written' : 'would-write'}, ${skipped} skipped, ${failed} failed (of ${dirs.length} dirs).`);
if (failed > 0) process.exit(1);
