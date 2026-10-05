# Formatho API Gateway (`api-gateway-formatho`)

Phase A of the paid-API-tier plan (backlog #1, `plans/PAID-API-TIER-PLAN.md` §7):
one versioned prefix proxying 14 tool workers' `/api` endpoints via **service
bindings** — no auth, no rate limits yet. Pure proxy; tool workers unchanged.

- **Landing:** `https://api-gateway-formatho.filesformatho.workers.dev/`
- **Route directory:** `GET /v1` (machine-readable) — 14 routes under `/v1/*`
- **Proxy contract:** method + query + body + Content-Type pass through 1:1;
  path rewritten `/v1/<route>` → `/api`; upstream response body untouched
  (`X-Formatho-Gateway: v1-preview` header added).
- **Fleet surface:** sitemap.xml (2 locs, max-age=300), /llms.txt, OPTIONS
  preflight 204, JSON error envelope on unknown routes (plan §2 format).

## Phases

| Phase | Status | What |
|---|---|---|
| A | **live (this worker)** | route table + service bindings, pure proxy |
| B | next | FREE_ANON ratelimit binding, 429 envelope + headers |
| C | next | D1 `formatho-api-db` keys (SHA-256 hashed), tier select |
| D | owner-gated | Stripe billing, self-serve, email delivery |

## Owner gates (plan §9 — unchanged)

`api.formatho.com` custom domain (public brand surface), pricing/tier limits,
Stripe, email provider. Legacy `*.workers.dev/api` URLs stay free + untouched.

## Tests

`node tests/api-gateway.test.mjs` — 13 local tests incl. wrangler.toml ⇄ route
table drift guard. Live acceptance 10-05: 13 routes byte-identical vs legacy
`/api` (deterministic routes; uuid/random-string/lorem shape-checked,
timestamp tool is nondeterministic-by-design "now" fields — keys match).

## Notes

- Excluded from tools-index/fleet count deliberately (API surface, not a tool).
- Service bindings are internal subrequests — no public hop, free plan OK.
