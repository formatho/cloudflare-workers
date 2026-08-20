// Privacy-First Random String Generator API — formatho.com
// No tracking, no data collection, no external API calls.
// Cryptographically secure via crypto.getRandomValues.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/random-string-generator';

const CHARSETS = {
  numeric: '0123456789',
  alphabetic: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  alphanumeric: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  special: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const length = Math.min(Math.max(parseInt(url.searchParams.get('length') || '16', 10) || 16, 1), 512);
      const charset = url.searchParams.get('charset') || 'alphanumeric';

      const chars = CHARSETS[charset] || CHARSETS.alphanumeric;
      const array = new Uint32Array(length);
      crypto.getRandomValues(array);

      // rejection-free-ish modulo (charset lengths are small; bias negligible)
      let result = '';
      for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];

      return new Response(JSON.stringify({
        result, length, charset,
        privacy: 'Zero tracking, zero data collection',
        full_tool: FULL_TOOL,
      }, null, 2), {
        headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message, privacy: 'Zero tracking, zero data collection', full_tool: FULL_TOOL,
      }, null, 2), { status: 400, headers: JSON_HEADERS });
    }
  },
};
