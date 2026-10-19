#!/usr/bin/env bash
#
# The repo's quality gate. One command that proves the tree is green.
#
# The agent-team charter requires a `check` script and blocks a role agent whose
# run leaves it failing, but it is useful on its own: this repo is two
# independent npm projects plus generated artifacts, and before this the full
# gate existed only as a list in CLAUDE.md that had to be remembered.
#
# Deliberately a shell script rather than a root package.json. The repo has two
# separate npm projects on purpose (`.github/dependabot.yml` scans /frontend and
# /infrastructure as distinct ecosystems), and a root manifest would imply a
# workspace that does not exist.
#
#   ./scripts/check.sh           everything
#   ./scripts/check.sh fast      skip the two slowest steps (next build, cdk synth)
#
set -uo pipefail
cd "$(dirname "$0")/.."

FAST="${1:-}"
FAILED=()
PASSED=0

# The two résumé checks need poppler (pdfinfo/pdftotext), which is not present
# on a stock ubuntu-latest runner or on every dev machine. They skip rather than
# fail when it is missing, and ci.yml installs it so the coverage is real there.

step() {
  local name="$1"; shift
  printf '\n\033[1m==> %s\033[0m\n' "$name"
  if "$@"; then
    PASSED=$((PASSED + 1))
    printf '\033[32m    ok\033[0m\n'
  else
    FAILED+=("$name")
    printf '\033[31m    FAILED\033[0m\n'
  fi
}

# ---------------------------------------------------------------- frontend
step "frontend: lint"            bash -c 'cd frontend && npm run --silent lint'
if [ "$FAST" != "fast" ]; then
  # Builds the resume PDF/MD via the prebuild hook, then the static export.
  step "frontend: build"         bash -c 'cd frontend && npm run --silent build >/dev/null'
else
  # Still regenerate the resume so the artifact checks below mean something.
  step "frontend: resume only"   bash -c 'cd frontend && npm run --silent resume >/dev/null'
fi

# ---------------------------------------------------------------- infrastructure
step "infra: typecheck"          bash -c 'cd infrastructure && npm run --silent build'
step "infra: typecheck lambda"   bash -c 'cd infrastructure && npm run --silent typecheck:lambda'
step "infra: stack assertions"   bash -c 'cd infrastructure && npx --no-install jest --silent'
if [ "$FAST" != "fast" ]; then
  # CDK_DEFAULT_ACCOUNT has no default in cdk.json any more (public repo), and
  # bin/infrastructure.ts throws without one. Synth never calls AWS, so a dummy
  # id keeps the gate runnable with no credentials; the cdk CLI overrides it
  # with the real account whenever a session happens to be active.
  step "infra: cdk synth"        bash -c 'cd infrastructure && CDK_DEFAULT_ACCOUNT="${CDK_DEFAULT_ACCOUNT:-000000000000}" npx --no-install cdk synth --all >/dev/null 2>&1'
fi

# ---------------------------------------------------------------- artifacts
# CLAUDE.md treats each of these as a hard requirement, and each has actually
# regressed at least once, so they are checked rather than remembered.

step "resume: exactly 3 pages" bash -c '
  command -v pdfinfo >/dev/null 2>&1 || { echo "    skipped: pdfinfo not installed"; exit 0; }
  n=$(pdfinfo frontend/public/resume.pdf 2>/dev/null | awk "/^Pages/{print \$2}")
  [ "$n" = "3" ] || { echo "    resume.pdf is $n pages, expected 3 (trim resume.md)"; exit 1; }'

step "resume: no em dashes" bash -c '
  command -v pdftotext >/dev/null 2>&1 || { echo "    skipped: pdftotext not installed"; exit 0; }
  n=$(pdftotext frontend/public/resume.pdf - 2>/dev/null | grep -c "—")
  [ "$n" = "0" ] || { echo "    $n em dash(es) in the PDF; house style forbids them"; exit 1; }'

step "resume: published .md is clean" bash -c '
  head -1 frontend/public/resume.md | grep -q "^# " || { echo "    published resume.md does not open on a heading"; exit 1; }
  ! grep -q "<!--" frontend/public/resume.md || { echo "    published resume.md leaks an HTML comment"; exit 1; }'

step "corpus: no unresolved TODO markers" bash -c '
  n=$(grep -c "<!--" knowledge/[0-9]*.md 2>/dev/null | awk -F: "{s+=\$2} END{print s+0}")
  [ "$n" = "0" ] || { echo "    $n HTML comment(s) left in knowledge/ -- git publishes these"; exit 1; }'

step "corpus: retrieval still separates broad from narrow" bash -c '
  cd infrastructure
  cat > .check-retrieval.mjs <<"EOF"
import { build } from "esbuild";
const r = await build({ entryPoints: ["lambda/chat/corpus.ts"], bundle: true,
  write: false, format: "esm", platform: "node", target: "node22",
  loader: { ".md": "text" } });
const m = await import("data:text/javascript;base64," +
  Buffer.from(r.outputFiles[0].text).toString("base64"));
// Broad openers must route to curated highlights; specific terms must resolve.
const broad  = ["what has he shipped on AWS", "what has he built", "is he any good"];
const narrow = ["landing zone", "multi-tenant SaaS", "M-21-31", "Istio"];
let bad = [];
for (const q of broad)  if (!m.isBroadQuery(q)) bad.push(`"${q}" should be BROAD`);
for (const q of narrow) {
  const h = m.searchPassages(q, 1)[0];
  if (!h || h.coverage < m.MIN_COVERAGE) bad.push(`"${q}" should resolve`);
}
if (bad.length) { console.error("    " + bad.join("\n    ")); process.exit(1); }
EOF
  node .check-retrieval.mjs; rc=$?
  rm -f .check-retrieval.mjs
  exit $rc'

step "no customer or colleague names in published prose" bash -c '
  # Names from the private sources file must never reach the repo. Word-boundary
  # matched and case-sensitive, because substrings cause false positives
  # ("Factua" inside "factual", "miax" inside minified CSS).
  hits=$(grep -rlwE "Beachhead|Perfecta|AngloGold|Recruitics|Mindoula|Budderfly|Acordex|Harrity|CalcFocus|EngineersGate|PhaseZero|Vaultry" \
    knowledge/ resume.md frontend/lib/data/ infrastructure/lambda/ 2>/dev/null)
  [ -z "$hits" ] || { echo "    customer/colleague name found in: $hits"; exit 1; }'

# ---------------------------------------------------------------- summary
printf '\n\033[1m%s\033[0m\n' "----------------------------------------"
if [ ${#FAILED[@]} -eq 0 ]; then
  printf '\033[32m%d checks passed%s\033[0m\n' "$PASSED" \
    "$([ "$FAST" = "fast" ] && echo ' (fast mode: next build and cdk synth skipped)' || echo '')"
  exit 0
fi
printf '\033[31m%d passed, %d FAILED:\033[0m\n' "$PASSED" "${#FAILED[@]}"
for f in "${FAILED[@]}"; do printf '  - %s\n' "$f"; done
exit 1
