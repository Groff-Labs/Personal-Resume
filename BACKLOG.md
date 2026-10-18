# Backlog

Parked work for michaelgroff.info, newest batch first. Each item carries enough
context to pick up cold. `CLAUDE.md` holds the operational rules; this holds the
intentions.

Closed items stay for a while with their answer, because "we looked at this and
decided no" is worth more than silence.

---

## Open

### 1. Update the Lucid architecture diagram for the chat feature

Existing diagram: <https://lucid.app/lucidchart/aef5844e-526a-4261-9fb8-258ca20973c8/edit>

Wanted: a **new page** cloning the current one, then the chat path added, so the
original stays as the pre-chat architecture. New elements:

```
browser ──> CloudFront ──> /api/chat ──> Lambda Function URL (OAC, AWS_IAM,
                                          RESPONSE_STREAM)
                                            │
                              cv-chat-api-<stage>  (no VPC)
                                            ├─> DynamoDB cv-chat-counters-<stage>
                                            │     per-IP + daily budget counters
                                            ├─> Bedrock ApplyGuardrail  (in, out)
                                            └─> Bedrock Converse  (Nova Lite)
                                                  tool-use loop, max 4 hops
```

Worth showing on the diagram because they are the non-obvious parts: the
guardrail sits on both sides of the model call, the function has no VPC (via an
SCP carve-out), and the corpus is bundled at synth time rather than fetched.

`frontend/public/images/diagrams/cv_infra_diagram.png` is the exported copy the
site renders, and it is in the image-optimiser exclusion list so it keeps full
resolution for the lightbox. Re-export to the same path.

### 2. Reconcile the chat spend counter against Cost Explorer

**Do this on or after 20 Oct 2026.** `PRICES` in
`infrastructure/lambda/chat/limits.ts` is hand-maintained from the pricing page,
and the $0.10/day cap is only as correct as those constants are. More than ~20%
divergence means they are wrong and the cap is not where it is thought to be.

Attempted 18 Oct and it proved nothing, which is the expected answer rather
than a failure: Cost Explorer showed Bedrock absent from the service list
entirely, while the counters held $0.0159 over 24 turns on dev. Those do not
conflict. Every measured turn had happened that same day, so nothing was old
enough to have landed, and CE was resolving other services to eight decimal
places at the time (CloudFront at $0.0000000083), so the absence was missing
data and not a $0 reading.

The counter's own arithmetic is at least self-consistent: $0.000661/turn on dev
over 24 turns and $0.000756 on the first prod turn, against the ~$0.00068
recorded in `CLAUDE.md`. That checks the division, not the price constants,
which is exactly what Cost Explorer is needed for.

---

## Closed

### The assistant went live in prod, after a config gap hid it

Promoting the code was not enough. `CHAT_ENABLED` is an environment-scoped
GitHub variable and it was set on `dev` only, so prod built the site with the
whole section stripped: no `#chat` element, no nav entry, no reference to
`/api/chat`. The backend had deployed fine (`cv-chat-api-prod`,
`cv-chat-counters-prod`, `cv-chat-guardrail-prod` all existed), and cost nothing
while unreachable, which is the two-kill-switch design behaving correctly rather
than a fault.

Worth knowing because the failure is silent in both directions: a green deploy
on `main` tells you nothing about whether the section renders, and the only
reliable check is grepping the live HTML for `id="chat"`. Verified end to end on
the apex afterwards, with a real browser rather than curl: the trace rendered
`list_certifications(vendor: "AWS")`, the answer streamed, the citation chip
appeared, and the certifications came back as earn years with no status labels.

### `resume.md` download no longer leaks editor comments

The published Markdown opened with build instructions and the no-em-dash style
note, so a recruiter downloading it read those before his name. `build-resume.mjs`
now strips HTML comments on the way to `frontend/public/resume.md`, and throws
if any survive or the file does not open on a heading. The source keeps its
comments. Fixed on prod.

### `/unslop` sweep run across the repo

The gate came back with one hit, a false positive (rule 19 flagged "Landing Zone
Accelerator and Service Control Policies", which are proper nouns and exempt).
Every ungated tell was absent, and the corpus has zero bold.

Two rule 15 density fixes applied by splitting sentences, not by bulleting —
recorded why in `CLAUDE.md`: `splitSections` strips the leading `-` and joins
lines with spaces, so a bullet list reaches the model as one unsplittable run of
jammed words. The rule's diagnosis was right and its prescribed fix was wrong
for a corpus a retriever reads first.

The sweep also caught a silent regression it was not looking for: "what has he
shipped on AWS" had started passing the broad-query guard, because the word
"shipped" occurred exactly once in the corpus and so carried a high IDF. Fixed
by stopwording the achievement verbs people use to phrase broad questions.

### AgentTeam wired up for this repo

The role agents were never the missing piece — they come from the `roles`
plugin and were already available here. What the team charter actually reads was
missing: a `check` script (it blocks a role agent whose run leaves the gate
failing) and a `CONTEXT.md` (it takes names from one).

Added `./scripts/check.sh`, a shell script rather than a root npm script because
this repo is two independent npm projects and a root manifest would imply a
workspace that does not exist. It runs lint, both typechecks, the stack
assertions, `cdk synth`, and the artifact invariants that have each regressed at
least once. Verified the harness reports every failure and exits 1, not just the
first.

Added `CONTEXT.md` as the vocabulary, and recorded in `CLAUDE.md` which three
roles apply (`cloud-iac-engineer`, `devops-sre`, `fullstack-engineer`) and which
are deliberately unused, with the reason for each — the `ops:*` agents assume
Sentry and ECS, `data-ml-engineer` assumes a data platform, `business:*` assumes
a commercial product.

Proving the gate runs in CI, rather than only on this laptop, found two real
problems. `pdfinfo` and `pdftotext` are not on a stock `ubuntu-latest`, so
`ci.yml` now installs `poppler-utils` and the two résumé checks skip rather than
fail when it is absent, which keeps the gate usable on a dev machine without
poppler. And `ci.yml` triggers on `pull_request` only, so direct pushes to `dev`
never exercise it; a throwaway PR was the only way to run it, and it immediately
caught `infrastructure/lambda/chat/md.d.ts` being swallowed by
`infrastructure/.gitignore`'s `*.d.ts` rule. That file is hand-written source,
not `tsc` output, and without it the Lambda typecheck fails on every markdown
import. It worked locally purely because the file was on disk. All 12 checks now
pass on a clean runner.

### `lucide-react` unpinned by inlining three brand glyphs

The pin was real and still is: verified against 1.59.0 that `Github`,
`Linkedin`, `Twitter`, `Facebook`, `Instagram`, `Youtube` and `Slack` are all
absent from 6,470 exports, and genuinely removed rather than renamed.

Rather than keep an indefinite pin that also blocks security updates, the three
glyphs the site actually uses were lifted verbatim from the installed 0.577
package into `frontend/components/BrandIcons.tsx` — same paths, same props, so
no visual change — and lucide went to 1.59.0. Brand icons turned out to be the
only breaking change touching this repo: lint and build passed with no other
edit, all 60 SVGs render, and the `lucide-*` class convention is unchanged.

The dependabot ignore is gone, so lucide now takes routine majors like anything
else. Add any future brand mark to `BrandIcons.tsx` rather than taking a
dependency for it.

### Bedrock spend limit of $10/month — not possible as asked, and not wanted

Asked for a hard $10/month cap on Bedrock via AWS Settings spend limits
(<https://docs.aws.amazon.com/accounts/latest/reference/create-spend-limit.html>).
Four reasons it does not fit:

1. **The minimum is $20**, or a conservative estimate of likely spend, whichever
   is greater. $10 is below the floor.
2. **It is project-scoped, not service-scoped.** It cannot be pointed at Bedrock
   alone.
3. **Reaching it pauses the project and stops all resources.** On a public CV
   site that means the site goes down — a far worse outcome than an unexpected
   $15 bill. And if a paused project is left 90 days, AWS deletes its data.
4. **It is in limited release** and needs a Paid Plan in AWS Settings, so it may
   not even be available on the account.

What is already in place is better, because it is preventive and scoped: the
Lambda enforces a hard daily USD cap before calling Bedrock (`DAILY_USD_CAP`,
currently `0.10`, roughly $3.10/month), on top of per-IP burst and hourly
limits. Abuse is refused in-request rather than remediated after the fact.

If an extra net is wanted, an **AWS Budgets notification** at $10 is free,
needs no SCP, and cannot take the site down. Note that spend limits are
implemented *with AWS-managed SCPs*, which is its own reason for caution in an
account already under a Landing Zone Accelerator org whose Root is at the
5-policy attachment limit.

### Content filter for crude questions — already covered

Verified on dev. Both "does michael sniff butts" and "is michael any good or is
he full of shit" are blocked, with `in=0 out=0` — zero model tokens, because
`ApplyGuardrail` runs before `Converse`. The existing configuration handles it:
content filters at `HIGH`, the managed `PROFANITY` word list, and the
`GeneralAssistance` denied topic. No change needed.
