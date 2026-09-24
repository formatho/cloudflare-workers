// Privacy-First IPv4 Subnet Calculator API — formatho.com
// CIDR / dotted-mask subnet math: network, broadcast, host range, counts, class & privacy flags.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://subnet-calculator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/ipv4-subnet-calculator';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>IPv4 Subnet Calculator Online (CIDR) — Free &amp; Private</title>
<meta name="description" content="Calculate IPv4 subnets from CIDR notation: network, broadcast, netmask, wildcard, first/last usable host, host count, class &amp; private-range flags. Free, privacy-first API.">
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
  <h1>IPv4 Subnet Calculator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?cidr=192.168.1.10/24"</code></pre>
<pre><code># dotted mask also works
curl "${HOST}/api?ip=10.0.5.7&amp;mask=255.255.255.0"</code></pre>
<p>Returns network, broadcast, netmask, wildcard, first/last usable host, usable &amp; total host counts, host bits, address class and private/reserved-range flags.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> addresses are computed in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Calculate subnets entirely client-side: <a href="${FULL_TOOL}">IPv4 Subnet Calculator on formatho.com</a>.</p>
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

function parseIPv4(str) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(str.trim());
  if (!m) throw new Error(`"${str}" is not a valid IPv4 address`);
  const octets = m.slice(1).map(Number);
  for (const o of octets) if (o > 255) throw new Error(`"${str}" is not a valid IPv4 address (octet > 255)`);
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function toDotted(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function toBinary(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map(o => o.toString(2).padStart(8, '0')).join('.');
}

function classify(ip) {
  const first = ip >>> 24;
  if (first === 0) return 'reserved (0.0.0.0/8)';
  if (first === 10) return 'private (10.0.0.0/8)';
  if (first === 127) return 'loopback (127.0.0.0/8)';
  if (first === 169 && ((ip >>> 16) & 255) === 254) return 'link-local (169.254.0.0/16)';
  if (first === 172 && ((ip >>> 16) & 255) >= 16 && ((ip >>> 16) & 255) <= 31) return 'private (172.16.0.0/12)';
  if (first === 192 && ((ip >>> 16) & 255) === 168) return 'private (192.168.0.0/16)';
  if (first >= 224 && first <= 239) return 'multicast (224.0.0.0/4)';
  if (first >= 240) return 'reserved (240.0.0.0/4)';
  if (first < 128) return 'public class A';
  if (first < 192) return 'public class B';
  if (first < 224) return 'public class C';
  return 'public';
}

function handleApi(request) {
  const url = new URL(request.url);
  const cidr = url.searchParams.get('cidr');
  const ipParam = url.searchParams.get('ip');
  const maskParam = url.searchParams.get('mask');

  let ip, prefix;
  try {
    if (cidr) {
      const parts = cidr.trim().split('/');
      if (parts.length !== 2) throw new Error('cidr must look like 192.168.1.10/24');
      ip = parseIPv4(parts[0]);
      prefix = parseInt(parts[1], 10);
    } else if (ipParam) {
      ip = parseIPv4(ipParam);
      if (maskParam) {
        if (/^\d{1,2}$/.test(maskParam.trim())) {
          prefix = parseInt(maskParam, 10); // prefix length
        } else {
          const mask = parseIPv4(maskParam); // dotted mask → prefix
          const ones = mask.toString(2).replace(/0+$/, '').length;
          if ((mask | 0) >>> 0 !== Math.pow(2, 32) - Math.pow(2, 32 - ones)) throw new Error('mask is not a contiguous subnet mask');
          prefix = ones;
        }
      } else {
        prefix = 32;
      }
    } else {
      return Response.json({ error: 'Missing parameter: cidr=192.168.1.10/24 (or ip=…&mask=…)' }, { status: 400, headers: JSON_HEADERS });
    }
    if (!(prefix >= 0 && prefix <= 32)) throw new Error('prefix length must be 0-32');
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS });
  }

  const hostBits = 32 - prefix;
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << hostBits) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, hostBits);
  const usable = prefix >= 31 ? total : total - 2;

  return Response.json({
    input: cidr || `${toDotted(ip)}/${prefix}`,
    ip_address: toDotted(ip),
    prefix_length: prefix,
    cidr_notation: `${toDotted(network)}/${prefix}`,
    netmask: toDotted(mask),
    wildcard_mask: toDotted(~mask >>> 0),
    network_address: toDotted(network),
    broadcast_address: toDotted(broadcast),
    first_usable_host: prefix >= 31 ? toDotted(network) : toDotted(network + 1),
    last_usable_host: prefix >= 31 ? toDotted(broadcast) : toDotted(broadcast - 1),
    total_addresses: total,
    usable_hosts: usable,
    host_bits: hostBits,
    ip_class: classify(ip),
    is_private_or_reserved: /private|reserved|loopback|link-local|multicast/.test(classify(ip)),
    binary_netmask: toBinary(mask),
    binary_network: toBinary(network),
    calculated_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  }, { headers: JSON_HEADERS });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname === '/api/') return handleApi(request);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found. See <a href="/">the tool page</a> or <a href="/api">/api</a>.', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
};
