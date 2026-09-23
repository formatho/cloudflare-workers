/**
 * Formatho dynamic OG image worker — /og?title=...&tag=...&cat=...
 * 1200x630 branded card: manual SVG + resvg-wasm (no satori).
 * Privacy: no logging.
 */
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import resvgWasm from './resvg.wasm';

let wasmInit = false;
let fontCache = null;
const FONT_URL = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff';

const CATEGORY_COLORS = {
  web3: '#7c3aed', security: '#0891b2', data: '#059669', dev: '#ea580c', calc: '#d97706', net: '#2563eb',
};

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgCard(title, tag, cat) {
  const color = CATEGORY_COLORS[cat] || '#2563eb';
  const t = esc(title || 'Formatho').slice(0, 80);
  const g = esc(tag || 'Runs 100% in your browser').slice(0, 60);
  const size = t.length > 45 ? 56 : 68;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0a0a0f"/>
  <path d="M1200 0 L1200 630 L720 630 Z" fill="${color}26"/>
  <circle cx="66" cy="74" r="9" fill="${color}"/>
  <text x="90" y="83" font-family="Inter" font-size="26" fill="#a1a1aa">Formatho · ${esc(cat || 'tools')}</text>
  <text x="66" y="330" font-family="Inter" font-size="${size}" font-weight="700" fill="#ffffff">${t}</text>
  <text x="66" y="400" font-family="Inter" font-size="30" fill="${color}">⚡ ${g}</text>
  <text x="66" y="566" font-family="Inter" font-size="24" fill="#52525b">formatho.com — 120+ free privacy-first developer tools</text>
</svg>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/og')) return new Response('not found', { status: 404 });
    const { searchParams } = url;
    try {
      if (!wasmInit) {
        await initWasm(resvgWasm);
        wasmInit = true;
      }
      if (!fontCache) fontCache = new Uint8Array(await (await fetch(FONT_URL)).arrayBuffer());
      const svg = svgCard(searchParams.get('title'), searchParams.get('tag'), searchParams.get('cat'));
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: 1200 },
        font: {
          fontFiles: [fontCache],
          loadSystemFonts: false,
          defaultFontFamily: 'Inter',
          defaultFontSize: 48,
          serifFamily: 'Inter',
          sansSerifFamily: 'Inter',
        },
      });
      const png = resvg.render().asPng();
      return new Response(png, {
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=86400, s-maxage=2592000',
          'x-privacy-policy': 'Zero tracking, zero data collection',
        },
      });
    } catch (e) {
      return new Response('render error: ' + e.message, { status: 500 });
    }
  },
};
