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
| JWT Decoder | https://jwt-decoder-formatho.filesformatho.workers.dev | `?token=eyJhbGci...` |
| Cron Expression Explainer | https://cron-parser-formatho.filesformatho.workers.dev | `?expr=0+9+*+*+1-5` |
| Case Converter | https://case-converter-formatho.filesformatho.workers.dev | `?text=hello+world` |
| Lorem Ipsum Generator | https://lorem-ipsum-formatho.filesformatho.workers.dev | `?paragraphs=3&format=text` |
| HTML Entity Encoder/Decoder | https://html-entity-encoder-formatho.filesformatho.workers.dev | `?text=<a href="x">&action=encode` |
| Password Generator | https://password-generator-formatho.filesformatho.workers.dev | `?length=20&count=5` |
| CSV→JSON Converter | https://csv-to-json-formatho.filesformatho.workers.dev | `?csv=a,b%0C1,2` or POST JSON |
| JSON→CSV Converter | https://json-to-csv-formatho.filesformatho.workers.dev | POST `[{"a":1,"b":2}]` |
| Regex Tester | https://regex-tester-formatho.filesformatho.workers.dev | `?pattern=%5Cd%2B&text=a1b22` |
| Color Converter | https://color-converter-formatho.filesformatho.workers.dev | `?color=%23ff6600` |
| Diff Checker | https://diff-checker-formatho.filesformatho.workers.dev | `?a=old%20text&b=new%20text` or POST `{"a":...,"b":...}` |
| Number Base Converter | https://base-converter-formatho.filesformatho.workers.dev | `?value=255&from=10&to=36` |
| Roman Numeral Converter | https://roman-numeral-formatho.filesformatho.workers.dev | `?number=2026` or `?roman=MMXXVI` |
| IPv4 Subnet Calculator | https://subnet-calculator-formatho.filesformatho.workers.dev | `?cidr=192.168.1.10/24` or `?ip=…&mask=…` |
| XML Formatter | https://xml-formatter-formatho.filesformatho.workers.dev | `?xml=<doc>&mode=pretty\|minify&indent=2` (POST for ≤256KB) |
| chmod Calculator | https://chmod-calculator-formatho.filesformatho.workers.dev | `?chmod=755` or `?chmod=rwxr-xr-x` (also 4-digit/ls-style) |
| HMAC Generator | https://hmac-generator-formatho.filesformatho.workers.dev | `?data=hello&key=secret&alg=SHA-256` or POST |
| URL Parser | https://url-parser-formatho.filesformatho.workers.dev | `?url=https%3A%2F%2Fexample.com%2Fp%3Fq%3D1` |
| Text ⇄ Binary Converter | https://text-to-binary-formatho.filesformatho.workers.dev | `?text=hello` or `?binary=01101000…` |
| JSON ⇄ YAML Converter | https://json-yaml-formatho.filesformatho.workers.dev | `?json=%7B%22a%22%3A1%7D` or `?yaml=a%3A%201`, or POST (auto-detect) |
| TOTP Code Generator | https://totp-generator-formatho.filesformatho.workers.dev | `?secret=JBSWY3DPEHPK3PXP&digits=6`, or `?url=otpauth://…` |

Directory of all 31: https://formatho-tools.filesformatho.workers.dev

Each worker lives in its own directory with its own `wrangler.toml` and README with full usage docs.

## Deploy your own

```bash
cd json-formatter
npx wrangler deploy
```

Requires a Cloudflare account (`wrangler login`). Free tier works fine.

## Free plan limits (Cloudflare)

All Workers in this repo run on the Cloudflare Workers **free plan**. Limits are **per account** and shared by every Worker deployed from this repo (31 as of Sep 2026). Source: [official limits docs](https://developers.cloudflare.com/workers/platform/limits/) (checked 2026-09-24).

| Limit | Free plan | Impact on this fleet |
|---|---|---|
| Requests | **100,000/day per account** (resets 00:00 UTC) | Shared across all 20 Workers. Exceeded → [error 1027](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1027/) until reset |
| CPU time | 10 ms per invocation | All our APIs are stateless transforms (typically <1 ms); overrun → [error 1102](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/) |
| Memory | 128 MB per isolate | Sufficient for text transforms; very large payloads should use the browser tools |
| Subrequests | 50 per request | None of these Workers make outbound calls |
| Simultaneous outgoing connections | 6 per request | n/a |
| Worker size | 64 MiB | Each Worker is a few KB |
| Startup time | 1 second | n/a |
| Workers per account | 100 | Fleet at 20/100 |
| Cron triggers | 5 per account | 0 used |
| Environment variables | 64 per Worker (5 KB each) | Minimal use |
| Request body | 100 MB (Cloudflare free plan) | Most APIs are GET-query based; keep big payloads in the browser tools |
| URL size | 16 KB | GET-based APIs: keep query text short |

### When limits are hit

- **Daily request cap (100k/day)**: Workers stop serving and Cloudflare returns error 1027 until 00:00 UTC. Monitor usage in the Cloudflare dashboard → Workers & Pages → Metrics.
- **CPU/memory overrun**: error 1102 "Worker exceeded resource limits".

### Options if you need more

1. Use the **browser tools on [formatho.com](https://formatho.com)** — 100% client-side, no server involved, no shared quota.
2. **Self-deploy** any Worker from this repo on your own (free) Cloudflare account to get your own 100k/day.
3. Upgrade to **Workers Paid** — removes the daily request cap (10 ms CPU → 5 min, subrequests → 10k).

## Why privacy-first?

Every API is stateless — nothing is stored, logged, or shared. For full browser-based versions of these tools (100% client-side, works offline), see [formatho.com](https://formatho.com).

## License

MIT

## 🧩 Embeddable Widgets (NEW)

Free, iframe-embeddable, no-tracking widgets you can drop into any blog, docs site, or README:

| Widget | URL |
|---|---|
| Base64 Encoder/Decoder | https://embed.formatho.workers.dev/base64 |
| UUID Generator | https://embed.formatho.workers.dev/uuid |
| SHA-256 Hash | https://embed.formatho.workers.dev/hash |
| Unix Timestamp | https://embed.formatho.workers.dev/timestamp |

```html
<iframe src="https://embed.formatho.workers.dev/base64"
        width="420" height="340" style="border:0;border-radius:8px"
        title="Base64 Encoder by Formatho"></iframe>
```

All widgets run client-side with zero tracking — same privacy promise as [formatho.com](https://formatho.com).
