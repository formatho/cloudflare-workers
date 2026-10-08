// Privacy-First Password Strength Analyser API — formatho.com

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'X-Privacy-Policy': 'Zero tracking, zero data collection. Prefer POST for real passwords; GET URLs can appear in logs',
};
const HOST = 'https://password-strength-formatho.filesformatho.workers.dev';
const FULL_TOOL = 'https://formatho.com/tools/password-strength-analyser';

const COMMON = new Set(('password 123456 123456789 12345678 12345 qwerty 1234567 111111 1234567890 123123 abc123 1234 password1 iloveyou 000000 qwerty123 1q2w3e aa12345678 password123 654321 555555 123321 qwertyuiop dragon 123qwe 1234qwer 666666 google 1qaz2wsx 7777777 myspace1 121212 2000 123abc zaq12wsx login trustno1 welcome letmein admin welcome1 p@ssword passw0rd monkey sunshine princess football charlie shadow michael jennifer jordan superman harley hunter ranger buster soccer batman test starwars summer winter spring autumn master hello freedom whatever qazwsx trustme baseball ginger pepper summer1 winter1 soccer1 hockey1 killer george andrew jordan23 matthew joshua daniel anthony jessica ashley nicole danielle hunter2 hello123 welcome123 admin123 root toor pass pass123 test123 guest user letmein1 money love secret internet computer apple samsung asdfgh zxcvbnm asdf1234 1q2w3e4r qwe123 112233 102030 147258369 159753 987654321 123654 789456 11111111 88888888 abcdef qwerty1 changeme default system microsoft windows linux oracle 123123123 qweasdzxc 1q2w3e4r5t asdfghjkl zxcvbnm1 5201314 11223344 a123456 12341234 1qaz2wsx3edc p@ssw0rd qwertyuiop[] 123qweasd sauron herman bank snoop420? no').split(/\s+/).filter(w => w.length > 0));

const LEET = { '4': 'a', '@': 'a', '8': 'b', '(': 'c', '3': 'e', '6': 'g', '1': 'l', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't', '2': 'z' };
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Password Strength Checker API — Free &amp; Private</title>
<meta name="description" content="Check password strength via API: entropy bits, crack-time estimates for 5 attack scenarios, pattern detection and improvement tips. Privacy-first edge API, zero tracking.">
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
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Password Strength Checker API — Free & Private",
  "url": "https://password-strength-formatho.filesformatho.workers.dev/",
  "description": "Check password strength via API: entropy bits, crack-time estimates for 5 attack scenarios, pattern detection and improvement tips. Privacy-first edge API, zero tracking.",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "featureList": ["Free edge API", "Zero tracking", "No data collection", "No signup required"],
  "publisher": { "@type": "Organization", "name": "Formatho", "url": "https://formatho.com" }
}
</script>
</head>
<body>
<header>
  <h1>Password Strength Checker — Free &amp; Private</h1>
  <p class="tagline">A free edge API by <a href="https://formatho.com">formatho.com</a>, privacy-first developer tools.</p>
</header>
<div class="badges">
  <span class="badge">🔓 Free</span><span class="badge">🔒 Zero tracking</span><span class="badge">🚫 No data collection</span><span class="badge">⚡ Edge-fast</span>
</div>
<h2>Usage</h2>
<pre><code>curl -X POST ${HOST}/api -H 'Content-Type: application/json' \\
  -d '{"password":"MyS3cur3P@ss!"}'</code></pre>
<p>Returns entropy bits (charset model + effective after pattern penalties), a 0–6 score, six compliance checks (12+ chars, upper, lower, digits, symbols, not-common), crack-time estimates for five attack scenarios, detected patterns, and concrete improvement suggestions.</p>
<p class="tagline">Prefer POST for real passwords — GET query strings can land in server logs. Analysis runs in-memory at the edge; nothing is logged or stored.</p>
<p>Full parameter reference: <a href="${HOST}/api">/api endpoint</a>.</p>
<div class="privacy"><strong>Privacy-first:</strong> the analysed password never leaves memory — no logs, no storage, no telemetry.</div>
<h2>Full browser tool</h2>
<p>Analyse with a full UI: <a href="${FULL_TOOL}">Password Strength Analyser on formatho.com</a>. Need strong passwords? <a href="https://password-generator-formatho.filesformatho.workers.dev/">Generate one</a>.</p>
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

const LLMS_TXT = "# Password Strength Checker API — Free & Private\n\n> Check password strength: entropy bits, crack-time estimates for 5 attack scenarios, pattern detection and improvement tips. Full tool on formatho.com. Runs on Cloudflare's edge: zero tracking, zero data collection, nothing logged. No signup, no cookies.\n\n- [Use this tool]: https://password-strength-formatho.filesformatho.workers.dev/\n- [JSON API]: https://password-strength-formatho.filesformatho.workers.dev/api — GET and POST, CORS-enabled\n- [Full browser tool on formatho.com]: https://formatho.com/tools/password-strength-analyser\n- [All 53 Formatho edge tools]: https://formatho-tools.filesformatho.workers.dev/\n- [Formatho main site]: https://formatho.com/ — 100+ free client-side developer tools\n";

function err400(msg) {
  return Response.json({ error: msg }, { status: 400, headers: JSON_HEADERS });
}

function unleet(s) {
  return s.toLowerCase().split('').map(c => LEET[c] ?? c).join('');
}

function hasSequentialRun(lower, minRun = 4) {
  for (let i = 0; i + minRun <= lower.length; i++) {
    let asc = true, desc = true;
    for (let j = i + 1; j < i + minRun; j++) {
      const d = lower.charCodeAt(j) - lower.charCodeAt(j - 1);
      if (d !== 1) asc = false;
      if (d !== -1) desc = false;
    }
    if (asc || desc) return { match: lower.slice(i, i + minRun), dir: asc ? 'ascending' : 'descending' };
  }
  return null;
}

function hasKeyboardRun(lower, minRun = 4) {
  for (const row of KEYBOARD_ROWS) {
    const rev = row.split('').reverse().join('');
    for (let i = 0; i + minRun <= row.length; i++) {
      const seg = row.slice(i, i + minRun);
      if (lower.includes(seg)) return { match: seg, dir: 'forward' };
      const segR = rev.slice(i, i + minRun);
      if (lower.includes(segR)) return { match: segR, dir: 'reverse' };
    }
  }
  return null;
}

function hasRepeatedBlock(lower) {
  const n = lower.length;
  // whole string is a pure repetition, e.g. "abcabcabc" or "passw0rdpassw0rd"
  for (let unit = 1; unit <= Math.floor(n / 2); unit++) {
    if (n % unit !== 0) continue;
    const u = lower.slice(0, unit);
    if (u.repeat(n / unit) === lower && n / unit >= 2) {
      return { unit: u, repeats: n / unit };
    }
  }
  // dominant prefix repetition, e.g. "abcabcabc!" — block ×3+ covering ≥60% of the string
  for (let unit = 2; unit <= Math.floor(n / 2); unit++) {
    const u = lower.slice(0, unit);
    let reps = 1;
    while (lower.slice(unit * reps, unit * (reps + 1)) === u) reps++;
    if (reps >= 3 && unit * reps >= n * 0.6) return { unit: u, repeats: reps };
  }
  return null;
}

function hasRepeatedChar(lower, minRun = 3) {
  const m = lower.match(/(.)\1{2,}/);
  return m ? { char: m[0][0], run: m[0].length } : null;
}

function commonSubstr(lower) {
  for (const w of COMMON) {
    if (w.length >= 6 && lower.includes(w)) return w;
  }
  return null;
}

function formatDuration(seconds) {
  if (seconds < 1e-3) return 'instantly';
  if (seconds < 1) return '< 1 second';
  const units = [
    ['minute', 60], ['hour', 3600], ['day', 86400], ['month', 2.628e6], ['year', 3.156e7],
  ];
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  for (let i = 0; i < units.length; i++) {
    const [name, size] = units[i];
    const next = i + 1 < units.length ? units[i + 1][1] : null;
    if (seconds < (next ?? Infinity)) {
      const v = seconds / size;
      return `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${name}${v >= 2 ? 's' : ''}`;
    }
  }
  const years = seconds / 3.156e7;
  const tiers = [['trillion', 1e12], ['billion', 1e9], ['million', 1e6], ['thousand', 1e3]];
  for (const [name, size] of tiers) {
    if (years >= size) {
      const v = years / size;
      return v > 1e3 ? `> ${name} of years (≈ 10^${Math.round(Math.log10(years))} years)` : `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${name} years`;
    }
  }
  return `${Math.round(years)} years`;
}

const SCENARIOS = [
  ['online_throttled', 100 / 3600, '100 guesses/hour (throttled login, OWASP)'],
  ['online_unthrottled', 10, '10 guesses/second (unthrottled API)'],
  ['offline_slow_hash', 1e4, '10,000 guesses/second (bcrypt/argon2 rig)'],
  ['offline_fast_hash', 1e11, '100 billion guesses/second (SHA-256 GPU rig)'],
  ['offline_massive_farm', 1e14, '100 trillion guesses/second (state-grade farm)'],
];

function analyse(password) {
  const lower = password.toLowerCase();
  const charsets = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digits: /\d/.test(password),
    symbols: /[^a-zA-Z0-9]/.test(password),
    spaces: /\s/.test(password) || undefined,
  };
  let pool = 0;
  if (charsets.lowercase) pool += 26;
  if (charsets.uppercase) pool += 26;
  if (charsets.digits) pool += 10;
  if (charsets.symbols) pool += 33;
  const entropyBits = password.length * Math.log2(Math.max(pool, 2));

  const patterns = [];
  let effective = entropyBits;
  const isCommon = COMMON.has(lower);
  const leetNorm = unleet(password);
  const isCommonLeet = !isCommon && COMMON.has(leetNorm);

  if (isCommon) { patterns.push('common password (top leaked-passwords list)'); effective = 8; }
  else if (isCommonLeet) { patterns.push(`common password with leet substitutions ("${leetNorm}")`); effective = Math.min(effective, 12); }
  else {
    const sub = commonSubstr(lower) ?? commonSubstr(leetNorm);
    if (sub && sub.length >= 6) { patterns.push(`contains common password "${sub}"`); effective -= 20; }
    const rep = hasRepeatedBlock(lower);
    if (rep) { patterns.push(`repeated block "${rep.unit}" × ${rep.repeats}`); effective = Math.min(effective, rep.unit.length * Math.log2(Math.max(pool, 2)) + Math.log2(rep.repeats)); }
    const repChar = hasRepeatedChar(lower);
    if (repChar) { patterns.push(`repeated character "${repChar.char}" × ${repChar.run}`); effective -= 6 * (repChar.run - 2); }
    const seq = hasSequentialRun(lower);
    if (seq) { patterns.push(`alphabetical sequence "${seq.match}" (${seq.dir})`); effective -= 8; }
    const kb = hasKeyboardRun(lower);
    if (kb) { patterns.push(`keyboard-row sequence "${kb.match}" (${kb.dir})`); effective -= 8; }
    if (/^(19|20)\d{2}$/.test(password)) { patterns.push('looks like a birth year'); effective = Math.min(effective, 10); }
    else if (/(19|20)\d{2}/.test(password)) { patterns.push('contains a plausible year (19xx/20xx)'); effective -= 4; }
  }
  effective = Math.max(Math.min(effective, entropyBits), 6);

  const score = effective < 10 ? 0 : effective < 20 ? 1 : effective < 30 ? 2 : effective < 40 ? 3 : effective < 60 ? 4 : effective < 80 ? 5 : 6;
  const strength = score <= 1 ? 'Very Weak' : score <= 3 ? 'Weak' : score === 4 ? 'Moderate' : score === 5 ? 'Strong' : 'Very Strong';

  const guesses = Math.pow(2, effective - 1);
  const crack_times = {};
  for (const [name, rate, desc] of SCENARIOS) crack_times[name] = { seconds: guesses / rate, human: formatDuration(guesses / rate), attacker: desc };

  const checks = [
    { name: '12+ characters', pass: password.length >= 12 },
    { name: 'Uppercase', pass: charsets.uppercase },
    { name: 'Lowercase', pass: charsets.lowercase },
    { name: 'Numbers', pass: charsets.digits },
    { name: 'Symbols', pass: charsets.symbols },
    { name: 'Not common', pass: !isCommon && !isCommonLeet },
  ];

  const suggestions = [];
  if (password.length < 12) suggestions.push('Use at least 12 characters — length beats complexity');
  if (!charsets.uppercase || !charsets.lowercase) suggestions.push('Mix upper and lower case');
  if (!charsets.digits) suggestions.push('Add digits');
  if (!charsets.symbols) suggestions.push('Add symbols (!@#$…)');
  if (patterns.some(p => p.startsWith('common'))) suggestions.push('This password (or its base) is in leaked-password lists — never reuse it');
  if (patterns.length && !patterns.some(p => p.startsWith('common'))) suggestions.push(`Remove predictable patterns: ${patterns.join('; ')}`);
  if (!suggestions.length) suggestions.push('Strong password — store it in a password manager and never reuse it across sites');

  return {
    length: password.length,
    unique_chars: new Set(password).size,
    charsets,
    pool_size: pool,
    entropy_bits: Math.round(entropyBits * 10) / 10,
    effective_bits: Math.round(effective * 10) / 10,
    entropy_model: 'charset entropy (length × log2(pool)), then penalties for commonality, repeats, sequences, keyboard runs and years',
    score,
    strength,
    checks,
    checks_passed: checks.filter(c => c.pass).length,
    patterns_detected: patterns,
    crack_times,
    suggestions,
    scale: { '< 40 bits': 'weak', '40-60': 'moderate', '60-80': 'strong', '80+': 'very strong (site FAQ scale)' },
  };
}

async function handleApi(request) {
  let raw;
  if (request.method === 'POST') {
    raw = await request.json().catch(() => ({ __bad: true }));
    if (raw === null || raw === undefined || raw.__bad) return err400('POST body must be JSON, e.g. {"password": "MyS3cur3P@ss!"}');
  } else {
    const url = new URL(request.url);
    raw = {};
    for (const [k, v] of url.searchParams.entries()) raw[k.toLowerCase()] = v;
  }
  const password = raw.password ?? raw.pw ?? raw.value;
  if (typeof password !== 'string' || password.length === 0) return err400('Parameter "password" is required. Prefer POST over GET for real passwords — query strings can appear in logs.');
  if (password.length > 512) return err400('Password exceeds the 512-character analysis limit.');

  return Response.json({ ...analyse(password), privacy: 'Analysed in-memory at the edge; never logged or stored', full_tool: FULL_TOOL, generated_by: 'Formatho edge API — zero tracking' }, { headers: JSON_HEADERS });
}

const API_HELP = {
  description: 'Password strength analysis: entropy (charset + effective after pattern penalties), 0-6 score, 6 compliance checks, crack-time estimates for 5 attack scenarios, patterns and suggestions.',
  example_post: `curl -X POST ${HOST}/api -H 'Content-Type: application/json' -d '{"password":"MyS3cur3P@ss!"}'`,
  example_get: `${HOST}/api?password=Tr0ub4dor%263`,
  params: { password: 'required — the password to analyse (max 512 chars). Prefer POST for real passwords.' },
  crack_scenarios: Object.fromEntries(SCENARIOS.map(([k, r, d]) => [k, d])),
  full_tool: FULL_TOOL,
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    } });
    if (url.pathname === '/api') {
      if (request.method !== 'GET' && request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }), { status: 405, headers: { ...JSON_HEADERS, Allow: 'GET, POST, OPTIONS' } });
      if (url.searchParams.toString() === '' && request.method === 'GET') return Response.json(API_HELP, { headers: JSON_HEADERS });
      return handleApi(request);
    }
    if (url.pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
    if (url.pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml' } });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('Not found', { status: 404 });
  },
};
