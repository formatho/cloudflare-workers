#!/usr/bin/env node
// add-related-links.js — inject a "Related free edge tools" nav into every worker
// landing page: category-aware cross-links to sibling fleet workers (up to 6, filled
// to >=4 from a flagship list), placed directly above <footer> as chip links. This is
// the internal-linking pass for the fleet (crawl/discovery + engagement), additive +
// idempotent (skips files already carrying class="related"). tools-index gets a
// "Popular edge tools" nav instead (it already lists everything).
// Category source of truth: live index API (name/description/category per tool).
// Usage: node scripts/add-related-links.js [--apply]   (default: dry-run)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['edge-cache', 'embed', 'geo-files', 'og-image', 'scripts', 'tests']);
const APPLY = process.argv.includes('--apply');
const MIN_LINKS = 4;
const MAX_LINKS = 6;
const FLAGSHIP = [
  'JSON Formatter',
  'Base64 Encoder/Decoder',
  'UUID Generator',
  'JWT Decoder',
  'Timestamp Converter',
  'Regex Tester',
  'Password Generator',
  'URL Encoder/Decoder',
];

const CSS = '.related{margin-top:2rem}.related h2{font-size:1.05rem;margin:0 0 .4rem}.related ul{display:flex;flex-wrap:wrap;gap:.45rem;list-style:none;padding:0;margin:0}.related a{display:inline-block;padding:.25rem .7rem;border:1px solid #8884;border-radius:999px;font-size:.85rem;text-decoration:none}';

// --- fleet data from the live index API (source of truth) ---
let TOOLS;
try {
  TOOLS = JSON.parse(execSync(
    'curl -s --max-time 20 https://formatho-tools.filesformatho.workers.dev/api',
    { encoding: 'utf8' }
  )).tools;
} catch (e) {
  console.error('FATAL: could not fetch/parse index API: ' + e.message);
  process.exit(1);
}
if (!Array.isArray(TOOLS) || TOOLS.length < 60) {
  console.error('FATAL: index API returned suspicious tool count: ' + (TOOLS && TOOLS.length));
  process.exit(1);
}
const BY_HOST = new Map();
for (const t of TOOLS) {
  try { BY_HOST.set(new URL(t.api).host, t); } catch (_) { /* skip malformed */ }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function hostForDir(dir) {
  const toml = fs.readFileSync(path.join(ROOT, dir, 'wrangler.toml'), 'utf8');
  const m = toml.match(/^name\s*=\s*['"]([^'"]+)['"]/m);
  if (!m) return null;
  return m[1] + '.filesformatho.workers.dev';
}

function relatedFor(dir) {
  if (dir === 'tools-index') {
    return {
      heading: 'Popular edge tools',
      links: FLAGSHIP.slice(0, MAX_LINKS).map((n) => BY_HOST.get(
        // find flagship by name in TOOLS order
        (TOOLS.find((t) => t.name === n) || {}).api ? new URL(TOOLS.find((t) => t.name === n).api).host : ''
      )).filter(Boolean),
    };
  }
  const host = hostForDir(dir);
  const self = host && BY_HOST.get(host);
  if (!self) throw new Error('no index-API entry for host ' + (host || '(wrangler name missing)'));
  const siblings = TOOLS.filter((t) => t.category === self.category && t.name !== self.name);
  const links = siblings.slice(0, MAX_LINKS);
  for (const name of FLAGSHIP) {
    if (links.length >= MIN_LINKS) break;
    const t = TOOLS.find((x) => x.name === name && x.name !== self.name);
    if (t && !links.includes(t)) links.push(t);
  }
  if (links.length < MIN_LINKS) throw new Error('only ' + links.length + ' related links resolvable');
  return { heading: 'Related free edge tools', links: links.slice(0, MAX_LINKS) };
}

function insert(dir, src) {
  const { heading, links } = relatedFor(dir);
  if (!links.length) throw new Error('empty related list');
  const items = links.map((t) =>
    '<li><a href="' + esc(new URL(t.api).origin + '/') + '" title="' + esc(t.description) + '">' + esc(t.name) + '</a></li>'
  );
  const block = '\n<nav class="related" aria-label="Related tools">\n<h2>' + esc(heading) + '</h2>\n<ul>' + items.join('') + '</ul>\n</nav>\n';
  const at = src.indexOf('<footer');
  if (at === -1) throw new Error('no <footer anchor');
  let out = src.slice(0, at) + block + src.slice(at);
  const st = out.lastIndexOf('</style>');
  if (st === -1) throw new Error('no </style> anchor');
  out = out.slice(0, st) + CSS + out.slice(st);
  const marks = out.split('class="related"').length - 1;
  if (marks !== 1 || !out.includes('.related{')) throw new Error('post-insert sanity failed');
  return out;
}

const results = { patched: [], skipped: [], failed: [] };
for (const ent of fs.readdirSync(ROOT, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
  if (!ent.isDirectory() || SKIP.has(ent.name)) continue;
  const f = path.join(ROOT, ent.name, 'src', 'index.js');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  if (!src.includes('class="cta"')) continue; // only CRO-carrying landings
  if (src.includes('class="related"')) { results.skipped.push(ent.name); continue; }
  try {
    const out = insert(ent.name, src);
    if (APPLY) fs.writeFileSync(f, out);
    results.patched.push(ent.name);
  } catch (e) {
    results.failed.push(ent.name + ': ' + e.message);
  }
}
console.log('mode: ' + (APPLY ? 'APPLY' : 'DRY-RUN'));
console.log('patched (' + results.patched.length + '): ' + (results.patched.join(' ') || '-'));
console.log('skipped-already (' + results.skipped.length + '): ' + (results.skipped.join(' ') || '-'));
console.log('FAILED (' + results.failed.length + '):\n  ' + (results.failed.join('\n  ') || '-'));
process.exitCode = results.failed.length ? 1 : 0;
