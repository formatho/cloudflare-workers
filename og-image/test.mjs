import satori from 'satori';
const font = await (await fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-700-normal.woff')).arrayBuffer();
console.log('font bytes', font.byteLength);
