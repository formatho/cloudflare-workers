// Privacy-First Hash Generator API — formatho.com
// No tracking, no data collection, no external API calls.
// Supports MD5 (pure JS) + SHA-1/SHA-256/SHA-512 (Web Crypto).

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/hash-generator';
const ALGORITHMS = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296));
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const X_ORDER = [];
for (let i = 0; i < 16; i++) X_ORDER.push(i);
for (let i = 0; i < 16; i++) X_ORDER.push((1 + 5 * i) % 16);
for (let i = 0; i < 16; i++) X_ORDER.push((5 + 3 * i) % 16);
for (let i = 0; i < 16; i++) X_ORDER.push((7 * i) % 16);
const ROUND_FN = [
  (b, c, d) => (b & c) | (~b & d),
  (b, c, d) => (b & d) | (c & ~d),
  (b, c, d) => b ^ c ^ d,
  (b, c, d) => c ^ (b | ~d),
];
const rotl = (x, s) => (x << s) | (x >>> (32 - s));

function md5(str) {
  const bytes = new TextEncoder().encode(str);
  const nblk = ((bytes.length + 8) >> 6) + 1;
  const M = new Uint32Array(nblk * 16);
  for (let i = 0; i < bytes.length; i++) M[i >> 2] |= bytes[i] << ((i % 4) * 8);
  M[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
  M[nblk * 16 - 2] = bytes.length * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let off = 0; off < nblk * 16; off += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    for (let i = 0; i < 64; i++) {
      const f = (ROUND_FN[i >> 4](b, c, d) + a + K[i] + M[off + X_ORDER[i]]) | 0;
      a = d;
      const nb = (b + rotl(f, S[i])) | 0;
      d = c; c = b; b = nb;
    }
    a = (a + oa) | 0; b = (b + ob) | 0; c = (c + oc) | 0; d = (d + od) | 0;
  }
  // MD5 serializes each 32-bit register little-endian
  const hex = n => {
    const u = n < 0 ? n + 4294967296 : n;
    return [0, 8, 16, 24].map(sh => ((u >>> sh) & 0xff).toString(16).padStart(2, '0')).join('');
  };
  return hex(a) + hex(b) + hex(c) + hex(d);
}

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const text = url.searchParams.get('text');
      const algorithmRaw = (url.searchParams.get('algorithm') || 'SHA-256').toUpperCase().replace('_', '-');
      const algorithm = ALGORITHMS.find(a => a === algorithmRaw) ||
        ALGORITHMS.find(a => a.replace('-', '') === algorithmRaw.replace('-', ''));

      if (!text) {
        return new Response(JSON.stringify({
          error: 'Missing text parameter',
          usage: '?text=hello&algorithm=SHA-256',
          algorithms: ALGORITHMS,
          privacy: 'Zero tracking, zero data collection',
          full_tool: FULL_TOOL,
        }, null, 2), { headers: JSON_HEADERS });
      }

      if (!ALGORITHMS.includes(algorithm)) {
        throw new Error('Unsupported algorithm. Use one of: ' + ALGORITHMS.join(', '));
      }

      let hash;
      if (algorithm === 'MD5') {
        hash = md5(text);
      } else {
        const data = new TextEncoder().encode(text);
        const buf = await crypto.subtle.digest(algorithm, data);
        hash = Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
      }

      return new Response(JSON.stringify({
        hash, input: text, algorithm, length: hash.length,
        privacy: 'Zero tracking, zero data collection',
        full_tool: FULL_TOOL,
      }, null, 2), {
        headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=3600' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
      }, null, 2), { status: 400, headers: JSON_HEADERS });
    }
  },
};
