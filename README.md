# Formatho Cloudflare Workers — Free Privacy-First APIs

Free, fast, zero-tracking developer tool APIs running on [Cloudflare Workers](https://workers.cloudflare.com/) — by [formatho.com](https://formatho.com), privacy-first developer tools.

**No tracking. No data collection. No logs. Ever.**

## Live APIs

| API | Live URL | Example |
|-----|----------|---------|
| JSON Formatter | https://json-formatter-formatho.filesformatho.workers.dev | `?json={"a":1}&indent=2` |
| Base64 Encoder/Decoder | https://base64-formatho.filesformatho.workers.dev | `?text=hello&action=encode` |
| URL Encoder/Decoder | https://url-encoder-formatho.filesformatho.workers.dev | `?text=https://formatho.com&action=encode` |
| MD5 Generator | https://md5-generator-formatho.filesformatho.workers.dev | `?text=hello` |
| SHA-256 Generator | https://sha256-generator-formatho.filesformatho.workers.dev | `?text=hello` |
| Multi-Hash Generator (MD5/SHA-1/SHA-256/SHA-512) | https://hash-generator-formatho.filesformatho.workers.dev | `?text=hello&algorithm=sha512` |
| UUID Generator (v4, batch up to 100) | https://uuid-generator-formatho.filesformatho.workers.dev | `?count=10` |
| Random String Generator | https://random-string-formatho.filesformatho.workers.dev | `?length=32&charset=alphanumeric` |
| Slug Generator | https://slug-generator-formatho.filesformatho.workers.dev | `?text=Hello World 123` |
| Timestamp Converter | https://timestamp-converter-formatho.filesformatho.workers.dev | `?ts=1755706800` or `?iso=2026-08-20T13:00:00Z` |

Each worker lives in its own directory with its own `wrangler.toml` and README with full usage docs.

## Deploy your own

```bash
cd json-formatter
npx wrangler deploy
```

Requires a Cloudflare account (`wrangler login`). Free tier works fine.

## Why privacy-first?

Every API is stateless — nothing is stored, logged, or shared. For full browser-based versions of these tools (100% client-side, works offline), see [formatho.com](https://formatho.com).

## License

MIT
