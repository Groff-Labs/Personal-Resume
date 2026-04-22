# michaelgroff.info

Personal CV / resume site for **Michael Groff**, AWS Sr. Solutions Architect.
Migrated from a 2015-era WordPress install (The7 theme) to a static
Next.js site on AWS.

Live: **https://michaelgroff.info** (prod, also serves `cv.michaelgroff.info` as a legacy alias) · **https://dev.michaelgroff.info** (dev)

Plus two read-only archives parked alongside the site:

- `/legacy/` — 2015-era WordPress CV (The7 theme), static export
- `/blog/` — 2015–2020 WordPress blog (21 posts), mirrored static

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom tokens for dark mode |
| Animation | Framer Motion |
| Infrastructure | AWS CDK (TypeScript) |
| Hosting | S3 (private) + CloudFront with OAC |
| TLS | AWS Certificate Manager (DNS-validated) |
| DNS | CloudFlare (not Route 53 — keeps the project single-account) |
| CI/CD | GitHub Actions with OIDC (no long-lived AWS keys) |

## Architecture

```
Visitor → CloudFlare (DNS) → CloudFront (OAC) → S3 (private bucket)
                                    ↑
                               ACM Certificate
                                    ↑
GitHub Actions ─── OIDC ──→ cdk deploy / s3 sync / cf invalidate
```

Highlights and trade-offs are documented on the site itself under **Project →
WordPress → Next.js on AWS**. Short version: zero servers, pennies per month,
`git push` → deploy.

## Repo layout

```
resume.md         # Source-of-truth résumé; regenerated to PDF on each build
frontend/         # Next.js static site (the CV itself)
  app/            # App Router pages
  components/     # React components (Hero, Experience, Skills, etc.)
  lib/data/       # Typed data: jobs, certifications, skills
  scripts/
    build-resume.mjs      # md-to-pdf → public/resume.pdf; runs as prebuild
  public/         # Static assets (images, favicon, OG, robots, sitemap)
    blog/                 # WordPress blog archive (2015–2020, read-only)
    legacy/               # WordPress CV archive (2015 The7 theme)
infrastructure/   # AWS CDK (TypeScript)
  bin/            # CDK app entry point
  lib/
    cv-website-stack.ts   # S3 + CloudFront + OAC + ACM per stage;
                          # prod stack also includes cv.* as a SAN/alias
    github-oidc-stack.ts  # One-time OIDC provider + deploy role
.github/workflows/
  deploy-site.yml   # frontend/** changes → build + sync + invalidate
  deploy-infra.yml  # infrastructure/** changes → cdk deploy
```

Stage → hostname mapping:

| Stage | Hostname(s) | Bucket |
|---|---|---|
| `dev`  | `dev.michaelgroff.info` | `cv-michaelgroff-dev` |
| `prod` | `michaelgroff.info` + `cv.michaelgroff.info` (legacy alias) | `cv-michaelgroff-prod` |

## Local development

```bash
cd frontend
npm ci
npm run dev      # http://localhost:3000
```

Regenerate the résumé PDF after editing `resume.md`:

```bash
npm run resume   # writes public/resume.pdf from ../resume.md
```

(The `prebuild` hook runs this automatically, so `npm run build` always
ships a fresh PDF. Next dev doesn't auto-resolve directory-index URLs —
append `/index.html` locally, or trust that the CloudFront Function
handles `/foo/` → `/foo/index.html` in prod.)

Production build (matches what ships to S3):

```bash
npm run build
npx serve out
```

## Deploying from scratch

Requires AWS CLI authenticated to the target account (`us-east-1`, CloudFront
requires it for ACM) and CloudFlare access to add DNS records.

```bash
# 1. Bootstrap CDK (once per account/region)
cd infrastructure && npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1

# 2. Create GitHub OIDC role (once)
npx cdk deploy CvWebsite-OIDC
# → Copy GitHubActionsRoleArn output

# 3. Add AWS_ACCOUNT_ID as a GitHub repo variable (not secret; account IDs
#    aren't sensitive). The workflows construct the role ARN from it.

# 4. Deploy the stage (first time is interactive — ACM validation)
npx cdk deploy CvWebsite-dev
#    → While it pauses on Certificate creation, run in another terminal:
#      aws acm describe-certificate --certificate-arn <arn> \
#        --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
#    → Paste that Name/Value into CloudFlare as a CNAME (DNS only, no proxy)

# 5. After stack completes, add CNAME(s) in CloudFlare pointing at the
#    distribution's DomainName output:
#      - dev stack:  dev → <DistributionDomainName>
#      - prod stack: @   → <DistributionDomainName>  (apex; CloudFlare flattens)
#                    cv  → <DistributionDomainName>  (legacy alias)

# 6. Build and ship the site
cd ../frontend && npm ci && npm run build
aws s3 sync out s3://cv-michaelgroff-dev --delete
aws cloudfront create-invalidation --distribution-id <id> --paths '/*'
```

After the first manual deploy, `git push` to `dev` or `main` fires the
appropriate workflow and handles everything.

## Why CloudFlare and not Route 53

CloudFlare already hosts the apex zone for `michaelgroff.info`. Moving DNS
to Route 53 inside this account would have meant cross-account delegation
for a one-person project. The trade-off is manual CNAMEs for the ACM
validation record and for the distribution alias — worth it for the
single-account simplicity.

## Running costs

Fits well under the AWS Always-Free tier for a personal site (500
page-views/month kind of traffic). Expect ~$0 plus Route 53 hosted zone
if you use one (we don't).

## Why this repo is public

The site tells people I do IaC and static-first AWS architecture. Hiding
the CDK code would undercut the message. Everything sensitive is
externalized: AWS identity is OIDC-based (nothing to leak), DNS is managed
in CloudFlare, no API keys in the repo.

---

Built with [Claude Code](https://claude.com/claude-code).
