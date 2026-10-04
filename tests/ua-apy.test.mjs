// Local edge-case tests for user-agent-parser + apy-calculator workers.
import ua from '../user-agent-parser/src/index.js';
import apy from '../apy-calculator/src/index.js';

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.error('FAIL:', label); } };

async function api(worker, path, init = {}) {
  const res = await worker.fetch(new Request(`https://x.dev${path}`, init));
  return { status: res.status, body: await res.json() };
}

// --- User Agent Parser ---
const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FF_ANDROID = 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0';
const EDGE_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const GOOGLEBOT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/125.0.6422.175 Safari/537.36';
const CURL = 'curl/8.7.1';
const IE9 = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)';
const IE11 = 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko';
const GALAXY_TAB = 'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

let r = await api(ua, `/api?ua=${encodeURIComponent(CHROME_WIN)}`);
ok(r.status === 200 && r.body.browser.name === 'Chrome' && r.body.browser.version === '131.0.0.0', 'chrome win browser');
ok(r.body.os.name === 'Windows' && r.body.os.version === '10/11', 'chrome win os 10/11');
ok(r.body.engine.name === 'Blink' && r.body.device.type === 'desktop' && r.body.bot.is_bot === false, 'chrome win engine/device/bot');

r = await api(ua, `/api?ua=${encodeURIComponent(SAFARI_IOS)}`);
ok(r.body.browser.name === 'Safari' && r.body.browser.version === '17.5', 'safari ios browser');
ok(r.body.os.name === 'iOS' && r.body.os.version === '17.5' && r.body.device.type === 'mobile', 'safari ios os/device');

r = await api(ua, `/api?ua=${encodeURIComponent(FF_ANDROID)}`);
ok(r.body.browser.name === 'Firefox' && r.body.browser.version === '132.0', 'ff android browser');
ok(r.body.engine.name === 'Gecko' && r.body.engine.version === '132.0', 'ff android gecko rv');
ok(r.body.os.name === 'Android' && r.body.os.version === '14' && r.body.device.type === 'mobile', 'ff android os/device');

r = await api(ua, `/api?ua=${encodeURIComponent(EDGE_MAC)}`);
ok(r.body.browser.name === 'Microsoft Edge' && r.body.os.name === 'macOS' && r.body.os.version === '10.15.7', 'edge mac');

r = await api(ua, `/api?ua=${encodeURIComponent(GOOGLEBOT)}`);
ok(r.body.bot.is_bot === true && r.body.bot.name === 'Googlebot' && r.body.device.type === 'bot', 'googlebot');

r = await api(ua, `/api?ua=${encodeURIComponent(CURL)}`);
ok(r.body.bot.is_bot === true && r.body.browser.name === 'curl', 'curl bot');

r = await api(ua, `/api?ua=${encodeURIComponent(IE9)}`);
ok(r.body.browser.name === 'Internet Explorer' && r.body.browser.version === '9.0' && r.body.engine.name === 'Trident', 'ie9');
r = await api(ua, `/api?ua=${encodeURIComponent(IE11)}`);
ok(r.body.browser.name === 'Internet Explorer' && r.body.browser.version === '11.0', 'ie11 trident rv');

r = await api(ua, `/api?ua=${encodeURIComponent(GALAXY_TAB)}`);
ok(r.body.device.type === 'tablet' && r.body.os.name === 'Android' && r.body.device.model === 'SM-X710', 'galaxy tab tablet+model');

// own header fallback
r = await api(ua, '/api', { headers: { 'user-agent': 'node-fetch-test/1.0' } });
ok(r.status === 200 && r.body.user_agent === 'node-fetch-test/1.0', 'header fallback');
r = await api(ua, '/api', { headers: {} });
ok(r.status === 400, 'empty ua 400');
r = await api(ua, `/api?ua=${'x'.repeat(513)}`);
ok(r.status === 400 && /max 512/.test(r.body.error), 'ua length cap 400');

// POST + OPTIONS + landing + sitemap + llms.txt
r = await api(ua, '/api', { method: 'POST', body: JSON.stringify({ ua: CURL }) });
ok(r.status === 200 && r.body.bot.name === 'curl', 'POST body parse');
const pre = await ua.fetch(new Request('https://x.dev/api', { method: 'OPTIONS' }));
ok(pre.status === 204 && pre.headers.get('access-control-allow-methods').includes('POST'), 'OPTIONS preflight');
ok((await ua.fetch(new Request('https://x.dev/'))).headers.get('content-type').includes('text/html'), 'landing html');
ok((await ua.fetch(new Request('https://x.dev/sitemap.xml'))).status === 200, 'sitemap');
ok((await ua.fetch(new Request('https://x.dev/llms.txt'))).status === 200, 'llms.txt');

// --- APY Calculator ---
// Known vectors
r = await api(apy, '/api?apr=5&n=12');
ok(r.status === 200 && r.body.apy_pct === 5.11619, `5% monthly apy=${r.body.apy_pct}`);
r = await api(apy, '/api?apr=5&n=continuous');
ok(r.status === 200 && Math.abs(r.body.apy_pct - 5.12711) < 0.00001, `5% continuous apy=${r.body.apy_pct}`);
r = await api(apy, '/api?apr=3&n=4');
ok(r.body.apy_pct === 3.033919, `3% quarterly apy=${r.body.apy_pct}`);
r = await api(apy, '/api?apr=5');
ok(r.body.compounding.times_per_year === 12, 'default monthly');
r = await api(apy, '/api?apr=4.5&n=365&principal=10000&years=5');
ok(r.body.projection.final_balance === 12523.05, `projection=${r.body.projection.final_balance}`);
r = await api(apy, '/api?apr=0&n=12');
ok(r.body.apy_pct === 0, 'zero apr');
r = await api(apy, '/api?apr=-5&n=12');
ok(r.status === 200 && r.body.apy_pct === -4.886993, `negative apr=${r.body.apy_pct}`);

// 400s
r = await api(apy, '/api');
ok(r.status === 400 && /apr/.test(r.body.error), 'missing apr');
r = await api(apy, '/api?apr=abc');
ok(r.status === 400, 'non-numeric apr');
r = await api(apy, '/api?apr=5&n=abc');
ok(r.status === 400 && /n must be/.test(r.body.error), 'bad n');
r = await api(apy, '/api?apr=5&n=0');
ok(r.status === 400, 'n=0');
r = await api(apy, '/api?apr=5&n=366');
ok(r.status === 400, 'n=366');
r = await api(apy, '/api?apr=5&n=12&principal=-100');
ok(r.status === 400 && /principal/.test(r.body.error), 'negative principal');
r = await api(apy, '/api?apr=5&n=12&years=-1');
ok(r.status === 400, 'negative years');
r = await api(apy, '/api?apr=-100');
ok(r.status === 400, 'apr=-100');
r = await api(apy, '/api', { method: 'POST', body: 'not json' });
ok(r.status === 400 && /JSON/.test(r.body.error), 'bad POST body');
r = await api(apy, '/api', { method: 'POST', body: JSON.stringify({ apr: 2.5, compoundings: 4 }) });
ok(r.status === 200 && r.body.compounding.times_per_year === 4, 'POST compoundings alias');

const apre = await apy.fetch(new Request('https://x.dev/api', { method: 'OPTIONS' }));
ok(apre.status === 204, 'apy OPTIONS');
ok((await apy.fetch(new Request('https://x.dev/'))).headers.get('content-type').includes('text/html'), 'apy landing');
ok((await apy.fetch(new Request('https://x.dev/sitemap.xml'))).status === 200, 'apy sitemap');
ok((await apy.fetch(new Request('https://x.dev/llms.txt'))).status === 200, 'apy llms.txt');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
