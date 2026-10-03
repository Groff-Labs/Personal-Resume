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

**`data-domain` is emitted only when `PLAUSIBLE_DOMAIN` is set.** Plausible's
newer per-site scripts already carry the domain; the classic `script.js`
snippet needs the attribute. Supporting both keeps the code agnostic to
whichever snippet the dashboard hands you.

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
- **`npm audit` alone is NOT sufficient.** npm's advisory DB and GitHub's GHSA
  disagree. `browserslist` GHSA-73wf-gq98-2v4g was a real, current high that
  GitHub flagged and `npm audit` reported nothing about. Check both.
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
  `PLAUSIBLE_SRC`, `PLAUSIBLE_DOMAIN` (all three optional; empty disables that tag)
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
