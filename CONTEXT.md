# Context

The vocabulary of this repo. Role agents take their names from here, and so
should new code and comments: if a thing has a name below, use that name rather
than inventing a synonym.

`CLAUDE.md` holds the operational rules and the landmines. `BACKLOG.md` holds
parked work. This holds the words.

---

## The product

**The site** — michaelgroff.info. A personal CV, a static Next.js export on S3
behind CloudFront. Not an app; there is no server rendering and no database
backing the pages.

**Stage** — `dev` or `prod`. One CDK stack and one CloudFront distribution per
stage, selected by branch: `dev` deploys `dev.michaelgroff.info`, `main` deploys
the apex. Every resource name carries the stage as a suffix.

**The apex** — michaelgroff.info itself. `cv.michaelgroff.info` is a CloudFlare
redirect to it, not a CloudFront alias. `www` is NXDOMAIN by choice.

**The archives** — `frontend/public/legacy/` (the 2015 WordPress CV) and
`frontend/public/blog/` (2015–2020 posts). Byte-preserved exports, ~85 MB
together. They are not maintained, not linted and not reformatted.

---

## Resume and content

**`resume.md`** — the single source of truth for the downloadable résumé, at the
repo root. `npm run resume` renders it to `frontend/public/resume.pdf` and copies
it to `frontend/public/resume.md` with HTML comments stripped.

**The published Markdown** — `frontend/public/resume.md`, generated. Distinct
from the source: the source keeps its editor comments, the published copy must
not have them, and the build throws if it does.

**Three pages** — the résumé's hard size limit. Any Experience edit can push it
to four, which strands the certifications heading. The check script enforces it.

**House style** — no em dashes anywhere in résumé or corpus prose. Commas,
semicolons, colons or `·`.

**The data modules** — `frontend/lib/data/*.ts`. `jobs.ts`, `certifications.ts`,
`skills.ts`, `status.ts`, `testimonials.ts`, `chat.ts`, `contact.ts`, `about.ts`,
`project.ts`. Pure TypeScript, no React. They are what the page renders *and*
what the chat assistant reads, which is why they must never disagree with
`resume.md`.

**The rule they exist for:** content hardcoded in a component is invisible to the
assistant, because `corpus.ts` imports data modules and cannot import React.
`about.ts` and `project.ts` were extracted in Oct 2026 after exactly that
happened. **New prose on the page belongs in a data module, not in the `.tsx`.**

**Job vs role** — a `Job` is one employer. It sets *either* `roles` (a promotion
path, newest first) *or* `responsibilities` (a single title), never both.
`Experience.tsx` branches on which is present.

**Feature flag** — a boolean or empty-string convention, not a framework.
`showTestimonials` in `testimonials.ts`, `showChat` derived from
`NEXT_PUBLIC_CHAT_ENABLED`, `chatModelId: ""` in `cdk.json`. Empty or false means
the thing does not render and, for the backend, does not exist.

---

## The chat assistant

**The assistant** — the "Ask my CV" feature. A Bedrock agent loop at
`/api/chat`, on the same CloudFront distribution as the site. Called *the
assistant*, not "the bot" or "the AI", in anything published.

**The corpus** — everything the assistant can search: `knowledge/*.md` plus
`resume.md` plus the data modules. Bundled into the Lambda at synth time, never
fetched at runtime.

**`knowledge/`** — seven markdown files of detail that would not fit a 3-page
résumé. Public, and the README there is the authority on what may go in.

**Passage** — one searchable unit. A responsibility bullet, a skill group, or a
`##`/`###` section of a knowledge file, windowed at sentence boundaries if long.
Currently ~250 of them.

**Coverage** — the share of a query's IDF mass a passage matched, 0 to 1. The
confidence measure. Scale-invariant, unlike the raw ranking score, which moves
as the corpus grows.

**Score** — the IDF-weighted ranking number. Comparable *within* one query, not
across corpus sizes. Use it to order results, never to judge confidence.

**Broad query** — a question with no distinctive term left after stopwording, so
keyword search cannot rank it ("what has he shipped"). Reported `tooBroad` and
routed to curated highlights instead of a grab-bag.

**Absent term** — a query token the corpus does not contain at all. Weighted
`UNKNOWN_TERM_WEIGHT`, the most any single term can score, because its absence is
the strongest evidence the corpus cannot answer. Weighting it `1` was the bug
behind the assistant denying its own page.

**Alias** — a query-side synonym in `ALIASES` (`dogs` to `husky`, `k8s` to
`kubernetes`). Corpus-aware: only aliases the corpus contains are added. The
map's length is the signal for whether semantic search is worth its cost.

**Highlights** — `knowledge/10-highlights.md`, the one file where order matters.
Backs the `get_highlights` tool and answers broad openers.

**The guardrail** — the Bedrock guardrail, applied by two explicit
`ApplyGuardrail` calls per turn (input then output), never inline on `Converse`.

**Hop** — one `Converse` call inside a turn. Capped at 4.

**Turn** — one user question and its answer, however many hops it took.

**The trace** — the tool calls rendered in the UI with their arguments and
timings. The visible evidence that an answer came from a lookup.

---

## Infrastructure

**LZA** — Landing Zone Accelerator. The account sits under an LZA-managed AWS
Organization whose policies constrain what can be deployed. Not optional, not
ours to change from this repo.

**SCP / RCP** — Service Control Policy (constrains *principals*) and Resource
Control Policy (constrains *resources*). The distinction matters: the chat
Lambda needs `LZA:EXC:NET=true` as a *principal* tag on its role for an SCP and
as a *resource* tag on its table and log group for an RCP.

**The carve-out** — the `NotResource` exemption for `arn:aws:lambda:*:*:function:cv-chat-*`
in LZA's `DenyLambdaWithoutVPC`. It is why the function name prefix is
load-bearing.

**OAC** — Origin Access Control. How CloudFront authenticates to both the S3
bucket and the Lambda Function URL. Replaced the legacy OAI, which is gone.

**The behaviours** — CloudFront cache behaviours. Four: the default to S3,
`/js/*` and `/api/event` to plausible.io, and `/api/chat` to the Lambda.

**The deploy role** — `cv-website-github-actions`, assumed by GitHub Actions via
OIDC. Trusted on `repo:ORG/REPO:environment:NAME`, so a workflow without an
`environment:` cannot assume it.

**The counters table** — `cv-chat-counters-<stage>`. Per-IP rate limits and the
daily spend budget, all TTL'd. Throwaway data; no backups, no PITR.

**The daily cap** — `DAILY_USD_CAP`, enforced in-request before Bedrock is
called. The actual cost control. AWS Budgets and Cost Explorer both lag too far
to be one.

---

## Process

**Promote** — merging `dev` to `main` fast-forward only, which deploys prod.
Never a merge commit, and `main` is never committed to directly.

**The gate** — `./scripts/check.sh`. One command that proves the tree is green:
lint, both typechecks, stack assertions, synth, and the artifact invariants.
`fast` skips the Next build and `cdk synth`.

**Landmine** — a documented trap in `CLAUDE.md` that cost someone a debug cycle.
Each one names the symptom, not just the rule, so it is recognisable when hit.

**Known non-issue** — something in `CLAUDE.md` that looks like a bug, was
investigated, and is deliberately left alone. Re-fixing one is a regression.
