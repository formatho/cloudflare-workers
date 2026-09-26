#!/usr/bin/env bash
# fleet-health.sh — live health + drift check for the Formatho worker fleet.
#
# Source of truth for "advertised fleet": worker URLs listed in tools-index/src/index.js.
# Live checks per worker: GET / (200 + <title>), GET /sitemap.xml (200), GET /api (< 500).
# Drift checks: local wrangler.toml worker names vs advertised URLs (both directions).
# Exit 0 = all green; exit 1 = any live failure or drift mismatch.
#
# Usage: scripts/fleet-health.sh [timeout_secs_per_request]
set -u
cd "$(dirname "$0")/.."

T="${1:-15}"
INDEX_SRC="tools-index/src/index.js"
BASE_RE='https://[a-z0-9-]+\.filesformatho\.workers\.dev'
# Non-tool infra workers that legitimately have no landing page in the index.
INFRA_SKIP='^(formatho-tools|formatho-edge-cache|formatho-embed|formatho-geo-files|formatho-og)$'

fail=0

advertised=()
while IFS= read -r u; do advertised+=("$u"); done < <(grep -oE "$BASE_RE" "$INDEX_SRC" | sort -u)
echo "Advertised workers in tools-index: ${#advertised[@]}"
echo "---"

check_host() {
  local base="$1" t="$2" row
  local landing_code landing_title sitemap_code api_code
  landing_code=$(curl -s --max-time "$t" -o /tmp/fh-body.$$ -w '%{http_code}' "$base/")
  landing_title=$(grep -c '<title>' /tmp/fh-body.$$ 2>/dev/null || true)
  sitemap_code=$(curl -s --max-time "$t" -o /dev/null -w '%{http_code}' "$base/sitemap.xml")
  api_code=$(curl -s --max-time "$t" -o /dev/null -w '%{http_code}' "$base/api")
  rm -f /tmp/fh-body.$$
  local ok=1
  [ "$landing_code" = "200" ] && [ "$landing_title" -ge 1 ] || ok=0
  [ "$sitemap_code" = "200" ] || ok=0
  [ "$api_code" -lt 500 ] 2>/dev/null || ok=0
  if [ "$ok" = "1" ]; then
    row="OK    $base  (landing ${landing_code}/title, sitemap ${sitemap_code}, api ${api_code})"
  else
    row="FAIL  $base  (landing ${landing_code}/title:${landing_title}, sitemap ${sitemap_code}, api ${api_code})"
  fi
  echo "$row"
}
export -f check_host

printf '%s\n' "${advertised[@]}" | xargs -P 10 -I{} bash -c 'check_host "$@"' _ {} "$T" | sort | tee /tmp/fh-results.$$
grep -q '^FAIL' /tmp/fh-results.$$ && fail=1
rm -f /tmp/fh-results.$$

echo "--- drift (local wrangler.toml names vs advertised index) ---"
local_names=()
while IFS= read -r n; do local_names+=("$n"); done < <(grep -h '^name' */wrangler.toml | sed 's/.*= *"\(.*\)"/\1/' | grep -- '-formatho$' | grep -Ev "$INFRA_SKIP" | sort -u)
for n in "${local_names[@]}"; do
  echo "${advertised[@]}" | grep -q "https://$n.filesformatho.workers.dev" || { echo "MISSING-FROM-INDEX: $n"; fail=1; }
done
for u in "${advertised[@]}"; do
  n="${u#https://}"; n="${n%.filesformatho.workers.dev}"
  echo "$n" | grep -Eq "$INFRA_SKIP" && continue  # index itself is legitimately self-advertised
  printf '%s\n' "${local_names[@]}" | grep -qx "$n" || { echo "INDEXED-BUT-NO-LOCAL-DIR: $n"; fail=1; }
done
echo "local tool workers: ${#local_names[@]}"

if [ "$fail" = "0" ]; then echo "RESULT: ALL GREEN"; exit 0; else echo "RESULT: FAILURES/DRIFT FOUND"; exit 1; fi
