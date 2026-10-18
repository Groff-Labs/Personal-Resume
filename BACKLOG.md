# Backlog

Parked work for michaelgroff.info, newest batch first. Each item carries enough
context to pick up cold. `CLAUDE.md` holds the operational rules; this holds the
intentions.

Closed items stay for a while with their answer, because "we looked at this and
decided no" is worth more than silence.

---

## Open

### 1. `resume.md` download exposes editor comments

The footer's "Résumé (Markdown)" link serves a file whose first two lines are
build instructions:

```
<!-- Edit this file, then run `cd frontend && npm run resume` to rebuild resume.pdf -->
<!-- House style: no em dashes. Use commas, semicolons, colons, or "·". -->
```

A recruiter downloading the Markdown gets a note telling them not to use em
dashes. The PDF is unaffected (the renderer drops comments) and so is the chat
corpus (`splitSections` strips comments), so this is only the published `.md`.

Fix: strip HTML comments in the copy step in
`frontend/scripts/build-resume.mjs`, where `resume.md` is copied to
`frontend/public/resume.md`. Keep the comments in the source file — they are
useful there. Two lines, no behaviour change elsewhere. Verify with
`curl -s https://michaelgroff.info/resume.md | head -3`.

### 2. Run `/unslop` across the repo

Pass over prose a human reads: `README.md`, `CLAUDE.md`, this file, the
`knowledge/` corpus, UI copy, and recent commit messages. The `knowledge/`
corpus is the highest-value target, since it is published under his name and
was partly machine-drafted.

Coordinate as a review, not a rewrite: take the recommendations, apply the ones
that make the prose plainer, and reject anything that flattens a deliberate
phrasing. Several passages are deliberately blunt and should stay that way.

### 3. Update the Lucid architecture diagram for the chat feature

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

### 4. Wire up AgentTeam for this repo

Configured for the `Vaultry-*` repos but not here. Decide which role agents
earn their place in a mature static site plus one Lambda — probably
`roles:cloud-iac-engineer` and `roles:devops-sre`, possibly
`roles:fullstack-engineer` for the chat UI. The `ops:*` agents assume
production services with Sentry and ECS, which do not exist here.

---

## Closed

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
