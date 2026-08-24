/**
 * Formatho Embed Widgets — free, iframe-embeddable, privacy-first.
 * No tracking, no cookies. Each widget links back to formatho.com.
 * Usage: <iframe src="https://embed.formatho.workers.dev/base64" ...></iframe>
 */

const PAGE = (title, body, w = 380) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Formatho</title>
<style>
*{box-sizing:border-box}body{font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;padding:14px;background:#0f172a;color:#e2e8f0;max-width:${w}px}
textarea,input{width:100%;padding:8px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font:13px ui-monospace,Menlo,monospace;margin:4px 0}
button{background:#3b82f6;color:#fff;border:0;border-radius:6px;padding:8px 14px;font-weight:600;cursor:pointer;margin:4px 4px 0 0}
button.alt{background:#334155}
.out{background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px;margin-top:6px;font:13px ui-monospace,Menlo,monospace;word-break:break-all;min-height:20px}
a.cr{display:block;text-align:right;margin-top:8px;font-size:11px;color:#64748b;text-decoration:none}
a.cr b{color:#93c5fd}
</style></head><body>${body}
<a class="cr" href="https://formatho.com" target="_blank" rel="noopener">⚡ <b>Formatho</b> — privacy-first dev tools</a>
</body></html>`;

const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

const widgets = {
  "/base64": () => PAGE("Base64 Encoder/Decoder", `
    <h3 style="margin:0 0 6px">Base64 Encode / Decode</h3>
    <textarea id="i" rows="3" placeholder="Enter text…"></textarea>
    <button onclick="r.textContent=btoa(unescape(encodeURIComponent(i.value)))||'—'">Encode</button>
    <button class="alt" onclick="try{r.textContent=decodeURIComponent(escape(atob(i.value.trim())))}catch(e){r.textContent='⚠ invalid base64'}">Decode</button>
    <div class="out" id="r"></div>
    <script>const i=document.getElementById('i'),r=document.getElementById('r');</script>`),

  "/uuid": () => PAGE("UUID Generator", `
    <h3 style="margin:0 0 6px">UUID v4 Generator</h3>
    <button onclick="g()">Generate UUID</button>
    <button class="alt" onclick="g(10)">Generate 10</button>
    <div class="out" id="r"></div>
    <script>
    function g(n=1){document.getElementById('r').innerHTML=Array.from({length:n},()=>
      crypto.randomUUID()).join('<br>')||'—'}
    g();
    </script>`),

  "/hash": () => PAGE("Hash Generator", `
    <h3 style="margin:0 0 6px">SHA-256 / MD5-style Hash</h3>
    <input id="i" placeholder="Enter text to hash">
    <button onclick="h()">Generate SHA-256</button>
    <div class="out" id="r"></div>
    <script>
    async function h(){const t=document.getElementById('i').value;if(!t)return;
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));
    document.getElementById('r').textContent=[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
    </script>`),

  "/timestamp": () => PAGE("Unix Timestamp", `
    <h3 style="margin:0 0 6px">Unix Timestamp</h3>
    <div class="out" id="r" style="min-height:34px;display:flex;align-items:center"></div>
    <input id="i" placeholder="Paste timestamp or ISO date…">
    <button onclick="c()">Convert</button>
    <div class="out" id="o"></div>
    <script>
    setInterval(()=>{document.getElementById('r').textContent=Math.floor(Date.now()/1000)},1000);
    function c(){const v=document.getElementById('i').value.trim();if(!v)return;
    const d=v.length<12?new Date(v*1000):new Date(v);
    document.getElementById('o').textContent=isNaN(d)?'⚠ invalid':d.toISOString()}
    </script>`),

  "/": () => PAGE("Formatho Embeds", `
    <h3 style="margin:0 0 6px">Formatho Embed Widgets</h3>
    <p style="color:#94a3b8">Free, private, no tracking.</p>
    <p><a href="/base64" style="color:#93c5fd">/base64</a> · <a href="/uuid" style="color:#93c5fd">/uuid</a> · <a href="/hash" style="color:#93c5fd">/hash</a> · <a href="/timestamp" style="color:#93c5fd">/timestamp</a></p>
    <p style="font-size:12px;color:#64748b">Embed: &lt;iframe src="https://embed.formatho.workers.dev/base64" width="400" height="300"&gt;&lt;/iframe&gt;</p>`, 460),
};

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const w = widgets[pathname] || widgets["/"];
    return new Response(w(), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600",
        "x-robots-tag": "index, follow", // let widgets rank + pass link equity
      },
    });
  },
};
