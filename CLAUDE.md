# CV site — ops notes for future Claude sessions

Static personal CV at **michaelgroff.info**. Shipped April 2026; mature
and low-touch. Most future sessions here will be small content updates
(new role, new cert, copy edit) — not architecture work. The big
WordPress → Next.js refactor and apex-migration work is already done.

---

## Repo map for updates

| To change | Edit |
|---|---|
| New job / promotion | `frontend/lib/data/jobs.ts` + `resume.md` |
| New certification | `frontend/lib/data/certifications.ts` + `resume.md` |
| Skills | `frontend/lib/data/skills.ts` |
| Bio / About copy | `frontend/components/AboutMe.tsx` |
| Hero tagline / title | `frontend/components/Hero.tsx` |
| Availability status pill (the "open to…" signal under the headshot) | `frontend/lib/data/status.ts` — flip `ACTIVE_STATUS_ID` to a preset id (`open-to-roles`, `open-conversations`, `open-consulting`, `settled`); add a preset by copying an entry. `Hero.tsx` renders the active one; tone drives color + ping |
| Contact info (phone / email / socials) | `frontend/components/Footer.tsx` **+** `frontend/public/michael-groff.vcf` **+** `resume.md` (all three hold canonical copies) |
| New headshot | Replace `frontend/public/images/profile/michael-groff.jpg` → prebuild regenerates `.webp` |
| Resume bullets / layout | `resume.md` — PDF regenerates on next build |
| What the chat assistant knows | `knowledge/*.md` — plain markdown, no code change needed. A new *file* needs one line in `infrastructure/lambda/chat/knowledge.ts` |
| Chat behaviour / tone / refusals | `infrastructure/lambda/chat/prompt.ts` |
| Chat caps and model | `infrastructure/cdk.json` context (`chatModelId`, `chatDailyUsdCap`, `chatIpTurnsPerHour`, …) |

Parked work and decided-against items live in `BACKLOG.md`.

`resume.md` is the source of truth for the downloadable PDF (auto-built
by `npm run resume`, which runs as a `prebuild` hook).

**Role change applied 2 Oct 2026.** The AllCloud role became *Sr. Solutions
Architect / Manager of Platform Solutions Architects*, effective Oct 2026.
The real title differed from the one staged here in Sep 2026 ("Sr. Cloud
Solutions Architect / Team Lead"), so don't trust a staged future title:
confirm it with the user when it lands.

Two conventions set at the same time, both worth keeping:

- **Duties and ongoing initiatives live on the current role; completed
  achievements stay with the role that earned them.** The Jul–Oct 2026 Team
  Lead entry kept its three closed-out metric bullets (quota attainment,
  pipeline-hygiene audit, time-to-engagement) and gave up its duty bullets
  plus the two initiatives still in flight as of Oct 2026 (the internal AI
  tooling library, and the AWS One OLA certification submitted Sep 2026 and
  still awaiting an AWS decision). Repeating any of them cost a whole page.
  Metrics move *with* their bullet; don't strand them in a closed role.
- **The resume is a full 3 pages.** Adding a role without trimming pushes it
  to 4, with a stranded `CERTIFICATIONS` heading. After any Experience edit,
  run `npm run resume && pdfinfo frontend/public/resume.pdf | grep Pages`.
  `h2 { break-after: avoid-page }` in `build-resume.mjs` stops a section
  heading being orphaned at a page foot, but it can't invent space.

**LinkedIn is the source of truth for dates and titles.** Sep 2026: the site and
LinkedIn disagreed by a full *year* on Innovative and Vivsoft, and the site was
missing an entire Innovative role. Resolved in LinkedIn's favor. If they ever
diverge again, fix the site — a resume that contradicts a live public profile
(or an employment-verification record) is the expensive kind of wrong.

Two deliberate exceptions, both because the external title reads better than the
internal one: AllCloud roles carry **Sr.** though HR called them "Solutions
Architect II", and Accenture is **Cloud Migration Architect** rather than "Cloud
Tech Architect Delivery Specialist". Innovative uses LinkedIn's exact titles,
because the Mar 2023 step to Sr. is a real promotion worth showing.

**The AllCloud / Vivsoft overlap (May–Dec 2024) is intentional and accurate** —
both roles were genuinely held at once. Don't "fix" it by truncating Vivsoft:
that would contradict both LinkedIn and Vivsoft's employment record.

**AllCloud is one card holding a `roles` array**, not one card per title, so it
reads as growth at a single company. A `Job` sets *either* `roles` (a promotion
path, newest first) *or* `responsibilities` (a single title) — `Experience.tsx`
branches on which is present. The card's `startDate`/`endDate` span the whole
tenure while each role carries its own dates. `Experience.tsx` also expands
`jobs[0]` by default, so the newest role stays open without a hardcoded id.

---

## Deploy model

- **Path-filtered GitHub Actions workflows:**
  - `frontend/**` → `Deploy site`
  - `infrastructure/**` → `Deploy infrastructure`
  - neither fires for README / docs / `resume.md` alone — site workflow
    intentionally also watches `resume.md`? (no — it doesn't; if you
    need a resume-only redeploy, touch any frontend file or dispatch the
    workflow manually)
- **Branch → stage:**
  - `dev` → `dev.michaelgroff.info` (dev bucket, dev distribution)
  - `main` → `michaelgroff.info` (prod bucket, prod distribution)
- **Standard flow:** commit + push `dev` → verify on `dev.michaelgroff.info`
  → `git checkout main && git merge dev --ff-only && git push origin main`.
- **Check `main` is actually an ancestor of `dev` before promoting:**
  `git merge-base --is-ancestor origin/main origin/dev`. It periodically is
  not, and the `--ff-only` promote then fails. See *main and dev drift apart*
  under Dependency management for why and how to repair it.
- **`cv.michaelgroff.info`** is not a CloudFront alias — it's a CloudFlare
  Redirect Rule that 301s to apex. Don't re-add it as a CDK alias.
- **`www.michaelgroff.info`** is NXDOMAIN by choice. If a user ever
  asks to wire it up, same pattern as cv.: add a CloudFlare CNAME + a
  Redirect Rule, don't touch CDK.

---

## Analytics

Two live systems (Plausible and CloudFlare) plus one removed. None was
documented before Aug 2026.

### 1. CloudFlare Web Analytics (visitor counts) — since April 2026

Kept as a cross-check against Plausible, not as the primary. **Expect Plausible
to report higher numbers**, because it's proxied first-party while
`static.cloudflareinsights.com` is itself commonly blocked. A divergence is
the proxy working, not a bug. Safe to retire by clearing
`CLOUDFLARE_ANALYTICS_TOKEN` in both environments once Plausible is trusted.

Beacon injected in `frontend/app/layout.tsx`, gated on
`NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN`; empty value disables the tag.

**The token is a GitHub _environment_-scoped variable, not a repo variable** —
`gh variable list` shows nothing, which makes it look unconfigured. It isn't:

```
gh api repos/:owner/:repo/environments/production/variables
gh api repos/:owner/:repo/environments/dev/variables
```

Separate token per stage, so dev traffic doesn't pollute prod numbers. View at
CloudFlare → Analytics & Logs → Web Analytics (two sites listed).

Cookieless and anonymous by design: pageviews, referrers, countries, paths — no
visitor identity. Being a JS beacon, ad blockers suppress it, so it undercounts.

### 2. Plausible Analytics (primary, paid) — since Oct 2026

Script injected in `frontend/app/layout.tsx`, gated on
`NEXT_PUBLIC_PLAUSIBLE_SRC` (empty value disables the tag). Two
environment-scoped GitHub variables, same per-stage pattern as the CloudFlare
token above, so dev traffic doesn't pollute prod numbers:

| Variable | Value |
|---|---|
| `PLAUSIBLE_SRC` | `/js/pa-XXXXX.js` — first-party, proxied |
| `PLAUSIBLE_DOMAIN` | `michaelgroff.info` / `dev.michaelgroff.info` |

**The script filename is per-site.** Plausible issues `/js/pa-XXXXX.js` rather
than a fixed `script.js`, which is why the URL is a variable instead of a
constant, and why the CloudFront behaviour is a `/js/*` wildcard.

**The per-site script does NOT auto-start, and this is silent.** Its bootstrap
is `window.plausible = window.plausible || {}; plausible.o && S(plausible.o)`,
so unless `window.plausible.o` already exists when it loads, it defines `init`
and tracks nothing: no console warning, no failed request, just an empty
dashboard that reads as "no traffic yet". `layout.tsx` therefore emits an
inline config script in `<head>` ahead of it. **Don't remove it**, and don't
assume a 200 on the script means tracking works.

**It also reads no `data-*` attributes at all** (verified by reading the
delivered file, not the docs: `grep -c 'data-' pa-XXXXX.js` is 0). The domain
is baked in and cannot be overridden, because the script applies it last:
`Object.assign(defaults, opts, { domain })`. `data-domain` is still emitted
when `PLAUSIBLE_DOMAIN` is set, purely so the classic `script.js` snippet keeps
working if you ever switch back; the per-site script ignores it.

**The default endpoint is absolute** (`https://plausible.io/api/event`), so a
proxied *script* still sends its *events* third-party unless you override it.
`layout.tsx` derives the endpoint from `PLAUSIBLE_SRC`: a relative src gets
`/api/event`, an absolute one gets the plausible.io URL. Proxying the script
alone leaves the measurement blockable and defeats the point.

**It is proxied first-party through CloudFront** — the `/js/*` and `/api/event`
behaviours in `cv-website-stack.ts`. Two reasons, both load-bearing:

1. `plausible.io` sits on common blocklists; a first-party path does not.
   Recovering those blocked measurements is the entire point of the proxy.
2. Plausible needs the real visitor IP in `X-Forwarded-For` or its bot filter
   **drops the event silently** — no error, no data, nothing in the dashboard.
   CloudFront appends the viewer IP on every custom-origin request, so this
   works with no extra configuration. Don't restructure the origin request
   policy in a way that disturbs it.

Proxying also makes the event POST same-origin, so there's no CORS preflight.
Cookies and query strings are deliberately not forwarded (Plausible is
cookieless and this is a third-party origin); `User-Agent` is allow-listed
because Plausible derives the visitor id from its raw value, and
`Content-Type` because the script POSTs JSON.

**Debugging trap:** `errorResponses` is distribution-wide, so a 404 from
plausible.io (usually a mistyped script filename) comes back as this site's
`/404.html`. If `curl -I https://michaelgroff.info/js/pa-XXXXX.js` returns
HTML, the filename is wrong — CloudFront is not broken.

Plausible discards events for domains not registered in the account, so the
dev stage can verify the plumbing (200 on the script, 202 on the event) even
without a registered dev site.

### 3. Company-level visitor identification — TRIED AND REMOVED (Aug 2026)

**Don't rebuild this.** A full Glue + Athena pipeline over the CloudFront
access logs (joined to the free IPinfo Lite IP→org database) was built,
deployed to dev *and* prod, and measured against 90 days of real traffic. It
worked flawlessly and produced nothing useful. It was removed in the same
session. The evidence, so nobody spends the day again:

- **93.8% of IPv4 visitor IPs resolved** to an organization — the join,
  CIDR math and enrichment were all correct. The problem was never accuracy.
- **~100% of resolved orgs were hosting/cloud infrastructure, not employers.**
  Top orgs by page views were `vdsina.ru` (5,858), Tencent across 8 regions,
  `dmzhost.co`, Leaseweb, Contabo, FranTech, ColoCrossing. By distinct IPs:
  Amazon 3,076, Tencent 587, Google 335. **Zero real corporate visitors** in
  64,085 filtered page views.
- **Three noise filters were tested and all failed**: expanded ASN exclusion
  lists, `as_name`/`as_domain` keyword matching, and requiring asset fetches
  (`_next/static`, css/js/woff). Modern scanners render pages fully, so they
  fetch assets and pass browser heuristics.

Two root causes, neither fixable by tuning:

1. **CloudFront logs everything; CloudFlare doesn't.** The ~87 daily uniques
   CloudFlare reports are already bot-filtered. Raw CloudFront logs are
   dominated by internet-wide scanning.
2. **Real humans carry no employer signal.** They arrive on residential,
   mobile and IPv6 addresses. A recruiter reading this CV from home resolves
   to Comcast, not their firm. IPv6 can't be resolved at all — Athena has no
   `IPPREFIX` type (`CAST(... AS IPPREFIX)` fails), and 6% of prod visitor
   IPs were IPv6.

If the "which companies read my CV" question ever comes back, reverse-IP is
not the answer — person-level identity-graph tools (RB2B ~$79/mo and
similar) are, because they resolve residential IPs. That reopens both the
cost and a privacy-policy obligation (person-level data is personal data
under GDPR/CCPA; this site has no privacy policy today).

Traces left behind, all harmless and deliberately kept:

- The LZA `kill-switch.json` SCP was split so `glue:*` is no longer blanket
  denied — `DenyGlueBillableCompute` denies jobs/crawlers/dev-endpoints while
  the free Data Catalog is allowed. Better hygiene than the old blanket rule;
  revert only if you want Glue fully closed again.
- The log bucket's expiry rule is prefix-scoped to `cloudfront-logs/` rather
  than bucket-wide.

## The chat assistant (`/api/chat`)

Added Oct 2026. An agentic Bedrock loop answering questions about the CV, at
`/api/chat` on the same CloudFront distribution. Frontend `Chat.tsx`, backend
`infrastructure/lib/chat-api.ts` + `infrastructure/lambda/chat/`.

**Two independent kill switches.** `chatModelId: ""` in `cdk.json` context tears
the backend down entirely (the construct becomes a no-op, so a fork without the
SCP carve-out can still deploy the site). The environment variable
`CHAT_ENABLED`, unset, hides the whole section from the built HTML — no `#chat`
element, no nav entry, no reference to `/api/chat`. They are deliberately
separate: the UI can ship to dev before the backend, or the backend can be
removed without a site rebuild.

### The SCP carve-out the function depends on

LZA's `DenyLambdaWithoutVPC` was narrowed (grofflabs-lza#15) from
`Resource: "*"` to `NotResource: ["arn:aws:lambda:*:*:function:cv-chat-*"]`. So:

- **The function name prefix `cv-chat-` is load-bearing.** Rename it and the
  deploy is denied.
- **CDK custom-resource Lambdas are still denied**, because their generated
  names do not match. Never use `logRetention` (pass an explicit `LogGroup`),
  `autoDeleteObjects`, or `BucketDeployment`. A jest assertion fails the build
  if any `Custom::` resource appears, turning a deploy-time denial into a
  synth-time failure.

To check whether the carve-out is live **without creating anything**, exploit
the fact that AWS authorises before validating parameters — a deliberately bogus
role ARN distinguishes the two outcomes:

```
# matches the carve-out -> InvalidParameterValueException (SCP allowed it)
aws lambda create-function --function-name cv-chat-probe --runtime nodejs22.x \
  --handler index.handler --role arn:aws:iam::ACCT:role/does-not-exist \
  --zip-file fileb:///tmp/probe.zip --region us-east-1

# does not match -> AccessDeniedException ... explicit deny in a service control policy
aws lambda create-function --function-name zz-probe ...   # same args otherwise
```

### Three tags, two policies, and one shot to get them right

- **The execution role needs the *principal* tag `LZA:EXC:NET=true`** for SCP
  `DenyAccessFromUntrustedNetworks` (`Action:"*" Resource:"*"`).
- **The DynamoDB table and the log group each need the same tag as a *resource*
  tag**, for the Root-attached RCP `DenyResourceAccessFromUntrustedNetworks`,
  whose action list includes `dynamodb:*` and `logs:*`. Tagging the role does
  nothing for the RCP. Without these the Lambda `AccessDeniedException`s on its
  first `UpdateItem` — at runtime, not at deploy.
- **All three must be created with their tags.** SCP
  `DenyUnauthorizedLZATagModification` denies `dynamodb:TagResource` and
  `iam:TagRole` for `LZA:*` keys, while `CreateTable`/`CreateRole`/`CreateFunction`
  are not in that list. Adding the tag in a later stack update calls
  `TagResource` and is denied.

### `reservedConcurrentExecutions` cannot be set here

This account's Lambda concurrency quota is **10**, not the default 1000, and AWS
requires 10 to remain *unreserved*. Any reservation fails with *"decreases
account's UnreservedConcurrentExecution below its minimum value of [10]"*.

The quota is the cap instead. The pool is shared with ~15 `AWSAccelerator-*`
custom-resource Lambdas, which are idle outside pipeline runs, so a chat flood
concurrent with an LZA deployment could throttle LZA's custom resources and
vice versa. Acceptable at this traffic.

**If the quota is ever raised, the implicit flood cap disappears** and
`reservedConcurrentExecutions` must be set explicitly.

### `x-amz-content-sha256`: required from the viewer, forbidden in the policy

A POST through a Lambda Function URL with OAC needs the viewer to send the
SHA-256 of the request body in `x-amz-content-sha256`; Lambda rejects unsigned
payloads. `Chat.tsx` computes it with `crypto.subtle`.

**But the header must not be named in the origin request policy.** CloudFront
rejects it outright — *"The parameter Headers contains x-amz-content-sha256
that is not allowed"* — because it manages the header itself. Listing it is a
hard deploy failure, not a harmless redundancy. The first attempt rolled back on
exactly this.

Validate a header allow-list in seconds instead of a ten-minute deploy cycle by
creating a throwaway policy against the API:

```
aws cloudfront create-origin-request-policy --origin-request-policy-config '{...}'
# then delete it
```

Also: `aws:PrincipalARN`-style managed policies are wrong here.
`ALL_VIEWER_EXCEPT_HOST_HEADER` forwards `Authorization`, which collides with
the OAC signature. Use a custom allow-list: `content-type` plus
`cloudfront-viewer-address` (CloudFront generates the latter itself and
overwrites any viewer value, so it is the one client IP that cannot be spoofed —
it is what the rate limiter keys on).

### The 403-cached-as-404 trap

`errorResponses` is distribution-wide, so a 403 from the chat origin is
rewritten to the site's HTML `/404.html`. An OAC signature failure returns 403.
That mapping's TTL is therefore set to **zero**, because at the previous 5
minutes a wrong payload hash kept returning HTML after the client was fixed, so
the fix looked like it had not worked.

Diagnostic: **if `curl /api/chat` returns HTML with `x-cache: Error from
cloudfront`, the payload hash is wrong or OAC is misconfigured, and the Lambda
was never invoked.** The handler therefore never returns 403 or 404 — rate
limits are 429, budget exhaustion is a 200 carrying an error event.

### Guardrails are applied explicitly, not inline — and that is deliberate

`ApplyGuardrail` is called twice per turn (`INPUT` before any model call,
`OUTPUT` on the final answer) rather than passing `guardrailConfig` to
`Converse`. AWS documents that with tool use, an inline guardrail does **not**
evaluate tool results, tool definitions, or model-generated tool arguments —
incomplete coverage, while re-scanning the system prompt and growing history on
every hop: up to 8 chargeable evaluations per turn instead of 2.

Input-first also means abusive traffic costs one guardrail text unit and
**zero model tokens**. Verified: salary and prompt-injection probes return
`in=0 out=0`.

The trade-off, recorded honestly: the guardrail is not structurally
unskippable. The IAM pattern that makes it so (deny `bedrock:InvokeModel` unless
`bedrock:GuardrailIdentifier` matches) requires inline `guardrailConfig` on
every call, which is the cost being avoided. Mitigated by a single code path and
a test asserting it is called.

**PII direction matters more than it looks.** Secrets (`SSN`,
`CREDIT_DEBIT_CARD_NUMBER`, `PASSWORD`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`)
`BLOCK` both ways. But `EMAIL`/`PHONE`/`ADDRESS` are **input-only ANONYMIZE**:
filtering them on output would redact the contact handoff, which is the one
answer the assistant exists to give. Get this backwards and the bot says
"contact him at {EMAIL}" and nothing fails loudly. Entity filtering bills at
$0.00, so there is no cost reason to omit it.

**Guardrail versioning uses a config hash.** A CFN-created guardrail is `DRAFT`,
and inference against `DRAFT` throws `ValidationException` during updates — but a
naive `CfnGuardrailVersion` pins v1 forever and policy edits never take effect.
The version resource's *logical id* carries a hash of the policy config, so an
edit creates the new version before retiring the old one, with no manual step
and no window where the referenced version is missing.

### Retrieval: why confidence is coverage, not score

The corpus is `knowledge/*.md` plus `resume.md` plus the `frontend/lib/data`
modules, searched by IDF-weighted keyword overlap. No embeddings, no vector
store, no Knowledge Base, and that was costed rather than assumed (below).

Two problems were measured and fixed, and the second is the instructive one:

1. **Ubiquitous terms destroyed ranking.** "AWS" appears in nearly every
   passage, so its IDF is ~0 and ranking became arbitrary: `"what has he shipped
   on AWS"` returned a CI/CD *skills* line at 0.36 while `"landing zone"` scored
   1.21. Query terms appearing in more than 25% of passages are now discarded
   outright, and a query left with nothing is reported `tooBroad`, which routes
   the model to the curated `get_highlights` tool.
2. **An absolute score threshold drifts with corpus size.** A 0.55 cutoff was
   calibrated at 146 passages. At 228, every score had moved — "landing zone"
   1.13 → 0.95, "kubernetes" 0.74 → 0.62, while the known-bad case *rose* 0.38 →
   0.41. The cutoff still separated them but the margin had collapsed from 0.36
   to 0.21 and would have kept closing, eventually flagging good answers as weak
   with nothing to indicate anything had changed.

So **confidence is now `coverage`** — the share of the query's IDF mass a passage
matched — which does not move when the corpus grows. The raw score still does
the *ranking*, which is what it is good at. At `MIN_COVERAGE = 0.5`: every
genuine query measured scores 1.00 despite raw scores spanning 0.62–1.15, and the
known-bad case scores 0.40.

**Do not replace coverage with an absolute score threshold again.** If retrieval
needs tuning, tune `UBIQUITOUS_SHARE` or the chunk size in `knowledge.ts`.

Re-measure after a significant corpus change:

```
cd infrastructure && cat > /tmp/cov.mjs <<'EOF'
import { build } from 'esbuild';
const r = await build({ entryPoints: ['lambda/chat/corpus.ts'], bundle: true,
  write: false, format: 'esm', platform: 'node', target: 'node22',
  loader: { '.md': 'text' } });
const m = await import('data:text/javascript;base64,' +
  Buffer.from(r.outputFiles[0].text).toString('base64'));
for (const q of ['landing zone','kubernetes','what has he shipped on AWS']) {
  const h = m.searchPassages(q, 1)[0];
  console.log(m.isBroadQuery(q) ? 'BROAD' : h.coverage >= m.MIN_COVERAGE ? 'OK' : 'WEAK', q);
}
EOF
cp /tmp/cov.mjs ./cov.mjs && node cov.mjs; rm cov.mjs
```

### No codegen, and the path filters that depend on it

The Lambda imports `frontend/lib/data/*.ts`, `resume.md` and `knowledge/*.md`
**directly**; esbuild inlines them (`loader: { '.md': 'text' }`). There is no
generated context file, because a snapshot is a third copy that drifts, and
`CLAUDE.md` requires the site and the résumé never to disagree. `cdk synth` *is*
the build step: verified that editing `jobs.ts` changes the Lambda asset hash.

**The consequence is that content lives outside `infrastructure/` while still
being an input to the Lambda asset, so every such path must be listed in
`deploy-infra.yml`:** `knowledge/**`, `frontend/lib/data/**`, `resume.md`. Both
`frontend/lib/data/**` and `knowledge/**` were omitted at first, and the failure
is silent — the edit deploys nothing and the assistant keeps serving the previous
text. **Add a path here whenever the Lambda starts importing from a new
location.**

`projectRoot` on the `NodejsFunction` is `infrastructure/`, **not** the repo
root: CDK runs the bundler with `cwd = projectRoot` and invokes
`npx --no-install esbuild`, which only walks up from cwd, and esbuild lives in
`infrastructure/node_modules`. The cross-project imports still resolve because
esbuild resolves relative to the importing file.

### Cost

Measured, not estimated: **~$0.00068 per turn**, against a $0.10/day cap
(~$3.10/month ceiling). Guardrails cost roughly twice the model, which is why
they are applied twice rather than on every hop.

`PRICES` in `lambda/chat/limits.ts` is hand-maintained from the pricing page and
**the daily cap is only as correct as those constants**. Reconcile periodically:
compare the `budget#<date>` item in `cv-chat-counters-<stage>` against Cost
Explorer. More than ~20% divergence means the constants are wrong. Note Cost
Explorer lags 8–24h, so a same-day comparison shows $0 and proves nothing.

The uncapped tail, accepted knowingly: once limits trip, rejected requests still
cost CloudFront requests, a Lambda invocation and a conditional write — roughly
$2.70 per million rejected requests. The correct control is a WAF rate-based
rule at $6/month minimum, which costs more than everything it protects. See
`BACKLOG.md` for why AWS Settings spend limits are not the answer either.

### Why there is no Knowledge Base, with the numbers

Costed in Oct 2026 before building, so it does not get revisited:

| Option | Monthly floor |
|---|---|
| OpenSearch Serverless (classic, 2 OCU minimum) | **~$350** |
| OpenSearch Serverless (dev/test, 1 OCU) | ~$88 |
| S3 Vectors | ~$0.01 |
| Bedrock Managed KB | $5/GB raw + **$1.00 per 1,000 retrievals** |
| **No RAG — search locally, send the hit** | **$0** |

The decisive number is not the storage floor, it is the retrieval fee. Managed
KB retrieval is **$0.001 per query**, against **~$0.00018** to put the relevant
passages in the prompt with Nova Lite at $0.06/1M input tokens. **Retrieval
alone would cost ~5x the entire no-RAG approach**, before any storage.

The corpus is a few hundred short passages. Keyword search over it in-process
costs nothing, adds no infrastructure, and has no cold start. If the corpus ever
reaches the point where keyword retrieval genuinely fails — not "returns a
mediocre hit", but misses answers that are present — revisit **S3 Vectors**,
which has no OCU floor, and not OpenSearch.

### Content rules for `knowledge/`

`knowledge/README.md` is the authority and should be read before editing the
corpus. The short version: it is a **public** GitHub repo, git keeps every
revision, and the assistant quotes it verbatim to anyone. "Not rendered on the
page" is not "not public".

Established while writing it, and worth not relearning:

- **No customer or client names**, and watch re-identification — industry plus
  region plus headcount plus dates can name a company with no name present.
- **No colleague names.**
- **Do not put a dollar figure on AWS MAP funding.** An Oct 2026 records search
  could not substantiate the ~$1.2M the résumé carried; the closest figures were
  *budgets*, not approvals. The programme **count** is defensible, the amount is
  not, so it reads "16+ AWS MAP programs".
- **Anonymise by making a number vaguer, never larger.** Rounding ~320 VMs up to
  "~500" de-identifies and overstates; "a few hundred" does the first without
  the second.
- **No review notes in HTML comments.** The bot never sees them, but git
  publishes them, and "check the NDA" discloses the thing it worries about.
- The résumé is a full 3 pages. Any Experience edit needs
  `npm run resume && pdfinfo frontend/public/resume.pdf | grep Pages`.

## Infra quirks (learned the hard way)

### LZA Service Control Policies are active

Account `421219980479` sits under a Landing Zone Accelerator org. Three
SCP statements have bitten deploys:

1. **`InfrastructureProtection-SCP` → `DenyUnencryptedS3Uploads`** denies
   every `s3:PutObject` that doesn't carry the
   `x-amz-server-side-encryption` request header. S3's default bucket
   encryption is applied *after* SCP evaluation, so relying on it
   silently fails. The `deploy-site.yml` workflow already passes
   `--sse AES256` on every `aws s3 sync` / `aws s3 cp`. **If you add a
   new S3 command, include the flag.**
2. **`NetworkPerimeter-SCP` → `DenyLambdaWithoutVPC`** denies
   `lambda:CreateFunction` / `UpdateFunctionConfiguration` when
   `lambda:VpcIds` is null. Note it is Lambda *outside a VPC* that's denied,
   **not Lambda outright** — older comments in this repo said otherwise and
   nearly caused a wrong design call. In practice there's no VPC in this
   account, so any Lambda-backed CDK custom resource (`autoDeleteObjects`,
   `BucketDeployment`, the L2 OIDC provider) still fails. Adding a VPC would
   also mean a NAT Gateway (~$32/mo) for internet egress, since `ipinfo.io`
   is IPv4-only.
3. **`NetworkPerimeter-SCP`** also denies based on source IP unless the
   principal carries `LZA:EXC:NET=true` (exact case). The GH Actions
   role gets this tag via CDK in `infrastructure/lib/github-oidc-stack.ts`
   (`cdk.Tags.of(this.role).add('LZA:EXC:NET', 'true')`). **Don't drop
   that tag.** If LZA ever overwrites it in an out-of-band run, `cdk
   deploy` will put it back.

### Cache-Control is set per-file

`deploy-site.yml` runs two `aws s3 sync` passes:

- Non-hashed files → `public, max-age=0, must-revalidate` (HTML, images,
  resume.pdf, vcf). Revalidate every request.
- `_next/static/**` → `public, max-age=31536000, immutable`. Hashed
  filenames, safe to cache forever.

Don't collapse back into one pass — hashed chunks need the long cache
for PageSpeed to stop complaining.

### S3 versioning is on

30-day noncurrent retention, per `cv-website-stack.ts`. Safe to
redeploy / nuke-and-rebuild without losing prior state. The dev bucket
has `DESTROY` removal policy; prod is `RETAIN`.

---

## Image pipeline gotchas

`frontend/scripts/optimize-images.mjs` runs on every build via the
`prebuild` hook. It converts raster → WebP, caps longest side at 800 px,
and skips files where WebP would be larger than source (line-art PNGs
like `accenture.png`). Output collisions throw a loud error.

- **Don't `find public/images -name '*.webp' -delete`** blindly.
  Some WebP files (`vivsoft.webp`) are originals with no raster sibling
  — they're sources, not generated. Always check for `.jpg` / `.jpeg` /
  `.png` sibling before deleting a `.webp`.
- **Exclusion list** in the optimizer currently includes
  `diagrams/cv_infra_diagram.png` (needs full resolution for the
  ProjectShowcase lightbox). Add to that list if another hero-class
  image joins.
- **Never two sources with the same stem** (e.g. `foo.jpg` and
  `foo.jpeg`). The optimizer now throws on this, but be aware.
- Components reference `.webp` where siblings exist. If you add a new
  image, also update the component `src` to `.webp`, or run the
  historical swap script if re-running:
  ```
  python3 -c '...'  # see earlier conversation; trivial to redo
  ```

---

## Build chain

- `npm run images` — optimize-images.mjs (raster → WebP, ~1 s)
- `npm run resume` — build-resume.mjs (md-to-pdf via puppeteer, ~4 s)
- `npm run build` — runs both as `prebuild`, then `next build` with
  `output: 'export'` → static site in `frontend/out/`

Dev server: `npm run dev` on port 3000. **Next dev doesn't auto-serve
directory index files**, so local URLs like `/blog/` 404 in dev —
append `/index.html` to test those. In prod, a CloudFront Function
rewrites `/foo/` → `/foo/index.html`.

---

## Dependency management (Dependabot)

Set up July 2026. `.github/dependabot.yml` runs weekly grouped version
updates against **dev** for two independent npm projects (`/frontend`,
`/infrastructure` — not a monorepo, no workspace) plus github-actions.
`.github/workflows/ci.yml` (`on: pull_request`) builds the frontend and
runs `cdk synth` with no AWS access, so Dependabot PRs are validated
before merge.

- **No auto-merge, by design.** The direct-push dev→main flow is
  incompatible with the required-status-checks that make auto-merge safe
  (a required check would block your own pushes to dev/main). `ci.yml` is
  the prerequisite if you ever move to a PR-based flow and want it.
- **Security updates ignore `target-branch`** and open against the
  default branch (`main`). With no auto-merge, they get manual review
  before reaching prod — fine.
- **`main` and `dev` drift apart, and it silently breaks the promote.**
  Security updates open against the default branch (`main`) while version
  updates target `dev`, so each branch accumulates commits the other lacks and
  neither stays an ancestor of the other. Two consequences: `git merge dev
  --ff-only` fails, and `dev` can sit on a vulnerability `main` has already
  patched. Oct 2026: `dev` ran next 16.3.3 with a critical RCE
  (GHSA-vcvr-r3jv-pc5j) for ~2 weeks while `main` was already on 16.3.8.

  Repair by merging `main` into `dev` and **regenerating both lockfiles from
  the reconciled `package.json`** rather than hand-merging lock conflicts
  (resolve `package.json` by keeping the higher range, `git checkout --ours`
  the locks, then `npm install` in each project).

  **Do not squash-merge that reconcile PR.** A squash brings the content across
  but discards the ancestry: the tip ends up with one parent, `main` is still
  not an ancestor, and `--ff-only` still fails. This happened with PR #54. If
  it has already been squashed, record the ancestry without touching the tree:

  ```
  git checkout dev && git merge -s ours origin/main
  ```

  `-s ours` keeps `dev`'s tree byte-for-byte and adds `main` as a second
  parent, restoring the `main == dev` invariant after the next promote. Only
  safe once you have confirmed `dev` is a strict superset of `main` — check
  `git diff origin/main origin/dev` shows nothing but equal-or-higher
  versions, because `-s ours` discards the other side's changes outright.
- **`sprintf-js` (GHSA-hp3w-g68c-fv3c) is unfixable and is dismissed.** Latest
  published is 1.1.3 and the advisory covers `<= 1.1.3`, so there is no version
  to upgrade to. Build-time only, via `md-to-pdf` → `gray-matter` → `js-yaml`
  → `argparse` parsing `resume.md` in CI. Dismissed as `tolerable_risk`
  (Oct 2026, both manifests). Reopen if a patched release ever ships.
- **If the alert count never drops, the dependency graph is stuck — don't wait
  it out.** In Sep 2026 this repo showed 65 alerts while `npm audit` was 0/0.
  It was not lag: GitHub's graph was frozen on a *July* lockfile snapshot, and
  **zero alerts had ever reached "fixed" state** across two successful
  remediation rounds. New advisories kept firing against the stale snapshot, so
  the count went *up* over time. Pushing corrected lockfiles does not dislodge
  it. The fix is to force a re-parse by toggling alerts off and on:

  ```
  gh api -X DELETE repos/:owner/:repo/vulnerability-alerts
  gh api -X PUT    repos/:owner/:repo/vulnerability-alerts
  ```

  65 open → 2 open within 30 seconds, and auto-close has worked since.
  **Diagnostic that tells lag from stuck:** if `state=="fixed"` count is 0
  while open alerts persist after a real fix, it's stuck, not lagging.
- **`npm audit` and GHSA disagree in *both* directions.** `browserslist`
  GHSA-73wf-gq98-2v4g was a real, current high that GitHub flagged and
  `npm audit` reported nothing about, so npm audit alone is not sufficient.
  The converse also holds: `npm audit` reports ~12 findings in `/frontend`
  that Dependabot does not flag at all, and none of them is fixable. Check
  both, and read the `npm audit` entry under *Known non-issues* before acting
  on that output.
- GitHub counts each advisory×package *instance*, so a scary "65 alerts" was
  really a handful of packages.
- **`brace-expansion` in `/infrastructure` can't be fixed by `npm audit fix`.**
  It's a *bundled* dependency inside `aws-cdk-lib`, so the only fix is bumping
  `aws-cdk-lib` itself. `npm audit fix` says so explicitly and then does
  nothing about it.
- **Intentional `ignore` rules** (each has a comment in `dependabot.yml`
  explaining why — don't "unblock" without checking the reason still holds):
  - `lucide-react` major → 1.x drops the GitHub/LinkedIn/Twitter brand
    icons the Footer needs. Stay on 0.x (minors like 0.577 are fine).
  - `typescript` major (both projects) → TS 7 breaks ts-node (`cdk synth`)
    and typescript-eslint (`npm run lint`); tooling isn't ready.
  - `eslint` major → eslint-config-next 16 caps at ESLint 9 (its bundled
    eslint-plugin-react uses `getFilename()`, removed in ESLint 10).
- **Linting is flat-config** (`frontend/eslint.config.mjs`, ESLint 9,
  `eslint .`). `next lint` was removed in Next 16. `public/**` is
  ignored (the byte-preserved WP archives).
- **Deferred: Tailwind 3→4** (PR #12 left open) — a visual-regression
  migration (JS config → CSS `@theme`, remap the color tokens + dark
  mode). Do it in a focused session with dev visual verification, not a
  drive-by merge.

  **Dependabot will try to land this as a "security update" — don't let it.**
  Oct 2026, PR #51 was titled as a `postcss-selector-parser` fix
  (GHSA-rj75-hqrm-r3gf, medium) and its actual change was Tailwind 3→4, since
  Tailwind 4 drops that dependency entirely. It broke the build, because
  Tailwind 4 moved its PostCSS plugin to `@tailwindcss/postcss` while
  `postcss.config.mjs` still loads `tailwindcss` directly. Both #51 and #12
  fail with exactly that error.

  Fixed instead with `overrides: { "postcss-selector-parser": "^7.1.6" }`,
  which reaches the patched version while staying on tailwindcss 3.4.19 even
  though `tailwindcss` declares `^6.1.2` and `postcss-nested` declares
  `^6.1.1`. Generated CSS verified byte-identical before and after.

  A medium build-time advisory is not a reason to force the migration:
  `tailwindcss` is a `devDependency`, so the parser never reaches a browser,
  and the advisory is CPU exhaustion on a pathological flat selector
  (`.a.a.a...`) that would have to be in your own `globals.css`.

---

## Archives — don't regenerate

- `frontend/public/legacy/` — 2015 WP CV (Simply Static export, paths
  rewritten to `/legacy/` prefix). ~17 MB.
- `frontend/public/blog/` — 2015–2020 WP blog (wget `--mirror`, paths
  rewritten to `/blog/` prefix). ~68 MB, 21 posts.

Both are byte-preserved from the source WP installs. Do not try to
"clean up" or reformat. The only intentional surgery:

- Legacy CV had a self-hosted Advent Pro font added because ad-blockers
  were eating the Google Fonts request. See `public/legacy/wp-content/fonts/advent-pro/`.
- Blog homepage's Visual Composer lazy-masonry widget was replaced with
  a static card grid (AJAX endpoint didn't survive the static export).

---

## Scores baseline (April 2026, at ship time)

- PageSpeed desktop: 97–99 perf, 100 best-practices, 100 SEO, 96 a11y
- PageSpeed mobile: 85–89 perf (±5 on throttled runs; run 3 times and
  take median before chasing a regression)
- 96 a11y floor is one contrast-ratio warning — no owner, fine to
  leave

---

## Known non-issues (don't "fix" without asking)

- **`npm audit` in `/frontend` reports ~12 findings that cannot be fixed.
  Accepted Oct 2026; don't go chasing them.** The count (roughly 8 high /
  4 moderate) is inflated because npm audit lists every dependent along the
  chain. It is really **two** advisories, and neither has a patched release in
  existence:

  - **`braces` `<=3.0.3`** (high, stack-exhaustion DoS). The latest published
    version *is* 3.0.3 — 37 releases and the newest one is the vulnerable one.
    There is nothing to upgrade to, so the `overrides` trick that fixed
    `postcss-selector-parser` cannot work here.
  - **`sprintf-js` `<=1.1.3`** (moderate). Latest published is 1.1.3. Already
    dismissed in Dependabot for the same reason.

  **npm's own `fixAvailable` suggestions are both wrong.** For `braces` it
  says `tailwindcss@4.3.3`, but there are *two* paths to braces:
  `tailwindcss → micromatch → braces` **and**
  `md-to-pdf → chokidar@3.6.0 → braces`. Tailwind 4 removes only the first, so
  the deferred migration would not even clear this finding. For `sprintf-js`
  it suggests `md-to-pdf@2.2.0`, which is a *downgrade* from the current 5.2.5.

  The second path has no room either: `md-to-pdf` is already at the latest
  published 5.2.5 and pins `chokidar: ^3.5.2`. Chokidar 5.x carries no braces
  dependency but dropped glob support entirely, so forcing it would likely
  break PDF generation. **Don't pin chokidar to "fix" this.**

  Both are `devDependencies`: build-time only, never shipped to a browser, and
  the braces advisory needs a deeply nested brace pattern in a glob you wrote
  yourself in your own CI. **Dependabot flags neither** (0 open as of
  Oct 2026) — that is consistent with the above, not a gap in coverage.
  Revisit only if `braces` publishes a patched release.
- **AWS certifications: earn years only, no status labels.** All three
  proctored AWS certs carry earn dates older than the 3-year validity window
  (SA Pro 2022-01, SA Associate 2021-04, SysOps 2023-04). Raised again in
  Sep 2026 when the resume started listing them; user's decision is to show
  the earn year and nothing else, on both the site and the resume. A bare
  "(2022)" states when it was earned and claims no currency. **Don't add
  expiry callouts, don't split Active vs Previously Held, don't remove them.**
  (Note: AWS added a Skill Builder certification-maintenance path in Jul 2026,
  so Credly earn dates may understate actual status anyway.)
- **Delivery-phase cost savings don't exist.** Confirmed Sep 2026 across the
  full document set: Assess-phase design guides defer TCO to Mobilize, the
  Mobilize readouts hold current-state baselines and forward projections only,
  and no delivery-phase TCO workbook exists for any of the 17 engagements.
  The category is deliberately absent from the resume. Don't go looking again.
- **Never use the "Business Impact at a Glance" percentages** (43% time-to-market,
  69% unplanned downtime, 45% security incidents) that appear in a customer deck.
  They are labelled "(AWS benchmark)" — vendor marketing, not delivered results.
- **Orphan images in `public/images/`** (`icagile.jpg`,
  `redhat-ansible.jpg`, `dell-poweredge-*.png`, `strengths-graphic.png`)
  — unreferenced but retained as reference material. Don't auto-clean.
- **`michael-groff.jpg` stays in the repo** even though the `.webp`
  derivative is what ships. The raster is the source.
- **`resume.pdf` is gitignored** — regenerated by CI on every build.

---

## Forking this repo (it's public)

Config lives in `infrastructure/cdk.json` → `context`. Edit that one block:

| Key | Why |
|---|---|
| `domainName`, `account` | yours |
| `githubOrg`, `githubRepo` | drives the OIDC trust policy subjects |
| `resourcePrefix` | **must change** — S3 bucket names are globally unique, so `cv-michaelgroff-*` is already taken |

Then, outside the repo:

- Repo **variables**: `AWS_ACCOUNT_ID`, `AWS_ROLE_ARN`
- Environment **variables** (`production` + `dev`): `CLOUDFLARE_ANALYTICS_TOKEN`,
  `PLAUSIBLE_SRC`, `PLAUSIBLE_DOMAIN`, `CHAT_ENABLED` (all optional; empty
  disables that feature). `CHAT_ENABLED` is per-environment on purpose, so the
  chat section can be live on dev while still hidden in prod
- **The chat backend needs more than config.** `chatModelId: ""` in `cdk.json`
  leaves it out entirely, which is the right default for a fork. To enable it you
  also need Amazon Nova model access in the target region, and — if you are under
  an LZA/SCP regime — a carve-out for `cv-chat-*` in any `DenyLambdaWithoutVPC`
  statement, plus `LZA:EXC:NET=true` on the table and log group if an RCP covers
  `dynamodb:*`/`logs:*`. See *The chat assistant* above
- GitHub environments named `production` and `dev` must exist — the OIDC trust
  policy matches on `repo:ORG/REPO:environment:NAME`, so a workflow without an
  `environment:` cannot assume the role
- Bootstrap `CvWebsite-OIDC` **manually** (`npx cdk deploy CvWebsite-OIDC`);
  `deploy-infra.yml` deliberately skips it, since it's the stack that grants the
  workflow its own credentials

---

## Don'ts

- Don't commit directly to `main` — always dev-first, then merge.
- Don't amend prior commits on pushed branches.
- Don't blanket-delete generated artifacts without checking for
  hand-authored siblings.
- Don't touch SCPs on the Org account from here. Those belong to the
  LZA repo (`~/repos/GitHub/grofflabs-lza/`).
