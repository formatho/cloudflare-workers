# Formatho API Gateway (`api-gateway-formatho`)

Phases A+B of the paid-API-tier plan (backlog #1, `plans/PAID-API-TIER-PLAN.md` §7):
one versioned prefix proxying 14 tool workers' `/api` endpoints via **service
bindings** (A), with anonymous per-IP rate limiting wired through a `FREE_ANON`
ratelimit binding + 429 envelope/headers (B). Tool workers unchanged.

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
| A | **live** | route table + service bindings, pure proxy |
| B | **live (code) — enforcement caveat, see below** | FREE_ANON ratelimit binding, 429 envelope + Retry-After + X-RateLimit-Limit |
| C | next | D1 `formatho-api-db` keys (SHA-256 hashed), tier select |
| D | owner-gated | Stripe billing, self-serve, email delivery |

## Owner gates (plan §9 — unchanged)

`api.formatho.com` custom domain (public brand surface), pricing/tier limits,
Stripe, email provider. Legacy `*.workers.dev/api` URLs stay free + untouched.

## Tests

`node tests/api-gateway.test.mjs` — 21 local tests: 13 Phase A (incl.
wrangler.toml ⇄ route table drift guard) + 8 Phase B (429 envelope/headers,
fail-open on missing/throwing binding, non-/v1 surfaces never limited, toml ⇄
code limit parity). Live acceptance 10-05: 13 routes byte-identical vs legacy
`/api` (deterministic routes; uuid/random-string/lorem shape-checked,
timestamp tool is nondeterministic-by-design "now" fields — keys match).

## Phase B enforcement caveat (found live 2026-10-05)

The `FREE_ANON` binding **deploys and is invoked** on every known `/v1/*`
request (`limit({key: CF-Connecting-IP})` → `{success:true}`), but never
**enforced**: 117 rapid requests from a single IP (incl. 45 forced-IPv4,
single-colo) all passed — zero 429s. `wrangler tail` shows no runtime warnings.
Most plausible cause: the WAF-backed counter isn't active on free-plan
workers.dev routes (docs unverifiable offline). The handler **fails open by
design**, so behavior equals Phase A until enforcement activates — expected on
a zone-routed custom domain (`api.formatho.com`, owner gate §9) or plan
change, with **zero code change** (limit tuning = wrangler.toml + redeploy).

## Notes

- Excluded from tools-index/fleet count deliberately (API surface, not a tool).
- Service bindings are internal subrequests — no public hop, free plan OK.

## Phase C — D1 hashed-key management (2026-10-06)

- **DB:** `formatho-api-db` (D1 free tier, id `0cabb605-…`, schema in `schema.sql`): `accounts`, `keys` (SHA-256 **hash-only**, raw never stored), `usage_daily` rollups.
- **Key path:** `x-api-key` → SHA-256 → 1 indexed point read → tier (`free` 60/min / `paid` 600/min via `FREE_KEY`/`PAID_KEY` bindings). Invalid/revoked → 401. **Fail-open:** D1 outage degrades keyed callers to anonymous limits (never 401s a possibly-valid holder; nobody gains elevated access). Same free-plan non-enforcement caveat as Phase B applies to the new bindings on workers.dev routes.
- **Admin:** `POST /admin/keys {email,tier,label}` + `x-admin-secret`. Returns the raw key (`fmt_live_…`) exactly once. **503 until the owner sets `ADMIN_SECRET`** (`wrangler secret put ADMIN_SECRET`) — launch gate held; e2e-tested 10-06 with a temporary secret (issue → paid-200 → revoke → 401 → secret deleted → 503).
- **Usage:** batched `usage_daily` writes (every 25 counted requests via `waitUntil`) — advisory counts, never payloads.
- **Tests:** `node tests/api-gateway.test.mjs` — 31 (21 A/B + 10 C).
- Owner gates unchanged: api.formatho.com DNS, pricing/limit numbers, Stripe, Workers Paid (plan §9).
