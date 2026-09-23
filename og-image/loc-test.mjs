import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { readFileSync } from 'fs';
await initWasm(readFileSync('./src/resvg.wasm'));
console.log('wasm ok');
const r = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>');
console.log('render ok', r.render().asPng().length);
