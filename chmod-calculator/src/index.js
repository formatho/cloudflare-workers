// Privacy-First chmod Calculator API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection',
};
const HOST = 'https://chmod-calculator-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/chmod-calculator';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>chmod Calculator Online (755, rwxr-xr-x) — Free &amp; Private</title>
<meta name="description" content="Convert chmod octal to symbolic (755 ⇄ rwxr-xr-x) and back, with setuid/setgid/sticky bits, per-owner permission breakdown and plain-English explanation — free, zero tracking. Full tool on formatho.com.">
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
  <h1>chmod Calculator Online — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl "${HOST}/api?chmod=755"          # octal → symbolic + explanation
curl "${HOST}/api?chmod=rwxr-xr-x"    # symbolic → octal
curl "${HOST}/api?chmod=4755"         # 4-digit with setuid</code></pre>
<p>Converts both directions (auto-detected): octal (3 or 4 digits) ⇄ symbolic (<code>rwxr-xr-x</code>, or <code>rwsr-xr-t</code> with special bits). Returns the <code>chmod</code> command, per-owner (user/group/other) permission table, special-bit flags, and a plain-English explanation.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> values are computed in-memory at the edge and never logged or stored.</div>
<h2>Full browser tool</h2>
<p>Interactive checkboxes version: <a href="${FULL_TOOL}">chmod Calculator on formatho.com</a>.</p>
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

const WHO = [
  { key: 'owner', label: 'owner (user)', shift: 6 },
  { key: 'group', label: 'group', shift: 3 },
  { key: 'others', label: 'others', shift: 0 },
];
const PERM_NAMES = { read: 'read', write: 'write (modify/delete)', execute: 'execute (or enter directory)' };

function tripletFromBits(bits) {
  return (bits & 4 ? 'r' : '-') + (bits & 2 ? 'w' : '-') + (bits & 1 ? 'x' : '-');
}
function explainBits(bits) {
  const parts = [];
  if (bits & 4) parts.push('read');
  if (bits & 2) parts.push('write');
  if (bits & 1) parts.push('execute');
  return parts.length ? parts.join(', ') : 'no permissions';
}
function bitsFromTriplet(trip, errLabel) {
  if (!/^[rwxst-]{3}$/.test(trip)) {
    throw new Error(`Invalid symbolic characters in ${errLabel}: expected only r, w, x, s, t or -`);
  }
  return (trip[0] === 'r' ? 4 : 0) | (trip[1] === 'w' ? 2 : 0) | (trip[2] === 'x' ? 1 : 0);
}
function isOctal(s) {
  return /^[0-7]+$/.test(s);
}

function compute(inputRaw) {
  const input = inputRaw.trim().replace(/^["']|["']$/g, '');
  let specialBits = 0;
  let owner, group, others;
  let kind;

  if (isOctal(input)) {
    if (input.length === 3) {
      kind = 'octal (3-digit)';
      [owner, group, others] = input.split('').map(Number);
    } else if (input.length === 4) {
      kind = 'octal (4-digit, includes special bits)';
      specialBits = Number(input[0]);
      [owner, group, others] = input.slice(1).split('').map(Number);
    } else {
      throw new Error('Octal mode must be 3 or 4 digits (e.g. 755 or 4755)');
    }
  } else {
    let sym = input;
    kind = 'symbolic';
    if (/^[rwxstST-]{10}$/.test(sym) || /^[a-zA-Z-][rwxstST-]{9}$/.test(sym)) {
      sym = sym.slice(1); // ls-style 10-char form: drop the leading file-type character
    }
    if (!/^[rwxsStT-]{9}$/.test(sym)) {
      throw new Error('Unrecognized mode format — use octal like 755/4755 or symbolic like rwxr-xr-x');
    }
    for (let idx = 0; idx < 9; idx++) {
      if ('sStT'.includes(sym[idx]) && idx !== 2 && idx !== 5 && idx !== 8) {
        throw new Error('s/t/S/T are only valid in the execute (x) position of their triplet');
      }
    }
    const trip = [sym.slice(0, 3), sym.slice(3, 6), sym.slice(6, 9)];
    if ('sS'.includes(trip[0][2])) specialBits |= 4;
    if ('sS'.includes(trip[1][2])) specialBits |= 2;
    if ('tT'.includes(trip[2][2])) specialBits |= 1;
    const norm = [
      trip[0].replace('s', 'x').replace('S', '-'),
      trip[1].replace('s', 'x').replace('S', '-'),
      trip[2].replace('t', 'x').replace('T', '-'),
    ];
    owner = bitsFromTriplet(norm[0], 'owner triplet');
    group = bitsFromTriplet(norm[1], 'group triplet');
    others = bitsFromTriplet(norm[2], 'others triplet');
  }

  const octal3 = `${owner}${group}${others}`;
  const octal4 = `${specialBits}${owner}${group}${others}`;

  // canonical symbolic with embedded special chars
  let s0 = tripletFromBits(owner);
  let s1 = tripletFromBits(group);
  let s2 = tripletFromBits(others);
  if (specialBits & 4) s0 = s0.slice(0, 2) + (owner & 1 ? 's' : 'S');
  if (specialBits & 2) s1 = s1.slice(0, 2) + (group & 1 ? 's' : 'S');
  if (specialBits & 1) s2 = s2.slice(0, 2) + (others & 1 ? 't' : 'T');
  const symbolic = s0 + s1 + s2;

  // ugo assignment form
  const ugo = [
    { who: 'u', t: s0 },
    { who: 'g', t: s1 },
    { who: 'o', t: s2 },
  ]
    .map(({ who, t }) => {
      const perms = [t[0] === 'r' ? 'r' : '', t[1] === 'w' ? 'w' : '', (t[2] === 'x' || t[2] === 's' || t[2] === 't') ? 'x' : ''].join('');
      return `${who}=${perms || ''}`;
    })
    .join(',');

  const perms = {
    owner: { octal: owner, symbolic: s0, read: !!(owner & 4), write: !!(owner & 2), execute: !!(owner & 1), explanation: explainBits(owner) },
    group: { octal: group, symbolic: s1, read: !!(group & 4), write: !!(group & 2), execute: !!(group & 1), explanation: explainBits(group) },
    others: { octal: others, symbolic: s2, read: !!(others & 4), write: !!(others & 2), execute: !!(others & 1), explanation: explainBits(others) },
  };
  const special = {
    setuid: { enabled: !!(specialBits & 4), note: 'runs the file as its owner' },
    setgid: { enabled: !!(specialBits & 2), note: 'runs as the file\u2019s group; new files in a dir inherit the dir\u2019s group' },
    sticky: { enabled: !!(specialBits & 1), note: 'only the file owner can delete/rename files in a directory (e.g. /tmp)' },
  };

  const common = {
    777: 'everyone can do everything — avoid on shared systems',
    755: 'typical for directories and executable programs you share',
    700: 'private directory/program only you can access',
    644: 'typical for shared read-only files (source code, configs)',
    600: 'private file only you can read/write (SSH keys, credentials)',
    666: 'world-writable file — avoid',
    444: 'read-only for everyone',
    400: 'read-only, private',
  };

  return {
    input,
    input_format: kind,
    octal: octal3,
    octal_4digit: octal4,
    symbolic,
    symbolic_ugo: ugo,
    command: `chmod ${octal4 === '0' + octal3 ? octal3 : octal4} <file>`,
    permissions: perms,
    special_bits: special,
    explanation: WHO.map((w) => `${w.label}: ${perms[w.key].explanation}`).join('; '),
    common_use: common[octal3] || null,
    warning: octal3 === '777' || octal3 === '666' ? 'World-writable mode — usually a security risk' : null,
    decoded_by: 'Formatho edge API — zero tracking',
    full_tool: FULL_TOOL,
  };
}

function handleApi(url) {
  const value = url.searchParams.get('chmod') || url.searchParams.get('mode') || url.searchParams.get('value');
  if (!value) {
    return Response.json(
      {
        error: 'Missing required parameter: chmod (e.g. 755, 4755, rwxr-xr-x, rwsr-xr-t)',
      },
      { status: 400, headers: JSON_HEADERS }
    );
  }
  try {
    return Response.json(compute(value), { headers: JSON_HEADERS });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400, headers: JSON_HEADERS });
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api' && ![...url.searchParams.keys()].length) {
      return Response.json({
        usage: 'GET /api?chmod=<value>  — value: octal (755, 4755) or symbolic (rwxr-xr-x, rwsr-xr-t)',
        params: { chmod: 'required — octal 3/4 digits or 9/10-char symbolic string (aliases: mode, value)' },
        example: `curl "${HOST}/api?chmod=755"`,
      }, { headers: JSON_HEADERS });
    }
    if (url.pathname === '/api') return handleApi(url);
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
