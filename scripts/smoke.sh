#!/usr/bin/env bash
#
# Smoke tests against a deployed stage. The unit tests prove the code is right;
# this proves the deployment is.
#
#   ./scripts/smoke.sh                        # prod
#   ./scripts/smoke.sh https://dev.michaelgroff.info
#
# Every check here corresponds to something that has actually broken, or that
# fails silently if it breaks. In particular:
#
#  - A wrong Plausible script filename returns the site's own /404.html with a
#    200, because `errorResponses` is distribution-wide. The dashboard then
#    reads "no traffic yet" and nothing looks wrong.
#  - `CHAT_ENABLED` is environment-scoped, so a green deploy of the code is no
#    evidence the chat section rendered.
#  - An OAC signature failure on /api/chat returns 403, which the same
#    distribution-wide mapping rewrites to HTML.
#  - The resume has silently become four pages twice.
#
# Exits non-zero on any failure and prints every one rather than stopping at
# the first, same contract as check.sh.
set -uo pipefail

BASE="${1:-https://michaelgroff.info}"
FAILED=()
PASSED=0

pass() { PASSED=$((PASSED + 1)); printf '  \033[32mok\033[0m    %s\n' "$1"; }
fail() { FAILED+=("$1"); printf '  \033[31mFAIL\033[0m  %s\n' "$1"; [ -n "${2:-}" ] && printf '        %s\n' "$2"; }
skip() { printf '  \033[33mskip\033[0m  %s (%s)\n' "$1" "$2"; }

printf '\n\033[1mSmoke: %s\033[0m\n\n' "$BASE"

# ---------------------------------------------------------------- pages
check_status() { # path, expected status, expected content-type fragment, label
  local out code ctype
  out=$(curl -sS -o /dev/null -w '%{http_code} %{content_type}' "$BASE$1" 2>&1) || {
    fail "$4" "curl failed: $out"; return; }
  code=${out%% *}; ctype=${out#* }
  if [ "$code" != "$2" ]; then fail "$4" "status $code, expected $2"; return; fi
  case "$ctype" in *"$3"*) pass "$4" ;; *) fail "$4" "content-type '$ctype' lacks '$3'" ;; esac
}

check_status "/"                     200 "text/html"        "homepage serves HTML"
check_status "/resume.pdf"           200 "application/pdf"   "resume.pdf serves a PDF"
check_status "/resume.md"            200 "text"              "resume.md serves text"
check_status "/michael-groff.vcf"    200 "vcard"             "vCard serves text/vcard"
check_status "/robots.txt"           200 "text"              "robots.txt present"
check_status "/sitemap.xml"          200 "xml"               "sitemap.xml present"
check_status "/legacy/"              200 "text/html"         "2015 WordPress archive still served"
check_status "/blog/"                200 "text/html"         "blog archive still served"

# A missing page must be the site's 404, not a CloudFront error page.
body=$(curl -sS "$BASE/definitely-not-a-real-page-$$" 2>&1)
if printf '%s' "$body" | grep -qi "michael groff"; then
  pass "unknown path serves the site's own 404"
else
  fail "unknown path serves the site's own 404" "got something else"
fi

# ---------------------------------------------------------------- resume artifact
if command -v pdfinfo >/dev/null 2>&1; then
  tmp=$(mktemp); curl -sS -o "$tmp" "$BASE/resume.pdf"
  pages=$(pdfinfo "$tmp" 2>/dev/null | awk '/^Pages/{print $2}')
  [ "$pages" = "3" ] && pass "resume.pdf is 3 pages" || fail "resume.pdf is 3 pages" "got ${pages:-unknown}"
  if command -v pdftotext >/dev/null 2>&1; then
    n=$(pdftotext "$tmp" - 2>/dev/null | grep -c "—")
    [ "$n" = "0" ] && pass "resume.pdf has no em dashes" || fail "resume.pdf has no em dashes" "$n found"
  fi
  rm -f "$tmp"
else
  skip "resume.pdf page count" "pdfinfo not installed"
fi

# The published markdown must not leak the source's editor comments.
md=$(curl -sS "$BASE/resume.md")
printf '%s' "$md" | grep -q "<!--" \
  && fail "published resume.md has no HTML comments" "a comment leaked" \
  || pass "published resume.md has no HTML comments"

# ---------------------------------------------------------------- analytics
html=$(curl -sS "$BASE/")
pa_src=$(printf '%s' "$html" | grep -oE '/js/pa-[A-Za-z0-9]+\.js' | head -1)
if [ -z "$pa_src" ]; then
  skip "Plausible script" "no /js/pa-*.js in the HTML (PLAUSIBLE_SRC unset?)"
else
  # The trap: a wrong filename returns the site's own 404.html with a 200.
  ctype=$(curl -sS -o /dev/null -w '%{content_type}' "$BASE$pa_src")
  case "$ctype" in
    *javascript*) pass "Plausible script serves JavaScript, not the 404 page" ;;
    *) fail "Plausible script serves JavaScript, not the 404 page" "content-type '$ctype' -- filename is probably wrong" ;;
  esac

  # The per-site script does not auto-start without this inline config.
  printf '%s' "$html" | grep -q "window.plausible" \
    && pass "Plausible init script is present" \
    || fail "Plausible init script is present" "without it the script tracks nothing, silently"

  # And it must be the callable queue shim, or custom events are dropped.
  printf '%s' "$html" | grep -q "window.plausible=function" \
    && pass "Plausible init is the callable queue shim" \
    || fail "Plausible init is the callable queue shim" "an object form drops chat events fired before load"

  code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE/api/event" \
    -H 'content-type: application/json' \
    -d '{"n":"pageview","u":"'"$BASE"'/","d":"smoke.invalid"}')
  [ "$code" = "202" ] && pass "/api/event proxy accepts events (202)" \
    || fail "/api/event proxy accepts events (202)" "got $code"
fi

# ---------------------------------------------------------------- chat
if printf '%s' "$html" | grep -q 'id="chat"'; then
  pass "chat section is in the HTML"
  printf '%s' "$html" | grep -q 'Ask the assistant about' \
    && pass "chat launcher is in the HTML" \
    || fail "chat launcher is in the HTML" "widget missing while the section renders"

  # Exercise the OAC-signed path WITHOUT spending a Bedrock turn: a correctly
  # hashed but invalid body must come back as a JSON error event, not HTML. If
  # this returns HTML the signature or the origin policy is wrong and the
  # Lambda was never invoked.
  if command -v shasum >/dev/null 2>&1; then
    body='{"conversationId":"smoke","messages":[]}'
    hash=$(printf '%s' "$body" | shasum -a 256 | cut -d' ' -f1)
    resp=$(curl -sS -X POST "$BASE/api/chat" \
      -H 'content-type: application/json' \
      -H "x-amz-content-sha256: $hash" \
      -d "$body" 2>&1)
    if printf '%s' "$resp" | grep -qi "<!DOCTYPE\|<html"; then
      fail "/api/chat is reachable through OAC" "returned HTML: signature or origin request policy is wrong"
    elif printf '%s' "$resp" | grep -q '"type":"error"'; then
      pass "/api/chat rejects a bad request as JSON, not HTML"
    else
      fail "/api/chat rejects a bad request as JSON, not HTML" "unexpected: $(printf '%s' "$resp" | head -c 120)"
    fi
  else
    skip "/api/chat OAC path" "shasum not available"
  fi
else
  skip "chat checks" "no #chat in the HTML (CHAT_ENABLED unset for this stage)"
fi

# ---------------------------------------------------------------- headers
hdrs=$(curl -sSI "$BASE/")
for h in "strict-transport-security" "x-content-type-options" "referrer-policy"; do
  printf '%s' "$hdrs" | grep -qi "^$h:" \
    && pass "response header $h" \
    || fail "response header $h" "missing from the response headers policy"
done

# HTML must revalidate; hashed assets must be immutable. Collapsing the two
# sync passes in deploy-site.yml breaks one or the other.
cc=$(printf '%s' "$hdrs" | grep -i "^cache-control:" | tr -d '\r')
case "$cc" in
  *max-age=0*|*must-revalidate*) pass "HTML is set to revalidate" ;;
  *) fail "HTML is set to revalidate" "cache-control: ${cc:-none}" ;;
esac

asset=$(printf '%s' "$html" | grep -oE '/_next/static/[^"]+\.js' | head -1)
if [ -n "$asset" ]; then
  acc=$(curl -sSI "$BASE$asset" | grep -i "^cache-control:" | tr -d '\r')
  case "$acc" in
    *immutable*) pass "hashed assets are immutable" ;;
    *) fail "hashed assets are immutable" "cache-control: ${acc:-none}" ;;
  esac
fi

# ---------------------------------------------------------------- mobile layout
# Needs a real browser, so it lives in its own script and skips when no driver
# is installed. Three defects survived 218 unit tests and every check above,
# because all three were computed-layout problems invisible without rendering:
# a table column clipped unreachably, dates overflowing their box, and 36px tap
# targets. See scripts/mobile-check.mjs.
if command -v node >/dev/null 2>&1; then
  printf '\n'
  if node scripts/mobile-check.mjs "$BASE"; then
    PASSED=$((PASSED + 1))
  else
    FAILED+=("mobile layout checks")
  fi
else
  skip "mobile layout checks" "node not available"
fi

# ---------------------------------------------------------------- summary
printf '\n\033[1m%s\033[0m\n' "----------------------------------------"
if [ ${#FAILED[@]} -eq 0 ]; then
  printf '\033[32m%d checks passed against %s\033[0m\n' "$PASSED" "$BASE"
  exit 0
fi
printf '\033[31m%d passed, %d FAILED against %s:\033[0m\n' "$PASSED" "${#FAILED[@]}" "$BASE"
for f in "${FAILED[@]}"; do printf '  - %s\n' "$f"; done
exit 1
