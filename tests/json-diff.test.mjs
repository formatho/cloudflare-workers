// Local tests for json-diff worker (run: node workers/tests/json-diff.test.mjs)
import worker from '../json-diff/src/index.js';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
}
async function callApi(qs, body, method = 'GET') {
  const url = 'https://json-diff-formatho.filesformatho.workers.dev/api' + (qs || '');
  const req = new Request(url, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method });
  return worker.fetch(req);
}

const t = async () => {
  console.log('json-diff worker tests');
  // 1. equal docs
  let r = await callApi('?a=%7B%22x%22%3A1%7D&b=%7B%22x%22%3A1%7D');
  let j = await r.json();
  ok(r.status === 200 && j.equal === true && j.total_changes === 0, 'identical objects → equal');

  // 2. changed / added / removed / type_changed
  r = await callApi(null, { a: '{"v":1,"drop":true,"n":5}', b: '{"v":2,"n":"5","new":[1,2]}' });
  j = await r.json();
  ok(j.counts.changed === 1 && j.counts.added === 1 && j.counts.removed === 1 && j.counts.type_changed === 1, 'counts across all four op types');
  const byPath = Object.fromEntries(j.diff.map((d) => [d.path, d.op]));
  ok(byPath['/v'] === 'changed' && byPath['/drop'] === 'removed' && byPath['/new'] === 'added' && byPath['/n'] === 'type_changed', 'JSON Pointer paths correct');

  // 3. object key order irrelevant
  r = await callApi(null, { a: '{"a":1,"b":2}', b: '{"b":2,"a":1}' });
  j = await r.json();
  ok(j.equal === true, 'key order does not matter');

  // 4. arrays index-wise
  r = await callApi(null, { a: '[1,2,3]', b: '[1,2,4,5]' });
  j = await r.json();
  ok(j.counts.changed === 1 && j.counts.added === 1 && j.diff.find((d) => d.path === '/3')?.after === 5, 'array changed + tail add');

  // 5. pointer escaping (~ and /)
  r = await callApi(null, { a: '{"a/b~c":1}', b: '{"a/b~c":2}' });
  j = await r.json();
  ok(j.diff[0]?.path === '/a~1b~0c', 'RFC 6901 escaping of / and ~');

  // 6. patch mode verified round-trip (tree + tail changes)
  r = await callApi(null, { a: '{"v":1,"o":{"k":true},"arr":[1,2,3]}', b: '{"v":2,"o":{"k":true,"x":9},"arr":[1,2,3,4]}', patch: true });
  j = await r.json();
  ok(Array.isArray(j.patch) && j.patch_applies_clean === true, 'patch applies clean (tree + tail add)');

  // 7. patch on nested removal
  r = await callApi(null, { a: '{"a":[1,2,3,4,5]}', b: '{"a":[1,3,4,5]}', patch: true });
  j = await r.json();
  ok(j.patch_applies_clean === true, 'patch applies clean (mid-array removal)');

  // 8. patch full replacement
  r = await callApi(null, { a: '[1,2,3]', b: '{"x":1}', patch: true });
  j = await r.json();
  ok(j.patch_applies_clean === true, 'root type change patch verified');

  // 9. bad JSON → 400 with which param
  r = await callApi(null, { a: '{"v":1}', b: '{nope}' });
  j = await r.json();
  ok(r.status === 400 && /b is not valid JSON/.test(j.error), 'invalid b → 400 naming param');

  // 10. missing params → 400
  r = await callApi('?a=%7B%7D');
  j = await r.json();
  ok(r.status === 400 && /a is required|b is required/.test(j.error), 'missing b → 400');

  // 11. 1MB cap
  r = await callApi(null, { a: '"' + 'x'.repeat(1024 * 1024 + 10) + '"', b: '1' });
  j = await r.json();
  ok(r.status === 400 && /1MB limit/.test(j.error), 'oversized input → 400');

  // 12. POST with pre-parsed objects
  r = await callApi(null, { a: { v: 1 }, b: { v: 2 } });
  j = await r.json();
  ok(r.status === 200 && j.counts.changed === 1, 'POST object params auto-stringified');

  // 13. surfaces: landing, sitemap, llms.txt, OPTIONS, 404
  for (const [path, expect] of [['/', 'html'], ['/sitemap.xml', 'xml'], ['/llms.txt', 'plain'], ['/nope', 404]]) {
    const res = await worker.fetch(new Request('https://json-diff-formatho.filesformatho.workers.dev' + path));
    if (expect === 'html') ok(res.status === 200 && res.headers.get('Content-Type').includes('text/html') && (await res.text()).includes('ld+json'), 'landing 200 html+ld+json');
    else if (expect === 'xml') ok(res.status === 200 && (await res.text()).includes('<urlset'), 'sitemap.xml');
    else if (expect === 'plain') ok(res.status === 200 && (await res.text()).startsWith('# JSON Diff'), 'llms.txt');
    else ok(res.status === 404, 'unknown path 404');
  }
  const opt = await worker.fetch(new Request('https://json-diff-formatho.filesformatho.workers.dev/api', { method: 'OPTIONS' }));
  ok(opt.status === 204 && opt.headers.get('Access-Control-Allow-Origin') === '*', 'OPTIONS preflight 204');

  console.log(`json-diff: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};
t();
