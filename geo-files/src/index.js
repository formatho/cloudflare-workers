const ROBOTS = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

# AI crawlers explicitly allowed (AI search visibility)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: CCBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Bytespider
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: https://formatho.com/sitemap.xml
`;

const LLMS = `# Formatho

> Formatho is a privacy-first developer tools site with 100+ free online tools that run 100% client-side in your browser. No signup, no server processing — your data never leaves your device.

## Main Pages
- [All Tools Directory]: https://formatho.com/tools — Browse 100+ free developer tools across converters, security, dev, and AI categories
- [About]: https://formatho.com/about — What Formatho is and why privacy-first matters
- [Blog]: https://formatho.com/blogs — Guides on JSON/YAML, JWT, UUIDs, regex, SQL, QR codes, and private tooling
- [Privacy Policy]: https://formatho.com/privacy — Zero tracking, zero storage, zero uploads

## Popular Tools
- [JSON to YAML Converter]: https://formatho.com/tools/json-yaml — Convert JSON to YAML and back instantly. Free, private, browser-based.
- [JSON to CSV Converter]: https://formatho.com/tools/json-csv — Convert JSON to CSV and CSV to JSON instantly, client-side.
- [Base64 Encoder/Decoder]: https://formatho.com/tools/base64 — Encode and decode Base64 strings and files in your browser.
- [URL Encoder/Decoder]: https://formatho.com/tools/url-encoder — Encode and decode URL strings safely.
- [JWT Decoder]: https://formatho.com/tools/jwt-decoder — Decode and inspect JSON Web Tokens locally without server exposure.
- [UUID Generator]: https://formatho.com/tools/uuid — Generate UUID v1/v4/v7 offline in your browser.
- [Hash Generator]: https://formatho.com/tools/hash — Generate MD5, SHA-1, SHA-256, SHA-512, and Argon2 hashes client-side.
- [SQL Formatter]: https://formatho.com/tools/sql-formatter — Format and beautify SQL queries without cloud uploads.
- [QR Code Generator]: https://formatho.com/tools/qr — Generate QR codes without tracking pixels.
- [Regex Tester]: https://formatho.com/tools/regex — Test regex patterns securely, 100% client-side.
- [Unix Timestamp Converter]: https://formatho.com/tools/unix-timestamp — Convert Unix timestamps to human-readable dates with live clock.
- [Markdown Converter]: https://formatho.com/tools/markdown — Convert Markdown to HTML with syntax highlighting.
- [Text Diff]: https://formatho.com/tools/diff — Compare two texts and see differences instantly.
- [IPv4 Subnet Calculator]: https://formatho.com/tools/ipv4-subnet — Calculate subnets, ranges, and masks online.
- [Crontab Generator]: https://formatho.com/tools/cron — Build and validate cron expressions visually.

## Policies
- robots.txt: AI crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended, Bytespider, Amazonbot, Applebot-Extended) are allowed
- Sitemap: https://formatho.com/sitemap.xml
`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const isRobots = url.pathname === "/robots.txt";
    const body = isRobots ? ROBOTS : LLMS;
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": isRobots ? "text/plain; charset=utf-8" : "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
        "x-served-by": "formatho-geo-files-worker",
      },
    });
  },
};
