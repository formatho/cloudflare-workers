#!/usr/bin/env node
// add-cta-cro.js — inject an above-the-fold conversion CTA into every worker
// landing page: a styled button linking the full formatho.com browser tool,
// placed directly under the hero (</header> or <h1> fallback) with the privacy
// value prop as a sub-line. Additive + idempotent (skips files already carrying
// class="cta"). tools-index links the formatho.com root instead of a tool page.
// Usage: node scripts/add-cta-cro.js [--apply]   (default: dry-run)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['edge-cache', 'embed', 'geo-files', 'og-image', 'api-gateway', 'scripts', 'tests']);
const APPLY = process.argv.includes('--apply');

const CTA_CSS = '.cta{display:inline-block;margin:.25rem 0 .35rem;padding:.65rem 1.1rem;border-radius:8px;background:#0a7d3c;color:#fff !important;font-weight:600;text-decoration:none}.cta:hover{background:#086b33}.cta-sub{color:#888;font-size:.85rem;margin:0 0 1.5rem}';

function toolUrl(dir, src) {
  if (dir === 'tools-index') return 'https://formatho.com/';
  const full = src.match(/(?:const|let)\s+FULL_TOOL\s*=\s*['"]([^'"]+)['"]/);
  if (full) return full[1];
  const near = src.match(/Full browser tool[\s\S]{0,600}?(https:\/\/formatho\.com\/tools\/[a-z0-9-]+)/);
  if (near) return near[1];
  const any = src.match(/https:\/\/formatho\.com\/tools\/[a-z0-9-]+/);
  return any ? any[0] : null;
}

function insertCta(dir, src) {
  const url = toolUrl(dir, src);
  if (!url) throw new Error('no formatho.com tool URL found');
  const block = '\n<a class="cta" href="' + url + '">Open the full browser tool &#8594;</a>\n<p class="cta-sub">Free, no signup, runs entirely in your browser &#8212; your data never leaves your device.</p>\n';
  let out;
  const hdr = src.indexOf('</header>');
  if (hdr !== -1) {
    const at = hdr + '</header>'.length;
    out = src.slice(0, at) + '\n' + block + src.slice(at);
  } else {
    const m = src.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
    if (!m) throw new Error('no </header> and no <h1> anchor');
    const h1End = src.indexOf(m[0]) + m[0].length;
    out = src.slice(0, h1End) + '\n' + block + src.slice(h1End);
  }
  const st = out.lastIndexOf('</style>');
  if (st === -1) throw new Error('no </style> anchor');
  out = out.slice(0, st) + CTA_CSS + out.slice(st);
  if (!out.includes('class="cta"') || !out.includes('.cta{')) throw new Error('post-insert sanity failed');
  return out;
}

const results = { patched: [], skipped: [], failed: [] };
for (const ent of fs.readdirSync(ROOT, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
  if (!ent.isDirectory() || SKIP.has(ent.name)) continue;
  const f = path.join(ROOT, ent.name, 'src', 'index.js');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  if (src.includes('class="cta"')) { results.skipped.push(ent.name); continue; }
  try {
    const out = insertCta(ent.name, src);
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
