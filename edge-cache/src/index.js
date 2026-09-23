/**
 * Formatho Edge Cache Worker — free-tier fix for cf-cache-status: DYNAMIC
 * Caches GET/HEAD 200s (HTML + static assets) at the edge via Cache API.
 * Privacy-first: no logging, no tracking.
 */

const HTML_TTL = 600;        // 10 min
const ASSET_TTL = 2592000;   // 30 days
const SITEMAP_TTL = 3600;    // 1 hour — keep fresh, never cache empty
const ASSET_EXT = /\.(?:css|js|mjs|png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?|ttf|txt|xml|json|webmanifest|wasm|map)$/i;
const CACHE_VERSION = "v2";  // bump to orphan all previously cached entries

const textBody = async resp => {
  try { return await resp.text(); } catch { return ""; }
};

export default {
  async fetch(request, env, ctx) {
    const tagged = (resp, state) => {
      const r = new Response(resp.body, resp);
      r.headers.set("x-formatho-cache", state);
      return r;
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      return tagged(await fetch(request), "BYPASS");
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return tagged(await fetch(request), "BYPASS");
    }

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/${CACHE_VERSION}${url.pathname}${url.search}`, { method: "GET" });

    const cached = await cache.match(cacheKey);
    if (cached) return tagged(cached, "HIT");

    let originResp = await fetch(request);
    if (originResp.status !== 200) return tagged(originResp, "BYPASS");

    const ct = originResp.headers.get("content-type") || "";
    const isAsset = ASSET_EXT.test(url.pathname);
    if (!isAsset && !ct.includes("text/html") && ct.includes("octet-stream")) {
      // Origin misconfig: HTML served as application/octet-stream. Normalize so
      // browsers, bots and the edge cache treat it as HTML.
      const fixed = new Response(originResp.body, originResp);
      fixed.headers.set("content-type", "text/html; charset=utf-8");
      originResp = fixed;
    }
    const ct2 = originResp.headers.get("content-type") || "";
    if (!isAsset && !ct2.includes("text/html")) return tagged(originResp, "BYPASS");

    // Never cache empty responses (a transient empty sitemap/page got cached 30d once)
    const bodyText = await textBody(originResp);
    if (bodyText.length === 0) return tagged(new Response(bodyText, originResp), "BYPASS-EMPTY");
    const bodyResp = new Response(bodyText, originResp);

    const isSitemap = url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt";
    const ttl = isSitemap ? SITEMAP_TTL : (isAsset ? ASSET_TTL : HTML_TTL);
    const stored = new Response(bodyText, bodyResp);
    stored.headers.set("Cache-Control", `public, max-age=${ttl}, s-maxage=${ttl}`);
    ctx.waitUntil(cache.put(cacheKey, stored));

    return tagged(bodyResp, "MISS");
  },
};
