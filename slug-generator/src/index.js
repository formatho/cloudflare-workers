// Privacy-First Slug Generator API — formatho.com
// No tracking, no data collection, no external API calls.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/slug-generator';

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const text = url.searchParams.get('text');
      const separator = (url.searchParams.get('separator') || '-').slice(0, 1);

      if (!text) {
        return new Response(JSON.stringify({
          error: 'Missing text parameter',
          usage: '?text=Hello World!',
          privacy: 'Zero tracking, zero data collection',
          full_tool: FULL_TOOL,
        }, null, 2), { headers: JSON_HEADERS });
      }

      const slug = text
        .toLowerCase()
        .trim()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, separator)
        .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), '');

      return new Response(JSON.stringify({
        slug, input: text,
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
