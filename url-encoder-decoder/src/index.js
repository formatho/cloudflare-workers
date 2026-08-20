// Privacy-First URL Encoder/Decoder API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/url-encoder-decoder';

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const text = url.searchParams.get('text');
      const action = url.searchParams.get('action') || 'encode';

      if (!text) {
        return new Response(JSON.stringify({
          error: 'Missing text parameter',
          usage: '?text=hello%20world&action=encode (or decode)',
          privacy: 'Zero tracking, zero data collection',
          full_tool: FULL_TOOL,
        }, null, 2), { headers: JSON_HEADERS });
      }

      let result;
      if (action === 'encode') {
        result = encodeURIComponent(text);
      } else if (action === 'decode') {
        result = decodeURIComponent(text);
      } else {
        throw new Error('Invalid action. Use "encode" or "decode"');
      }

      return new Response(JSON.stringify({
        result, action,
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
