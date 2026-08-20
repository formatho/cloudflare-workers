# SHA-256 Hash Generator API — Privacy-First, Zero Tracking

Free SHA-256 hashing at the edge via the Web Crypto API. **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/sha256-generator), privacy-first developer tools.

## Usage

```bash
curl "https://sha256-generator-formatho.workers.dev/?text=hello"
# {"hash":"2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", ...}
```

Parameters: `text` (required).

## Why privacy-first?

Hashing happens in-memory on Cloudflare's edge; nothing is stored or logged. For browser-based hashing (never leaves your machine), see [formatho.com/sha256-generator](https://formatho.com/sha256-generator).

## License

MIT
