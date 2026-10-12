// Local tests for security-headers worker (run: node workers/tests/security-headers.test.mjs)
import worker, { auditHeaders, genSnippets, parseTarget, isPrivateHost } from '../security-headers/src/index.js';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
}
async function callApi(qs, body) {
  const url = 'https://security-headers-formatho.filesformatho.workers.dev/api' + (qs || '');
  const req = new Request(url, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' });
  return worker.fetch(req);
}

const t = async () => {
  console.log('security-headers worker tests');

  // --- SSRG / parseTarget guards (pure, no network) ---
  ok(isPrivateHost('localhost') && isPrivateHost('192.168.1.5') && isPrivateHost('10.0.0.1') && isPrivateHost('172.16.4.4') && isPrivateHost('[::1]') && isPrivateHost('app.internal'), 'private/loopback hosts detected');
  ok(!isPrivateHost('example.com') && !isPrivateHost('1.1.1.1'), 'public hosts allowed');
  ok(parseTarget('example.com').toString() === 'https://example.com/', 'bare domain defaults to https');
  let threw = false; try { parseTarget('ftp://x') } catch (e) { threw = true; } ok(threw, 'non-http scheme rejected');

  // --- auditHeaders scoring ---
  let a = auditHeaders({
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'content-security-policy': "default-src 'self'; script-src 'self' https://cdn.formatho.com",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
    'cross-origin-resource-policy': 'same-origin',
  }, true);
  ok(a.score === 100 && a.grade === 'A+', 'all headers present → 100 A+');

  a = auditHeaders({}, true);
  ok(a.score === 0 && a.grade === 'F' && a.checks.every((c) => c.status === 'fail'), 'nothing present → 0 F');

  a = auditHeaders({ 'content-security-policy': "script-src 'unsafe-inline' 'unsafe-eval'", 'strict-transport-security': 'max-age=1000' }, true);
  ok(a.grade === 'F' || a.grade === 'D', 'weak CSP + short HSTS scores low');
  ok(a.checks.find((c) => c.id === 'csp').status === 'warn' && /unsafe-inline/.test(a.checks.find((c) => c.id === 'csp').detail), 'unsafe-inline flagged warn');
  ok(a.checks.find((c) => c.id === 'hsts').status === 'warn' && /180-day/.test(a.checks.find((c) => c.id === 'hsts').detail), 'short max-age flagged warn');

  a = auditHeaders({ 'content-security-policy': 'frame-ancestors none' }, true);
  ok(a.checks.find((c) => c.id === 'xfo').status === 'pass', 'CSP frame-ancestors earns xfo credit');

  a = auditHeaders({}, false);
  ok(a.checks.find((c) => c.id === 'hsts').status === 'warn', 'HSTS warn (not fail) over plain HTTP');

  // --- snippets ---
  const s = genSnippets('example.com', {}, true);
  ok(s.nginx.includes('add_header Strict-Transport-Security') && s.nginx.includes('Content-Security-Policy') && s.apache.includes('<IfModule mod_headers.c>') && s.express.includes("res.setHeader('Referrer-Policy'"), 'snippets for all missing headers (nginx/apache/express)');
  const s2 = genSnippets('example.com', { 'strict-transport-security': 'max-age=31536000' }, true);
  ok(!s2.nginx.includes('Strict-Transport-Security') && s2.nginx.includes('X-Content-Type-Options'), 'present headers omitted from snippets');

  // --- API validation paths (no network) ---
  let r = await callApi('');
  let j = await r.json();
  ok(r.status === 400 && /url is required/.test(j.error), 'missing url → 400');
  r = await callApi('?url=ftp://example.com');
  ok(r.status === 400, 'ftp url → 400');
  r = await callApi('?url=http://192.168.0.1/admin');
  j = await r.json();
  ok(r.status === 400 && /private/.test(j.error), 'private IP → 400');

  // --- live scan of our own site (network) ---
  r = await callApi('?url=formatho.com');
  if (r.status === 200) {
    j = await r.json();
    ok(j.https === true && typeof j.score === 'number' && /^[ABCDEF][+]?$/.test(j.grade) && Array.isArray(j.checks) && j.checks.length === 7, 'live scan formatho.com returns graded checks');
    ok(j.url === 'https://formatho.com/' && j.final_url.startsWith('https://'), 'target + final url normalized');
  } else {
    j = await r.json();
    ok(false, 'live scan formatho.com → ' + r.status + ' ' + (j.error || ''));
  }

  // --- surfaces ---
  const land = await worker.fetch(new Request('https://security-headers-formatho.filesformatho.workers.dev/'));
  const landTxt = await land.text();
  ok(land.status === 200 && land.headers.get('Content-Type').includes('text/html') && landTxt.includes('ld+json') && landTxt.includes('security headers tool on formatho.com'), 'landing 200 html+ld+json+backlink');
  const sm = await worker.fetch(new Request('https://security-headers-formatho.filesformatho.workers.dev/sitemap.xml'));
  ok(sm.status === 200 && (await sm.text()).includes('<urlset'), 'sitemap.xml');
  const ll = await worker.fetch(new Request('https://security-headers-formatho.filesformatho.workers.dev/llms.txt'));
  ok(ll.status === 200 && (await ll.text()).startsWith('# Security Headers Checker'), 'llms.txt');
  const opt = await worker.fetch(new Request('https://security-headers-formatho.filesformatho.workers.dev/api', { method: 'OPTIONS' }));
  ok(opt.status === 204 && opt.headers.get('Access-Control-Allow-Origin') === '*', 'OPTIONS preflight 204');
  const nf = await worker.fetch(new Request('https://security-headers-formatho.filesformatho.workers.dev/nope'));
  ok(nf.status === 404, 'unknown path 404');

  console.log(`security-headers: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};
t();
