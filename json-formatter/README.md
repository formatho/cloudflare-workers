# JSON Formatter API — Privacy-First, Zero Tracking

A free JSON formatter/validator API that runs on Cloudflare's edge. **No tracking, no data collection, no logs, no external calls** — brought to you by [formatho.com](https://formatho.com/json-formatter), privacy-first developer tools.

## Usage

```bash
# Format JSON
curl "https://json-formatter-formatho.workers.dev/?json=%7B%22name%22%3A%22formatho%22%7D&indent=4"

# Validate (invalid JSON returns 400 + error message)
curl "https://json-formatter-formatho.workers.dev/?json=not-json"
```

Parameters: `json` (required), `indent` (optional, default 2, max 10).

Response headers include `X-Privacy-Policy: Zero tracking, zero data collection`.

## Why privacy-first?

Your data never leaves the request/response cycle — nothing is stored, logged, or analyzed. For a full browser-based formatter (still 100% client-side), see the [Formatho JSON Formatter](https://formatho.com/json-formatter).

## License

MIT
