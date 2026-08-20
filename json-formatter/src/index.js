// Privacy-First JSON Formatter API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const jsonData = url.searchParams.get('json');
      const indent = Math.min(parseInt(url.searchParams.get('indent') || '2', 10) || 2, 10);

      if (!jsonData) {
        return new Response(JSON.stringify({
          error: 'Missing JSON data',
          usage: '?json={"key":"value"}&indent=2',
          privacy: 'Zero tracking, zero data collection',
          full_tool: 'https://formatho.com/json-formatter',
        }, null, 2), { headers: JSON_HEADERS });
      }

      const parsed = JSON.parse(jsonData);
      const formatted = JSON.stringify(parsed, null, indent);

      return new Response(formatted, {
        headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=3600' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        privacy: 'Zero tracking, zero data collection',
        full_tool: 'https://formatho.com/json-formatter',
      }, null, 2), { status: 400, headers: JSON_HEADERS });
    }
  },
};
