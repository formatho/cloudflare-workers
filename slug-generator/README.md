# Slug Generator API — Privacy-First, Zero Tracking

Free URL-slug generator with diacritic folding (accents → ASCII). **No tracking, no data collection, no logs** — by [formatho.com](https://formatho.com/slug-generator), privacy-first developer tools.

## Usage

```bash
curl "https://slug-generator-formatho.workers.dev/?text=Hello%20World!"
# {"slug":"hello-world", ...}
curl "https://slug-generator-formatho.workers.dev/?text=Caf%C3%A9%20Menu%20%26%20Drinks"
# {"slug":"cafe-menu-drinks", ...}
```

Parameters: `text` (required), `separator` (default `-`).

## Why privacy-first?

Pure computation, nothing stored or logged. Browser-based version: [Formatho Slug Generator](https://formatho.com/slug-generator).

## License

MIT
