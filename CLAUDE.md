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
| Contact info (phone / email / socials) | `frontend/components/Footer.tsx` **+** `frontend/public/michael-groff.vcf` **+** `resume.md` (all three hold canonical copies) |
| New headshot | Replace `frontend/public/images/profile/michael-groff.jpg` → prebuild regenerates `.webp` |
| Resume bullets / layout | `resume.md` — PDF regenerates on next build |

`resume.md` is the source of truth for the downloadable PDF (auto-built
by `npm run resume`, which runs as a `prebuild` hook).

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

## Infra quirks (learned the hard way)

### LZA Service Control Policies are active

Account `421219980479` sits under a Landing Zone Accelerator org. Two
SCPs have bitten deploys:

1. **`InfrastructureProtection-SCP` → `DenyUnencryptedS3Uploads`** denies
   every `s3:PutObject` that doesn't carry the
   `x-amz-server-side-encryption` request header. S3's default bucket
   encryption is applied *after* SCP evaluation, so relying on it
   silently fails. The `deploy-site.yml` workflow already passes
   `--sse AES256` on every `aws s3 sync` / `aws s3 cp`. **If you add a
   new S3 command, include the flag.**
2. **`NetworkPerimeter-SCP`** denies based on source IP unless the
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

## Don'ts

- Don't commit directly to `main` — always dev-first, then merge.
- Don't amend prior commits on pushed branches.
- Don't blanket-delete generated artifacts without checking for
  hand-authored siblings.
- Don't touch SCPs on the Org account from here. Those belong to the
  LZA repo (`~/repos/GitHub/grofflabs-lza/`).
