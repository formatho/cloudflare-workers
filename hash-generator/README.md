# Hash Generator API — Privacy-First, Zero Tracking

Free multi-algorithm hashing (MD5, SHA-1, SHA-256, SHA-512) at the edge. **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/hash-generator), privacy-first developer tools.

## Usage

```bash
curl "https://hash-generator-formatho.workers.dev/?text=hello&algorithm=SHA-512"
curl "https://hash-generator-formatho.workers.dev/?text=hello&algorithm=MD5"
# {"hash":"5d41402abc4b2a76b9719d911017c592", ...}
```

Parameters: `text` (required), `algorithm` — `MD5`, `SHA-1`, `SHA-256` (default), `SHA-512`.

## Why privacy-first?

Hashing happens in-memory on the edge; nothing is stored or logged. Browser-based version: [Formatho Hash Generator](https://formatho.com/hash-generator).

## License

MIT
