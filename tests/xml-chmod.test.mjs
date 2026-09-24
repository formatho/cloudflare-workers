// Local smoke tests for xml-formatter + chmod-calculator (pure functions via fetch handler)
import xmlWorker from '../workers/xml-formatter/src/index.js';
import chmodWorker from '../workers/chmod-calculator/src/index.js';

let pass = 0, fail = 0;
async function call(worker, path, init) {
  const res = await worker.fetch(new Request('http://x' + path, init));
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { status: res.status, body };
}
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

// --- XML formatter ---
const doc = '<root><item id="1">hello</item><item id="2"><sub>deep</sub></item><empty/></root>';
let r = await call(xmlWorker, '/api?xml=' + encodeURIComponent(doc));
ok('xml pretty valid', r.status === 200 && r.body.valid === true, r.body);
ok('xml pretty indents', r.body.output.includes('\n  <item id="1">hello</item>'), r.body.output);
ok('xml counts', r.body.elements === 5 && r.body.max_depth === 3, r.body);

// round-trip: minify(pretty) === minify(input)
let rMin = await call(xmlWorker, '/api?xml=' + encodeURIComponent(doc) + '&mode=minify');
ok('xml minify', rMin.body.output === '<root><item id="1">hello</item><item id="2"><sub>deep</sub></item><empty/></root>', rMin.body);
let rP = await call(xmlWorker, '/api?xml=' + encodeURIComponent(r.body.output));
let rPM = await call(xmlWorker, '/api?xml=' + encodeURIComponent(rP.body.output) + '&mode=minify');
ok('xml round-trip stable', rPM.body.output === rMin.body.output, rPM.body);

// decl + comment + cdata + doctype + pi
const doc2 = '<?xml version="1.0"?><!-- note --><!DOCTYPE cfg [<!ELEMENT cfg (a)>]><cfg><![CDATA[x<y]]><?proc data?></cfg>';
let r2 = await call(xmlWorker, '/api', { method: 'POST', body: JSON.stringify({ xml: doc2 }) });
ok('xml decl/comment/cdata/doctype/pi', r2.status === 200 && r2.body.valid, r2.body);
ok('xml cdata preserved', r2.body.output.includes('<![CDATA[x<y]]>'), r2.body.output);

// apostrophe/single-quote attributes + entity escaping
let r3 = await call(xmlWorker, '/api', { method: 'POST', body: JSON.stringify({ xml: "<a b='1 &amp; 2'>5 &lt; 6 &#65;</a>" }) });
ok('xml single-quote attr + entities', r3.status === 200 && r3.body.output.includes('b="1 &amp; 2"') && r3.body.output.includes('5 &lt; 6 A'), r3.body);

// POST body mode/indent overrides
let rPost = await call(xmlWorker, '/api', { method: 'POST', body: JSON.stringify({ xml: '<root><a>1</a></root>', mode: 'minify', indent: 4 }) });
ok('xml POST body mode+indent honored', rPost.body.mode === 'minify' && rPost.body.output === '<root><a>1</a></root>', rPost.body);
let rPost2 = await call(xmlWorker, '/api', { method: 'POST', body: JSON.stringify({ xml: '<root><a/></root>', indent: 4 }) });
ok('xml POST body indent honored', rPost2.body.indent === 4 && rPost2.body.output.includes('\n    <a/>'), rPost2.body);
let rPost3 = await call(xmlWorker, '/api', { method: 'POST', body: JSON.stringify({ xml: '<a/>', mode: 'bogus' }) });
ok('xml POST bad mode 400', rPost3.status === 400, rPost3.body);

// errors
let e1 = await call(xmlWorker, '/api?xml=' + encodeURIComponent('<a><b></a>'));
ok('xml mismatched tag 400 + position', e1.status === 400 && /Mismatched/.test(e1.body.error) && e1.body.position, e1.body);
let e2 = await call(xmlWorker, '/api?xml=' + encodeURIComponent('<a><b>'));
ok('xml unclosed 400', e2.status === 400 && /Unclosed/.test(e2.body.error), e2.body);
let e3 = await call(xmlWorker, '/api?xml=' + encodeURIComponent('<a/><b/>'));
ok('xml multiple roots 400', e3.status === 400 && /root/.test(e3.body.error), e3.body);
let e4 = await call(xmlWorker, '/api?xml=' + encodeURIComponent('<a b=c/>'));
ok('xml unquoted attr 400', e4.status === 400 && /[Uu]nquoted|[Mm]alformed/.test(e4.body.error), e4.body);
let e5 = await call(xmlWorker, '/api?xml=' + encodeURIComponent('<a b="1" b="2"/>'));
ok('xml dup attr 400', e5.status === 400 && /Duplicate/.test(e5.body.error), e5.body);
let e6 = await call(xmlWorker, '/api?xml=' + encodeURIComponent('<a>oops'));
ok('xml unterminated 400', e6.status === 400, e6.body);
let e7 = await call(xmlWorker, '/api?mode=bogus&xml=' + encodeURIComponent('<a/>'));
ok('xml bad mode 400', e7.status === 400, e7.body);
let e8 = await call(xmlWorker, '/api?indent=9&xml=' + encodeURIComponent('<a/>'));
ok('xml bad indent 400', e8.status === 400, e8.body);
let e9 = await call(xmlWorker, '/api');
ok('xml usage doc', e9.status === 200 && e9.body.usage, e9.body);
let e10 = await call(xmlWorker, '/nope');
ok('xml 404', e10.status === 404, e10.status);

// --- chmod ---
async function ch(v) { return call(chmodWorker, '/api?chmod=' + encodeURIComponent(v)); }

let c = await ch('755');
ok('chmod 755', c.status === 200 && c.body.symbolic === 'rwxr-xr-x' && c.body.octal === '755' && c.body.command === 'chmod 755 <file>', c.body);
ok('chmod 755 perms', c.body.permissions.owner.explanation === 'read, write, execute' && c.body.permissions.others.explanation === 'read, execute', c.body);
ok('chmod 755 common_use', /directories/.test(c.body.common_use || ''), c.body.common_use);

let c2 = await ch('rwxr-xr-x');
ok('chmod symbolic→755', c2.status === 200 && c2.body.octal === '755' && c2.body.symbolic_ugo === 'u=rwx,g=rx,o=rx', c2.body);

let c3 = await ch('4755');
ok('chmod 4755 setuid', c3.status === 200 && c3.body.symbolic === 'rwsr-xr-x' && c3.body.special_bits.setuid.enabled === true && c3.body.command === 'chmod 4755 <file>', c3.body);
let c4 = await ch('rwsr-xr-x');
ok('chmod rws→4755 round-trip', c4.status === 200 && c4.body.octal_4digit === '4755', c4.body);
let c5 = await ch('rwxr-xr-t');
ok('chmod sticky t→1755', c5.status === 200 && c5.body.octal_4digit === '1755' && c5.body.special_bits.sticky.enabled === true, c5.body);
let c6 = await ch('rwSr-xr-x');
ok('chmod S (setuid noexec)→4655', c6.status === 200 && c6.body.octal_4digit === '4655' && c6.body.symbolic === 'rwSr-xr-x', c6.body);
let c7 = await ch('rwxr-xr-T');
ok('chmod T (sticky noexec)→1754', c7.status === 200 && c7.body.octal_4digit === '1754', c7.body);
let c8 = await ch(' 644 ');
ok('chmod whitespace tolerated', c8.status === 200 && c8.body.octal === '644', c8.body);
let c9 = await ch('600');
ok('chmod 600 common_use', /private/i.test(c9.body.common_use || ''), c9.body);
let c10 = await ch('777');
ok('chmod 777 warning', c10.body.warning && /risk/i.test(c10.body.warning), c10.body);
// ls-style 10-char: '-rw-r--r--' → 644
let c11 = await ch('-rw-r--r--');
ok('chmod ls-style 10-char 644', c11.status === 200 && c11.body.octal === '644', c11.body);

// errors
let x1 = await ch('999');
ok('chmod 999 → 400', x1.status === 400, x1.body);
let x2 = await ch('75555');
ok('chmod 5-digit → 400', x2.status === 400, x2.body);
let x3 = await ch('abc');
ok('chmod garbage → 400', x3.status === 400, x3.body);
let x4 = await ch('rwxr-xx');
ok('chmod bad symbolic char → 400', x4.status === 400, x4.body);
let x5 = await call(chmodWorker, '/api');
ok('chmod bare /api → usage', x5.status === 200 && x5.body.usage, x5.body);
let x5b = await call(chmodWorker, '/api?chmod=');
ok('chmod empty param → 400', x5b.status === 400, x5b.body);
let x6 = await call(chmodWorker, '/nope');
ok('chmod 404', x6.status === 404, x6.status);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
