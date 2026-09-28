// Privacy-First HTTP Status Code Lookup API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://http-status-codes-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/http-status-codes';

const CODES = {
  100: ['Continue', 'Client should continue with the request body (used with Expect: 100-continue).'],
  101: ['Switching Protocols', 'Server agrees to switch protocols, e.g. to WebSocket via the Upgrade header.'],
  102: ['Processing', 'Server has received the request but no response is available yet (WebDAV, RFC 2518).'],
  103: ['Early Hints', 'Preload hints sent before the final response so the browser can start fetching resources.'],
  200: ['OK', 'The request succeeded; the meaning depends on the method (resource returned, updated, deleted).'],
  201: ['Created', 'Request succeeded and a new resource was created; set Location to its URL.'],
  202: ['Accepted', 'Request accepted for processing but not completed yet; often used for async jobs.'],
  203: ['Non-Authoritative Information', 'OK, but the response comes from a local copy or transformation, not the origin.'],
  204: ['No Content', 'Request succeeded with no response body; common for DELETE or PUT.'],
  205: ['Reset Content', 'Like 204 but the client should reset the form or view that sent the request.'],
  206: ['Partial Content', 'Range request succeeded; used by video seeking and resumable downloads.'],
  207: ['Multi-Status', 'Multiple status codes for independent operations (WebDAV, RFC 4918).'],
  208: ['Already Reported', 'Members of a DAV binding were already listed in an earlier response.'],
  226: ['IM Used', 'Instance manipulation (delta encoding) was applied to the response.'],
  300: ['Multiple Choices', 'More than one representation exists; the client must choose one.'],
  301: ['Moved Permanently', 'Resource has a new permanent URL; set Location. Browsers and search engines cache this.'],
  302: ['Found', 'Temporary redirect to another URL; method is not guaranteed to be preserved.'],
  303: ['See Other', 'Redirect to a different URI with GET; used after a POST to show a result page.'],
  304: ['Not Modified', 'Cached version is still fresh (conditional If-None-Match / If-Modified-Since). Saves bandwidth.'],
  305: ['Use Proxy', 'Historic; must be accessed through the given proxy. Deprecated.'],
  307: ['Temporary Redirect', 'Like 302 but the request method and body must not change.'],
  308: ['Permanent Redirect', 'Like 301 but the request method and body must not change.'],
  400: ['Bad Request', 'Malformed syntax or invalid parameters; the client must fix the request.'],
  401: ['Unauthorized', 'Authentication is required and missing/invalid; send WWW-Authenticate. Actually means "unauthenticated".'],
  402: ['Payment Required', 'Reserved for future use; sometimes used for paywalled APIs.'],
  403: ['Forbidden', 'Server understood the request but refuses to authorize it, even with valid credentials.'],
  404: ['Not Found', 'The origin server cannot find the requested resource; the most famous error on the web.'],
  405: ['Method Not Allowed', 'The method is known but not supported by the resource; return Allow header.'],
  406: ['Not Acceptable', 'No representation matches the Accept headers sent by the client.'],
  407: ['Proxy Authentication Required', 'The client must authenticate with the proxy before the request proceeds.'],
  408: ['Request Timeout', 'Client took too long to send the request; server gave up waiting.'],
  409: ['Conflict', 'Request conflicts with current resource state, e.g. editing a stale resource or duplicate create.'],
  410: ['Gone', 'The resource was permanently removed with no forwarding address; stronger than 404.'],
  411: ['Length Required', 'Content-Length must be provided for the request to be accepted.'],
  412: ['Precondition Failed', 'An If-Match / If-Unmodified-Since precondition evaluated to false.'],
  413: ['Content Too Large', 'Request body exceeds limits the server is willing to process (payload too large).'],
  414: ['URI Too Long', 'The request URI is longer than the server will interpret.'],
  415: ['Unsupported Media Type', 'The Content-Type/encoding of the request is not supported by the target.'],
  416: ['Range Not Satisfiable', 'Requested byte range is outside the resource size; return Content-Range of full size.'],
  417: ['Expectation Failed', 'The Expect header requirement cannot be met by the server.'],
  418: ["I'm a teapot", 'RFC 2324 joke status: the (coffee) pot refuses to brew tea. Widely implemented as an Easter egg.'],
  421: ['Misdirected Request', 'Request was routed to a server unable to produce a response (TLS SNI mismatch).'],
  422: ['Unprocessable Content', 'Syntax is valid but semantic validation failed (WebDAV; common in REST APIs for bad fields).'],
  423: ['Locked', 'The resource is locked against modification (WebDAV).'],
  424: ['Failed Dependency', 'The request depended on another request that failed (WebDAV).'],
  425: ['Too Early', 'Server unwilling to process a possibly replayed request (RFC 8470).'],
  426: ['Upgrade Required', 'Client must switch to a different protocol, e.g. TLS; send Upgrade header.'],
  428: ['Precondition Required', 'Server requires conditional requests (If-Match) to avoid lost updates.'],
  429: ['Too Many Requests', 'Rate limit exceeded; send Retry-After. The classic API throttle status.'],
  431: ['Request Header Fields Too Large', 'Header fields are too large; the client should reduce them.'],
  451: ['Unavailable For Legal Reasons', 'Resource blocked for legal reasons such as censorship or takedown; send Link to explanation.'],
  500: ['Internal Server Error', 'The server hit an unexpected condition; check server logs — a catch-all bug indicator.'],
  501: ['Not Implemented', 'Server does not support the method or functionality needed to fulfill the request.'],
  502: ['Bad Gateway', 'A proxy/gateway got an invalid response from the upstream server. Classic "edge can reach origin, origin is broken".'],
  503: ['Service Unavailable', 'Server is temporarily overloaded or down for maintenance; send Retry-After.'],
  504: ['Gateway Timeout', 'A proxy/gateway did not get a response from the upstream server in time.'],
  505: ['HTTP Version Not Supported', 'The HTTP version used in the request is not supported.'],
  506: ['Variant Also Negotiates', 'Transparent content negotiation misconfiguration (circular variant).'],
  507: ['Insufficient Storage', 'Server cannot store the representation needed to complete the request (WebDAV).'],
  508: ['Loop Detected', 'Infinite loop detected while processing (WebDAV depth).'],
  510: ['Not Extended', 'Further extensions are required but not declared.'],
  511: ['Network Authentication Required', 'Captive portal: the client must authenticate to gain network access.'],
};

const CLASSES = {
  1: 'Informational (1xx)',
  2: 'Successful (2xx)',
  3: 'Redirection (3xx)',
  4: 'Client Error (4xx)',
  5: 'Server Error (5xx)',
};

function specRef(code) {
  if ([100, 101, 200, 201, 202, 203, 204, 205, 206, 300, 301, 302, 303, 304, 305, 307, 308, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 421, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505].includes(code)) return 'RFC 9110 (HTTP Semantics)';
  if ([102, 207, 208, 226, 422, 423, 424, 506, 507, 508, 510].includes(code)) return 'RFC 4918 / RFC 5842 (WebDAV)';
  if (code === 103) return 'RFC 8297 (Early Hints)';
  if (code === 425) return 'RFC 8470 (Using Early Data)';
  if (code === 418) return 'RFC 2324 (Hyper Text Coffee Pot Control Protocol)';
  return 'Unassigned / non-standard code';
}

function entry(code) {
  const known = CODES[code];
  return {
    code,
    reason_phrase: known ? known[0] : null,
    category: CLASSES[Math.floor(code / 100)],
    description: known ? known[1] : `Unassigned status code in the ${CLASSES[Math.floor(code / 100)]} class — valid syntax, no standard meaning.`,
    spec: specRef(code),
    registered: Boolean(known),
  };
}

function handleApi(request) {
  const url = new URL(request.url);
  const codeParam = url.searchParams.get('code');
  const classParam = url.searchParams.get('class');
  const all = url.searchParams.get('all');
  if (all === 'true' || all === '1') {
    return Response.json({
      count: Object.keys(CODES).length,
      codes: Object.keys(CODES).map(Number).map(entry),
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    }, { headers: JSON_HEADERS });
  }
  if (classParam) {
    const m = /^([1-5])xx$/i.exec(classParam.trim());
    if (!m) return Response.json({ error: 'Invalid class. Use one of: 1xx, 2xx, 3xx, 4xx, 5xx (or ?code=NNN, ?all=true)' }, { status: 400, headers: JSON_HEADERS });
    const cls = Number(m[1]);
    return Response.json({
      class: CLASSES[cls],
      count: Object.keys(CODES).filter((c) => Math.floor(c / 100) === cls).length,
      codes: Object.keys(CODES).map(Number).filter((c) => Math.floor(c / 100) === cls).map(entry),
      decoded_by: 'Formatho edge API — zero tracking',
      full_tool: FULL_TOOL,
    }, { headers: JSON_HEADERS });
  }
  if (!codeParam) {
    return Response.json({ error: 'Missing required parameter: code (e.g. ?code=404). Also supported: ?class=4xx, ?all=true' }, { status: 400, headers: JSON_HEADERS });
  }
  const code = Number(codeParam);
  if (!Number.isInteger(code) || !/^\d{1,3}$/.test(codeParam.trim()) || code < 100 || code > 599) {
    return Response.json({ error: 'Invalid code. Must be an integer between 100 and 599.' }, { status: 400, headers: JSON_HEADERS });
  }
  return Response.json({ ...entry(code), decoded_by: 'Formatho edge API — zero tracking', full_tool: FULL_TOOL }, { headers: JSON_HEADERS });
}

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HTTP Status Codes Lookup (Meanings &amp; Fixes) — Free &amp; Private API</title>
<meta name="description" content="Look up any HTTP status code 100–599: reason phrase, category, meaning and spec reference. Free JSON API with zero tracking. Full reference tool on formatho.com.">
<link rel="canonical" href="${HOST}/">
<style>
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem 3rem; line-height: 1.6; }
header { border-bottom: 1px solid #8884; margin-bottom: 1.5rem; padding-bottom: 1rem; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.tagline { color: #888; margin: 0; }
.badges { display: flex; gap: .5rem; flex-wrap: wrap; margin: 1rem 0; }
.badge { background: #8882; border-radius: 999px; padding: .15rem .7rem; font-size: .8rem; }
pre { background: #8882; padding: .8rem 1rem; border-radius: 8px; overflow-x: auto; font-size: .85rem; }
a { color: #06c; }
.privacy { background: #0a51; border: 1px solid #0a83; border-radius: 8px; padding: .8rem 1rem; }
footer { margin-top: 2.5rem; border-top: 1px solid #8884; padding-top: 1rem; font-size: .85rem; color: #888; }
</style>
</head>
<body>
<header>
  <h1>HTTP Status Code Lookup — Free &amp; Private API</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?code=404"
curl "${HOST}/api?class=5xx"
curl "${HOST}/api?all=true"</code></pre>
<p>Returns reason phrase, category (1xx–5xx), plain-English description and the RFC that defines each code — all 62 standard codes covered, plus classification of any valid unassigned code (100–599).</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> lookups are answered from an in-memory table at the edge; nothing is logged or stored.</div>
<h2>Full browser tool</h2>
<p>Searchable status-code reference with copy buttons: <a href="${FULL_TOOL}">HTTP Status Codes on formatho.com</a>.</p>
<h2>All Formatho edge APIs</h2>
<p>Browse every free Formatho Worker tool on the <a href="https://formatho-tools.filesformatho.workers.dev/">Formatho Tools index</a>.</p>
<footer>© formatho.com · <a href="${HOST}/sitemap.xml">sitemap.xml</a> · Part of the <a href="https://formatho.com">Formatho</a> privacy-first tool suite.</footer>
</body>
</html>`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${HOST}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>${HOST}/api</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api') return handleApi(request);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
