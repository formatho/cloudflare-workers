#!/usr/bin/env bash
# fleet-health.sh — live health + drift check for the Formatho worker fleet.
#
# Source of truth for "advertised fleet": worker URLs listed in tools-index/src/index.js.
# Live checks per worker: GET / (200 + <title>), GET /sitemap.xml (200), GET /api (< 500),
#   landing carries >=1 <script type="application/ld+json"> block that parses as JSON
#   (guards rich-results eligibility; the 09-30 fleet-wide JSON-LD fix made standing here),
#   and every formatho.com backlink on the landing page resolves 200 after redirects,
#   probed exactly as published (no invented trailing slash) with one retry for origin
#   transients (guards the 2026-09-26 drift class: stale root-slug URLs 404ing after
#   the /tools/* move). Retry history is printed after the results table.
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
RETRY_LOG="/tmp/fh-retries.$$"
export RETRY_LOG
: > "$RETRY_LOG"

advertised=()
while IFS= read -r u; do advertised+=("$u"); done < <(grep -oE "$BASE_RE" "$INDEX_SRC" | sort -u)
echo "Advertised workers in tools-index: ${#advertised[@]}"
echo "---"

check_host() {
  local base="$1" t="$2" row
  local landing_code landing_title sitemap_code api_code ld_ok
  landing_code=$(curl -s --max-time "$t" -o /tmp/fh-body.$$ -w '%{http_code}' "$base/")
  landing_title=$(grep -c '<title>' /tmp/fh-body.$$ 2>/dev/null || true)
  sitemap_code=$(curl -s --max-time "$t" -o /dev/null -w '%{http_code}' "$base/sitemap.xml")
  api_code=$(curl -s --max-time "$t" -o /dev/null -w '%{http_code}' "$base/api")
  # Backlink check: landing must link formatho.com and every target must resolve 200.
  local bl bl_total bl_ok bl_detail u code
  bl=$(grep -oE 'https://formatho\.com[/A-Za-z0-9._-]*' /tmp/fh-body.$$ 2>/dev/null | sed -e 's/[.,;]+$//' -e 's#/*$##' | sort -u)
  bl_total=$(printf '%s\n' "$bl" | grep -c . || true)
  bl_ok=0; bl_detail=""
  while IFS= read -r u; do
    [ -z "$u" ] && continue
    # Probe the href exactly as published. Appending '/' forced a 301 hop on every
    # /tools/* link; a slow hop mid-sweep made curl report the stale 301 code —
    # the recurring "first-pass transient FAIL" (10-20, 10-21 PM).
    code=$(curl -s -L --max-time "$t" -o /dev/null -w '%{http_code}' "$u")
    if [ "$code" != "200" ]; then
      sleep 1
      code=$(curl -s -L --max-time "$t" -o /dev/null -w '%{http_code}' "$u")
      [ "$code" = "200" ] && echo "$base $u retry-ok" >> "$RETRY_LOG"
    fi
    if [ "$code" = "200" ]; then bl_ok=$((bl_ok+1)); else bl_detail="${bl_detail} ${u}:${code}"; fi
  done <<< "$bl"
  # JSON-LD check: landing must carry structured data and every block must parse as JSON.
  ld_ok=1
  python3 -c '
import json, re, sys
body = open(sys.argv[1], encoding="utf-8", errors="replace").read()
blocks = re.findall(r"<script type=\"application/ld\+json\">(.*?)</script>", body, re.S)
ok = bool(blocks)
for b in blocks:
    try:
        json.loads(b)
    except Exception:
        ok = False
sys.exit(0 if ok else 1)' /tmp/fh-body.$$ 2>/dev/null || ld_ok=0
  # CRO CTA check: landing must carry the above-the-fold full-tool CTA button (class="cta").
  cta_ok=$(grep -c 'class="cta"' /tmp/fh-body.$$ 2>/dev/null || true)
  # Internal-linking check: landing must carry the related-tools cross-link nav (class="related").
  rel_ok=$(grep -c 'class="related"' /tmp/fh-body.$$ 2>/dev/null || true)
  rm -f /tmp/fh-body.$$
  local ok=1
  [ "$landing_code" = "200" ] && [ "$landing_title" -ge 1 ] || ok=0
  [ "$sitemap_code" = "200" ] || ok=0
  [ "$api_code" -lt 500 ] 2>/dev/null || ok=0
  [ "$ld_ok" = "1" ] || ok=0
  [ "${cta_ok:-0}" -ge 1 ] 2>/dev/null || ok=0
  [ "${rel_ok:-0}" -ge 1 ] 2>/dev/null || ok=0
  [ "${bl_total:-0}" -ge 1 ] && [ "$bl_ok" = "$bl_total" ] || ok=0
  if [ "$ok" = "1" ]; then
    row="OK    $base  (landing ${landing_code}/title, sitemap ${sitemap_code}, api ${api_code}, ld+json ok, cta ok, related ok, backlinks ${bl_ok}/${bl_total})"
  else
    [ "${bl_total:-0}" -ge 1 ] || bl_detail=" no-formatho-backlink"
    [ "$ld_ok" = "1" ] || bl_detail="${bl_detail} ld+json-missing-or-unparseable"
    [ "${cta_ok:-0}" -ge 1 ] 2>/dev/null || bl_detail="${bl_detail} cta-missing"
    [ "${rel_ok:-0}" -ge 1 ] 2>/dev/null || bl_detail="${bl_detail} related-missing"
    row="FAIL  $base  (landing ${landing_code}/title:${landing_title}, sitemap ${sitemap_code}, api ${api_code}, ld+json:${ld_ok}, cta:${cta_ok:-0}, related:${rel_ok:-0}, backlinks ${bl_ok}/${bl_total}:${bl_detail})"
  fi
  echo "$row"
}
export -f check_host

printf '%s\n' "${advertised[@]}" | xargs -P 10 -I{} bash -c 'check_host "$@"' _ {} "$T" | sort | tee /tmp/fh-results.$$
grep -q '^FAIL' /tmp/fh-results.$$ && fail=1
rm -f /tmp/fh-results.$$
if [ -s "$RETRY_LOG" ]; then
  echo "--- backlink retries (transient, recovered) ---"
  cat "$RETRY_LOG"
fi
rm -f "$RETRY_LOG"

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
