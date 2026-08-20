// Privacy-First SHA-256 Generator API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/sha256-generator';

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const text = url.searchParams.get('text');

      if (!text) {
        return new Response(JSON.stringify({
          error: 'Missing text parameter',
          usage: '?text=hello',
          privacy: 'Zero tracking, zero data collection',
          full_tool: FULL_TOOL,
        }, null, 2), { headers: JSON_HEADERS });
      }

      const data = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');

      return new Response(JSON.stringify({
        hash, input: text, algorithm: 'SHA-256', length: hash.length,
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
