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

**Scheduled change — 1 Oct 2026:** the AllCloud role changes from *Sr.
Pre-Sales Solutions Architect / Team Lead* to *Sr. Cloud Solutions Architect /
Team Lead* (moving back to delivery). In `frontend/lib/data/jobs.ts`, prepend
the ready-to-uncomment role to the AllCloud `roles` array, set the previous
role's `endDate` to `"October 2026"`, and update the card's top-level `title`
(it mirrors `roles[0]`). Mirror all of it in `resume.md`. Deliberately not
published early — the site shouldn't claim a role that hasn't started.

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

Two independent systems. Neither was documented before Aug 2026.

### 1. CloudFlare Web Analytics (visitor counts) — since April 2026

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

### 2. Company-level visitor identification — TRIED AND REMOVED (Aug 2026)

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
- **Dependabot alerts lag.** After a fix lands on `main`, GitHub's
  dependency-graph re-scan can take hours to flip alerts to "fixed."
  Trust local `npm audit` over the alert count — and note GitHub counts each
  advisory×package instance, so "63 alerts" was really 8 vulnerable packages.
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

- **AWS SA Pro + SA Associate are expired per Credly** (2025-01-07).
  User is aware, leaving as historical record. Don't add expiration
  callouts to the UI.
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
| `ipinfoDatasetUrl`, `ispExclusionAsns` | analytics tuning |

Then, outside the repo:

- Repo **variables**: `AWS_ACCOUNT_ID`, `AWS_ROLE_ARN`
- Environment **variables** (`production` + `dev`): `CLOUDFLARE_ANALYTICS_TOKEN`
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
