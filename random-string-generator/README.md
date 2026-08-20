# Random String Generator API — Privacy-First, Zero Tracking

Free, cryptographically secure random strings (`crypto.getRandomValues`) with selectable charsets. **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/random-string-generator), privacy-first developer tools.

## Usage

```bash
curl "https://random-string-formatho.workers.dev/?length=32&charset=alphanumeric"
curl "https://random-string-formatho.workers.dev/?length=6&charset=numeric"
```

Parameters: `length` (1–512, default 16), `charset` — `numeric`, `alphabetic`, `alphanumeric` (default), `special`.

## Why privacy-first?

Randomness generated per request on the edge; nothing is stored or logged — safe for tokens and passwords. Browser-based version: [Formatho Random String Generator](https://formatho.com/random-string-generator).

## License

MIT
