#!/bin/bash
# verify-llms.sh — confirm /llms.txt is live (200, text/plain, correct first line) on all 39 fleet workers.
cd "$(dirname "$0")/.."
pass=0; fail=0
for d in */; do
  d=${d%/}
  [ -f "$d/src/index.js" ] || continue
  grep -q "pathname === '/llms.txt'" "$d/src/index.js" || continue
  name=$(sed -n 's/^name[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$d/wrangler.toml" | head -1)
  if [ -z "$name" ]; then fail=$((fail+1)); echo "FAIL $d — no name in wrangler.toml"; continue; fi
  url="https://${name}.filesformatho.workers.dev/llms.txt"
  out=$(curl -s --max-time 20 -o /tmp/llms-body -w "%{http_code} %{content_type}" "$url")
  first=$(head -1 /tmp/llms-body)
  if [[ "$out" == "200 text/plain"* && "$first" == "# "* ]]; then
    pass=$((pass+1)); echo "PASS $name"
  else
    fail=$((fail+1)); echo "FAIL $name — $out — first:'$first'"
  fi
done
echo "RESULT: $pass pass, $fail fail"
[ "$fail" -eq 0 ]
