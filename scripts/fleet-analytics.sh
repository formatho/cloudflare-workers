#!/usr/bin/env bash
# fleet-analytics.sh — server-side traffic measurement for the Formatho worker fleet.
#
# Queries the Cloudflare GraphQL Analytics API for per-worker request counts.
# Adopted 2026-09-25 (DECISIONS.md): fleet measurement is SERVER-SIDE ONLY —
# no client-side tracking on fleet landing pages, ever.
#
# Needs an API token with Account > Analytics > Read (owner gate — none stored yet).
# Usage:
#   scripts/fleet-analytics.sh [--days 7] [--since YYYY-MM-DD] [--until YYYY-MM-DD]
#                              [--json] [--dry-run] [--account <account_id>]
# Env:
#   CF_API_TOKEN or CLOUDFLARE_API_TOKEN   Analytics:Read token (required unless --dry-run)
#   CLOUDFLARE_ACCOUNT_ID                  account tag (else auto-discovered via wrangler)
#   CF_GRAPHQL_URL                         override endpoint (used by offline tests)
#
# Output: per-worker totals (req, avg/day, peak day), zero-invocation cross-check
# against local wrangler.toml names, account-wide free-plan utilization note.
# Exit 0 = report produced; 1 = API/parse error; 2 = missing prerequisites.
set -u
cd "$(dirname "$0")/.."

DAYS=7 SINCE="" UNTIL="" JSON=0 DRY=0 ACCOUNT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --days)   DAYS="${2:?}"; shift 2 ;;
    --since)  SINCE="${2:?}"; shift 2 ;;
    --until)  UNTIL="${2:?}"; shift 2 ;;
    --json)   JSON=1; shift ;;
    --dry-run) DRY=1; shift ;;
    --account) ACCOUNT="${2:?}"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

TOKEN="${CF_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"
GRAPHQL_URL="${CF_GRAPHQL_URL:-https://api.cloudflare.com/client/v4/graphql}"

# --- account id: env > flag > wrangler whoami --------------------------------
if [ -z "$ACCOUNT" ]; then
  ACCOUNT="${CLOUDFLARE_ACCOUNT_ID:-}"
fi
if [ -z "$ACCOUNT" ]; then
  ACCOUNT=$(npx wrangler whoami 2>/dev/null | grep -oE '[0-9a-f]{32}' | head -1)
fi
if [ -z "$ACCOUNT" ] && [ "$DRY" -eq 0 ]; then
  echo "ERROR: no Cloudflare account id found (set CLOUDFLARE_ACCOUNT_ID or pass --account)." >&2
  exit 2
fi
[ -z "$ACCOUNT" ] && ACCOUNT="UNRESOLVED"

# --- date range (UTC) ---------------------------------------------------------
RANGE=$(python3 - "$SINCE" "$UNTIL" "$DAYS" <<'PY'
import sys, datetime
since, until, days = sys.argv[1], sys.argv[2], int(sys.argv[3])
end = datetime.date.fromisoformat(until) if until else datetime.datetime.now(datetime.timezone.utc).date()
start = datetime.date.fromisoformat(since) if since else end - datetime.timedelta(days=days - 1)
if start > end:
    sys.exit("start date is after end date")
print(start.isoformat(), end.isoformat())
PY
) || exit 2
START=${RANGE%% *}; END=${RANGE##* }

# --- GraphQL payloads (primary + legacy fallback) ------------------------------
QUERY_PRIMARY='query($accountTag: String!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      accountWorkersInvocationsAdaptiveGroups(
        limit: 10000
        filter: {date_geq: $start, date_leq: $end}
        orderBy: [sum_requests_DESC]
      ) {
        sum { requests }
        dimensions { date scriptName }
      }
    }
  }
}'

QUERY_LEGACY='query($accountTag: String!, $start: Time!, $end: Time!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      workersInvocationsAdaptive(
        limit: 10000
        filter: {datetime_geq: $start, datetime_leq: $end}
      ) {
        sum { requests }
        dimensions { scriptName datetime }
      }
    }
  }
}'

if [ "$DRY" -eq 1 ]; then
  echo "# dry-run — endpoint: $GRAPHQL_URL"
  echo "# variables: accountTag=$ACCOUNT start=$START end=$END"
  echo "$QUERY_PRIMARY"
  exit 0
fi

if [ -z "$TOKEN" ]; then
  cat >&2 <<'MSG'
ERROR: no Cloudflare API token. Fleet analytics needs a token with
Account > Analytics > Read (cf. DECISIONS.md 2026-09-25 — server-side only).
Owner action: create token at dash.cloudflare.com/profile/api-tokens
(Account Analytics: Read template), then either
  export CF_API_TOKEN=...        (this shell)
  openclaw secrets               (shared store, preferred)
MSG
  exit 2
fi

# --- call API: primary dataset, fall back to legacy on schema error ------------
call_api() {
  local query="$1"
  python3 - "$query" "$ACCOUNT" "$START" "$END" <<'PY' | curl -sS --max-time 30 -X POST \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      --data-binary @- "$GRAPHQL_URL"
import sys, json
payload = {"query": sys.argv[1], "variables": {
    "accountTag": sys.argv[2], "start": sys.argv[3], "end": sys.argv[4]}}
# legacy dataset takes Time (datetime) bounds
if "workersInvocationsAdaptive(" in sys.argv[1]:
    payload["variables"]["start"] = sys.argv[3] + "T00:00:00Z"
    payload["variables"]["end"] = sys.argv[4] + "T23:59:59Z"
print(json.dumps(payload))
PY
}

RESP=$(call_api "$QUERY_PRIMARY")

# --- parse / fallback / report (python does the heavy lifting) ------------------
REPORT=$(CF_AA_TOKEN="$TOKEN" CF_AA_ACCOUNT="$ACCOUNT" python3 - "$RESP" "$QUERY_LEGACY" "$START" "$END" "$JSON" <<'PY'
import sys, json, subprocess, os

resp = json.loads(sys.argv[1])

def need_fallback(resp):
    errs = resp.get("errors") or []
    for e in errs:
        msg = str(e.get("message", ""))
        if "accountWorkersInvocationsAdaptiveGroups" in msg or "Cannot query field" in msg:
            return True
    return bool(errs) and not resp.get("data")

if need_fallback(resp):
    legacy_q, start, end, want_json = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] == "1"
    # re-run caller's call_api with legacy query via env handshake: simplest is subprocess curl
    token = os.environ["CF_AA_TOKEN"]
    url = os.environ.get("CF_GRAPHQL_URL", "https://api.cloudflare.com/client/v4/graphql")
    variables = {"accountTag": os.environ["CF_AA_ACCOUNT"],
                 "start": start + "T00:00:00Z", "end": end + "T23:59:59Z"}
    payload = {"query": legacy_q, "variables": variables}
    out = subprocess.run(["curl", "-sS", "--max-time", "30", "-X", "POST",
                          "-H", f"Authorization: Bearer {token}",
                          "-H", "Content-Type: application/json",
                          "--data-binary", json.dumps(payload), url],
                         capture_output=True, text=True)
    print(f"# primary dataset rejected — retried legacy workersInvocationsAdaptive", file=sys.stderr)
    resp = json.loads(out.stdout)

if resp.get("errors") and not resp.get("data"):
    print("GraphQL errors: " + json.dumps(resp["errors"]), file=sys.stderr)
    sys.exit(1)

try:
    accounts = resp["data"]["viewer"]["accounts"]
    groups = (accounts[0].get("accountWorkersInvocationsAdaptiveGroups")
              or accounts[0].get("workersInvocationsAdaptive") or [])
except (KeyError, IndexError, TypeError):
    print("Unexpected response shape: " + json.dumps(resp)[:500], file=sys.stderr)
    sys.exit(1)

per_worker = {}   # name -> {"total": n, "days": {date: n}}
for g in groups:
    dims = g.get("dimensions", {})
    name = dims.get("scriptName") or "(unknown)"
    date = str(dims.get("date") or dims.get("datetime", ""))[:10]
    reqs = int(g.get("sum", {}).get("requests", 0))
    w = per_worker.setdefault(name, {"total": 0, "days": {}})
    w["total"] += reqs
    w["days"][date] = w["days"].get(date, 0) + reqs

start, end, want_json = sys.argv[3], sys.argv[4], sys.argv[5] == "1"
ndays = ( __import__("datetime").date.fromisoformat(end)
          - __import__("datetime").date.fromisoformat(start) ).days + 1

# cross-check against local fleet (wrangler.toml names)
local_names = set()
for line in subprocess.run(["grep", "-rh", "^name", ".", "--include=wrangler.toml"],
                           capture_output=True, text=True).stdout.splitlines():
    if "=" in line:
        local_names.add(line.split("=", 1)[1].strip().strip('"'))

if want_json:
    print(json.dumps({"range": {"start": start, "end": end, "days": ndays},
                      "workers": {k: {"total": v["total"], "avg_per_day": round(v["total"]/ndays, 1),
                                      "peak_day": max(v["days"], key=v["days"].get) if v["days"] else None,
                                      "days": dict(sorted(v["days"].items()))}
                                  for k, v in sorted(per_worker.items(), key=lambda kv: -kv[1]["total"])},
                      "no_invocations_recorded": sorted(local_names - set(per_worker))}, indent=2))
    sys.exit(0)

print(f"Fleet analytics {start} .. {end} ({ndays}d) — {len(per_worker)} workers w/ traffic")
print(f"{'requests':>9}  {'avg/day':>9}  worker")
for name, v in sorted(per_worker.items(), key=lambda kv: -kv[1]["total"]):
    print(f"{v['total']:>9}  {v['total']/ndays:>9.1f}  {name}")
peak = max((v["total"] for v in per_worker.values()), default=0)
grand = sum(v["total"] for v in per_worker.values())
print(f"{'':>9}  {'':>9}  total: {grand} ({grand/ndays:.0f}/day; free-plan cap 100k/day account-wide)")
quiet = sorted(local_names - set(per_worker))
if quiet:
    print(f"no invocations recorded ({len(quiet)}): {', '.join(quiet)}")
PY
)
STATUS=$?
echo "$REPORT"
exit $STATUS
