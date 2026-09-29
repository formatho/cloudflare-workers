#!/usr/bin/env node
// add-jsonld.js — inject schema.org JSON-LD into every worker landing page.
// Tool workers: WebApplication schema (name/url/description harvested from
// existing <title>, meta description, canonical). tools-index: ItemList of
// all fleet tools harvested from its TOOLS array.
// Usage: node scripts/add-jsonld.js [--apply]   (default: dry-run)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['edge-cache', 'embed', 'geo-files', 'og-image', 'scripts', 'tests']);
const APPLY = process.argv.includes('--apply');

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

const lastMatch = (s, re) => {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const all = [...s.matchAll(g)].filter((m) => !/`|\$\{/.test(m[1]));
  return all.length ? all[all.length - 1][1] : null;
};

const ldScript = (obj) => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;

const org = { '@type': 'Organization', name: 'Formatho', url: 'https://formatho.com' };

function toolJsonLd(src) {
  const title = decodeEntities(lastMatch(src, /<title>([^<]*)<\/title>/));
  const desc = decodeEntities(lastMatch(src, /<meta name="description" content="([^"]*)"/));
  let url;
  {
    const all = [...src.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
    if (!all.length) throw new Error('no canonical link found');
    url = [...all].reverse().find((u) => !/`|\$\{/.test(u)) || all[all.length - 1];
  }
  // newer workers build the canonical as `${HOST}/` from a file-level constant
  if (url && url.includes('${HOST}')) {
    const host = src.match(/const HOST = ['"]([^'"]+)['"]/);
    if (!host) throw new Error('canonical uses ${HOST} but no HOST constant found');
    url = url.replaceAll('${HOST}', host[1]);
  }
  if (!title || !desc || !url) throw new Error('missing title/desc/canonical');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    url,
    description: desc,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: ['Free edge API', 'Zero tracking', 'No data collection', 'No signup required'],
    publisher: org,
  };
}

function indexJsonLd(src) {
  const items = [...src.matchAll(/\['([^']+)',\s*'([^']+)',\s*'(https:\/\/[^']+workers\.dev\/?)',\s*'(https:\/\/formatho\.com\/tools\/[a-z0-9-]+)'\]/g)]
    .map((m) => ({ name: m[1], url: m[3].replace(/\/$/, '') }));
  if (items.length < 30) throw new Error(`only ${items.length} tools harvested`);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Formatho Tools — Free Privacy-First Developer APIs',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, url: it.url,
    })),
  };
}

let changed = 0, skipped = 0, failed = 0;
for (const d of fs.readdirSync(ROOT).sort()) {
  const f = path.join(ROOT, d, 'src', 'index.js');
  if (!fs.existsSync(f) || SKIP.has(d)) continue;
  let src = fs.readFileSync(f, 'utf8');
  if (src.includes('application/ld+json')) { skipped++; console.log(`= ${d}: already has JSON-LD`); continue; }
  const heads = (src.match(/<\/head>/g) || []).length;
  if (heads !== 1) { failed++; console.log(`! ${d}: ${heads} </head> occurrences, skipping`); continue; }
  try {
    const ld = ldScript(d === 'tools-index' ? indexJsonLd(src) : toolJsonLd(src));
    const marker = '</head>';
    const at = src.indexOf(marker);
    // sanity: JSON-LD must not contain backticks or ${ (it sits in a JS template literal)
    if (/`|\$\{/.test(ld)) throw new Error('JSON-LD contains template-literal syntax');
    const out = src.slice(0, at) + ld + '\n' + src.slice(at);
    console.log(`${APPLY ? 'W' : 'D'} ${d}: injected ${ld.length}B${d === 'tools-index' ? ' (ItemList)' : ''}`);
    if (APPLY) fs.writeFileSync(f, out);
    changed++;
  } catch (e) {
    failed++;
    console.log(`! ${d}: ${e.message}`);
  }
}
console.log(`\n${changed} injected, ${skipped} already-had, ${failed} failed${APPLY ? '' : ' (DRY RUN — pass --apply to write)'}`);
if (failed) process.exit(1);
