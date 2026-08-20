# UUID Generator API — Privacy-First, Zero Tracking

Free RFC 4122 v4 UUID generation at the edge, using cryptographically secure randomness. **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/uuid-generator), privacy-first developer tools.

## Usage

```bash
curl "https://uuid-generator-formatho.workers.dev/?count=5"
```

Parameters: `count` (optional, 1–100, default 1).

## Why privacy-first?

Generated with `crypto.randomUUID()` per request; nothing is stored or logged. For a browser-based generator (never leaves your machine), see the [Formatho UUID Generator](https://formatho.com/uuid-generator).

## License

MIT
