# Timestamp Converter API — Privacy-First, Zero Tracking

Free unix timestamp ↔ ISO conversion at the edge. Auto-detects seconds vs milliseconds; call with no params to get the current time. **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/timestamp-converter), privacy-first developer tools.

## Usage

```bash
curl "https://timestamp-converter-formatho.workers.dev/?timestamp=1692508800"
curl "https://timestamp-converter-formatho.workers.dev/?iso=2023-08-20T00:00:00Z&format=readable"
curl "https://timestamp-converter-formatho.workers.dev/"   # current time
```

Parameters: `timestamp` (unix s or ms) or `iso` (ISO date string); `format` — `iso` (default), `utc`, `date`, `time`, `readable`. Response always includes `unix_seconds`, `unix_milliseconds`, and `iso`.

## Why privacy-first?

Pure computation, nothing stored or logged. Browser-based version: [Formatho Timestamp Converter](https://formatho.com/timestamp-converter).

## License

MIT
