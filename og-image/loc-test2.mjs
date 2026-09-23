import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { readFileSync } from 'fs';
const font = await (await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff')).arrayBuffer();
const el = { type: 'div', props: { style: { width: 1200, height: 630, display: 'flex', backgroundColor: '#0a0a0f', color: '#fff', fontFamily: 'Inter' }, children: [{ type: 'div', props: { style: { display: 'flex', fontSize: 76 }, children: 'JSON Validator' } }] } };
try {
  const svg = await satori(el, { width: 1200, height: 630, fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }] });
  console.log('satori ok', svg.length);
  await initWasm(readFileSync('./src/resvg.wasm'));
  const png = new Resvg(svg).render().asPng();
  console.log('png ok', png.length);
} catch (e) { console.log('ERR', e.message, e.stack?.split('\n')[1]); }
