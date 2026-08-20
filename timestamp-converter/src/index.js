// Privacy-First Timestamp Converter API — formatho.com
// No tracking, no data collection, no external API calls.
// Accepts unix seconds or milliseconds; also converts ISO dates via ?iso=

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const FULL_TOOL = 'https://formatho.com/timestamp-converter';

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const iso = url.searchParams.get('iso');
      let ts = url.searchParams.get('timestamp');
      const format = url.searchParams.get('format') || 'iso';

      let date;
      if (iso) {
        date = new Date(iso);
      } else if (ts) {
        ts = ts.replace(/\s/g, '');
        let n = Number(ts);
        if (!Number.isFinite(n)) throw new Error('Invalid timestamp');
        // heuristic: seconds vs milliseconds
        if (Math.abs(n) < 1e12) n *= 1000;
        date = new Date(n);
      } else {
        // no input: return current time (useful "now" endpoint)
        date = new Date();
      }

      if (isNaN(date.getTime())) throw new Error('Invalid timestamp or ISO date');

      let result;
      switch (format) {
        case 'iso': result = date.toISOString(); break;
        case 'utc': result = date.toUTCString(); break;
        case 'date': result = date.toISOString().slice(0, 10); break;
        case 'time': result = date.toISOString().slice(11, 19) + 'Z'; break;
        case 'readable': result = date.toUTCString(); break;
        default: result = date.toISOString();
      }

      return new Response(JSON.stringify({
        unix_seconds: Math.floor(date.getTime() / 1000),
        unix_milliseconds: date.getTime(),
        iso: date.toISOString(),
        format, result,
        privacy: 'Zero tracking, zero data collection',
        full_tool: FULL_TOOL,
      }, null, 2), {
        headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=60' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        usage: '?timestamp=1692508800 or ?iso=2023-08-20T00:00:00Z&format=iso',
        formats: ['iso', 'utc', 'date', 'time', 'readable'],
        privacy: 'Zero tracking, zero data collection',
        full_tool: FULL_TOOL,
      }, null, 2), { status: 400, headers: JSON_HEADERS });
    }
  },
};
