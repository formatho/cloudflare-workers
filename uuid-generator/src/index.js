// Privacy-First UUID Generator API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/uuid-generator';

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const count = Math.min(Math.max(parseInt(url.searchParams.get('count') || '1', 10) || 1, 1), 100);

      const uuids = [];
      for (let i = 0; i < count; i++) uuids.push(crypto.randomUUID());

      return new Response(JSON.stringify({
        uuids, count, version: 4,
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
