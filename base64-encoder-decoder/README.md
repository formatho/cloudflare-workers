# Base64 Encoder/Decoder API — Privacy-First, Zero Tracking

Free, fast, Unicode-safe Base64 encode/decode at the edge. **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/base64-encoder-decoder), privacy-first developer tools.

## Usage

```bash
curl "https://base64-formatho.workers.dev/?text=hello&action=encode"
curl "https://base64-formatho.workers.dev/?text=aGVsbG8%3D&action=decode"
```

Parameters: `text` (required), `action` — `encode` (default) or `decode`.

## Why privacy-first?

Nothing is stored or logged. For a full browser-based Base64 tool (100% client-side), see the [Formatho Base64 Encoder/Decoder](https://formatho.com/base64-encoder-decoder).

## License

MIT
