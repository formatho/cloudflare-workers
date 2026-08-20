# MD5 Hash Generator API — Privacy-First, Zero Tracking

Free MD5 hash generation at the edge. **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/md5-generator), privacy-first developer tools.

> Note: MD5 is not cryptographically secure — use it only for checksums, cache keys, and legacy compatibility. See the [Formatho MD5 Generator](https://formatho.com/md5-generator) for details and client-side hashing.

## Usage

```bash
curl "https://md5-generator-formatho.workers.dev/?text=hello"
# {"hash":"5d41402abc4b2a76b9719d911017c592", ...}
```

Parameters: `text` (required).

## Why privacy-first?

Hashing happens in-memory on Cloudflare's edge; nothing is stored or logged. For browser-based hashing (never leaves your machine), see [formatho.com/md5-generator](https://formatho.com/md5-generator).

## License

MIT
