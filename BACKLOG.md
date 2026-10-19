# Backlog

> **If you have arrived here from the repository, read this first.**
>
> These are working notes, kept in the open deliberately. Each entry records
> what was measured, what was decided and what was rejected, including defects
> and the fixes for them. A bug written up here has already been fixed, and the
> write-up exists so the same mistake is not made twice; several entries
> describe the site's own chat assistant getting something wrong, which is what
> finding and fixing a defect looks like when the record is honest.
>
> It is not a showcase and it is not polished. The polished version of this
> repository is [`README.md`](README.md).

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

### 2. KMS is 80% of the AWS bill, and it is all LZA keys

Measured 18 Oct 2026. **This repo creates zero customer-managed keys**, so
nothing here is the lever; the fix, if there is one, is in
`~/repos/GitHub/grofflabs-lza/`.

The charge is almost purely per-key rent, not usage. September: **$6.9708 for
6.97 key-months and $0.0004 for 148 requests.** Seven customer-managed keys in
us-east-1 at $1/month each, every one tagged `Accelerator: AWSAccelerator`,
all created 2026-04-21. Other regions return `AccessDeniedException` from the
region-lockdown SCP, so us-east-1 is the whole picture for this account.

| Key | Alias |
|---|---|
| Lambda env var encryption | `alias/accelerator/kms/lambda/key` |
| SQS queues | `alias/accelerator/kms/sqs/key` |
| CloudWatch log groups | `alias/accelerator/kms/cloudwatch/key` |
| EBS default encryption | `alias/accelerator/ebs/default-encryption/key` |
| General-purpose S3 | `alias/accelerator/kms/s3/key` |
| General-purpose S3 | **no alias** |
| General-purpose S3 | **no alias** |

**The lead worth chasing: three keys share the description "general-purpose S3
buckets created by LZA" and two of them have no alias.** That is the shape of
orphans from an LZA redeploy, where the alias moves to a new key and the old one
is retained because LZA sets a retain policy on KMS keys on purpose. If so it is
~$2/month, about 29% of the KMS bill, for nothing.

**Do not delete them on that inference.** Deleting a key that still protects
objects makes those objects permanently unreadable, and this was not verifiable
from this account:

- `s3:ListAllMyBuckets` is denied by the Root RCP, so bucket-to-key references
  cannot be enumerated here.
- A CloudTrail 90-day lookup on all three key ARNs returned **zero events for
  all three, including the aliased key LZA certainly uses**. That proves the
  lookup is blind to KMS data-plane events, not that any key is idle. Treating
  that zero as evidence would have been the wrong call.

Verify from the management or log-archive account instead, where bucket
enumeration is permitted, or from a CloudTrail data-event trail if one is on.

**On reducing it org-wide, the honest answer is mostly no.** Each key is
per-account-per-region, so the bill is accounts x regions x enabled key
features. The EBS and SQS keys cost $1/account/month whether or not any EC2
instance or queue exists, and dropping them to save $1 each trades a security
control for pocket change. The real lever is not adding accounts and regions
that are not needed: at seven keys per account, a five-account org is $35/month
of key rent. Worth knowing before the org grows, not worth optimising now.

For scale: LZA's security tooling (KMS $6.97 + Macie $0.60 + GuardDuty $0.27)
was 89% of September's $8.77 bill. The CV site itself was S3 $0.31 and
CloudFront $0.0000. **The landing zone is the cost; the website is free.**

### 3. Retrieval has no typo tolerance

Found in the Oct 2026 edge-case sweep and deliberately left. Measured: `kubernets`,
`terrafrom` and `aws lamda` all return **nothing at all**, while the correctly
spelled terms score 1.00. Prefix matching covers word endings, and
`prefixCredit`'s morphological tier now covers verb and noun forms, but neither
helps a transposition or a dropped letter.

Worth noting because visitors typo and a miss here is silent: the assistant says
the CV does not cover it, which is indistinguishable from the honest version of
that answer.

The fix is small and known: Damerau-Levenshtein distance 1 against corpus tokens,
for unknown query tokens of five characters or more. Distance 1 with
transposition covers all three measured cases (`kubernets` is one deletion,
`lamda` one deletion, `terrafrom` one transposition). About 25 lines, no
dependency, and it runs over ~2,000 distinct tokens so cost is negligible.

Not done yet for one reason: it widens matching, and that is the direction that
produces confident wrong answers. Every retrieval defect found this month came
from matching too eagerly rather than too little. It needs the same measured
before-and-after that the morphology change got, with the negative cases checked
first, so it is its own change rather than a rider on this one.

Two smaller sweep findings, both lower value:

- `CI/CD` reports broad, because `tokenize` splits on `/` and both halves are
  two characters, which the length filter drops. Normalising `ci/cd` to `cicd`
  before tokenising would fix it; the existing alias already maps `cicd`.
- `node.js` scores 0.40. The tokeniser keeps the dot, so it never matches the
  corpus's `node`.

### 4. Corpus content only Michael can supply

From a 49-question recruiter audit, Oct 2026. Everything that was a *vocabulary*
gap is already fixed; these are the ones where the fact genuinely is not written
down anywhere, so they need him rather than a code change. Roughly in order of
how often a recruiter asks.

**1. The eleven industries, named.** The résumé claims "17 AWS engagements across
11 industries" and the corpus can name six: security software, public sector,
heavy industry, HR technology, healthcare, and software/SaaS. "Has he worked in
<industry>" is a screening question, and today the honest answer for retail,
manufacturing, energy, education, logistics and so on is silence. Needs the
list, and the anonymisation rules in `knowledge/README.md` still apply: sector
only, no customer, no re-identifying combination.

**2. Compliance frameworks beyond the ones recorded.** HITRUST, IL4/IL5, DISA
SRG and OMB M-21-31 are covered. SOC 2, PCI DSS, GDPR, ISO 27001 and NIST
800-53 return nothing. Any of these is a hard filter on a job spec, so a yes
worth claiming is worth writing down, and a no is worth saying plainly.

**3. The hardest problem he has solved.** Scores 0.39. The corpus has failures
(the TGW change, the Glue experiment) and engagement detail, but nothing framed
as "the hardest thing", which is the single most common depth probe in a
hiring-manager screen. One section, one problem, why it was hard and what the
constraint was.

**4. How he handles disagreement.** Scores 0.42. The adversarial review gate and
the over-optimistic architect are both in the leadership notes, but neither is
written as "here is how I disagree with someone senior and still ship". Common
behavioural question and he clearly has the material.

**5. Notice period and start availability.** Partly covered by the availability
signal, but "when could you start" and "what is your notice" get a vague answer.
Cheap to fix and asked in the first five minutes of every screen.

Deliberately NOT to be filled, because the current behaviour is right:
compensation (guardrail-denied), visa sponsorship and work authorisation (rule
10, protected characteristics), references (not public), and whether he is
interviewing elsewhere.

### 5. Decided against: an unread badge on the chat launcher

Raised Oct 2026 as "should we have it ding and show a notification like some
sites do". **No**, and the reasoning is worth keeping so it is not revisited as
an oversight.

An unread count is a truth claim: it says something is waiting for you. On a
support widget that is true, because a human replied. Here nothing is waiting,
so the badge would be a fabricated signal on a site whose entire chat feature is
built around not fabricating things. The assistant shows its tool calls and
admits when it has no answer; a fake "1" beside the launcher contradicts that
posture for a few extra clicks.

A recruiter is also the wrong audience for it. They have come to evaluate
someone's judgement, and growth-hacking patterns read as a tell.

What is already in place and is the honest version: a one-time bubble that
appears after a dwell or a scroll, says what the assistant is for, and never
returns once dismissed. If more pull is wanted later, the next acceptable step
is a permanent text pill reading "Ask my CV" instead of a bare icon, which was
offered and declined when the widget was built. Sound or motion to attract
attention is not on the table.

### 6. Decide on S3 Vectors from two months of real traffic

**Deliberately waiting until ~20 Dec 2026, with instrumentation added first.**

The alias map crossed its own tripwire in Oct 2026: 31 entries over 18 distinct
target sets, 11 of them singletons. The map exists to patch vocabulary gaps
keyword search cannot bridge, and `retrieval.test.ts` asserted it stay small on
the explicit basis that growth is the evidence embeddings have become worth
paying for. The threshold was replaced with a measure of distinct target sets
rather than raised, because raising your own tripwire twice is how a recorded
decision becomes a habit.

**The decision is now waiting on usage rather than on argument,** which is the
right call: every gap found so far was found by someone asking, not by the
retriever reporting low confidence, so the sample is whatever happened to be
tried rather than what visitors actually want.

Three things had to be fixed before the clock could start, or the wait would
have produced nothing:

1. **Nothing logged the query, the coverage or whether retrieval was weak.** The
   log carried turn counts, tokens and cost. Useful for the spend reconciliation
   and useless for this.
2. **`toolsUsed` was holding citation anchors, not tool names.** The one field
   anyone would reach for to answer "which tools actually get used" was quietly
   wrong.
3. **Prod log retention was one month.** A two-month window would have lost its
   own first month. Now three.

What is logged per turn, as of Oct 2026: `toolsCalled` (real names),
`citedAnchors`, and `unknownTerms`. That last one is the residue of a search
query after aliases and morphology have had their turn, so it is the set of
words nothing in the corpus could reach.

**The question itself is not logged, and that is a decision rather than an
omission.** This site has no privacy policy, and storing visitor-entered free
text in CloudWatch is a different class of exposure from storing a handful of
derived nouns. `["pressure", "soc2"]` says what to write next without recording
what anyone asked.

What to look at in December, and what each answer implies:

- **`unknownTerms`, by frequency.** A short head of repeated words is a content
  backlog: write those sections, no vectors needed. A long flat tail of
  near-synonyms for things the corpus already covers is the case for embeddings,
  because that is the shape a map cannot keep up with.
- **How often `lowConfidence` fires on questions that do have answers.** High
  means retrieval is the bottleneck. Low means it is not, whatever the alias
  count says.
- **`toolsCalled` distribution.** If `get_highlights` dominates, the problem is
  tool selection rather than retrieval, and that has already needed fixing
  twice.

Costs, unchanged and re-verified Oct 2026: **S3 Vectors $0.000055 a query**,
about +5.8% on a $0.00096 turn, ~$0.00006/month of storage for roughly 1 MB of
vectors, ~$0.00075 to embed the corpus once. A **managed Knowledge Base is
$0.001 a query**, which more than doubles a turn and stays disqualified.

A hybrid is the likely answer rather than a replacement: vectors for the
genuinely semantic aliases (`dogs` to `husky`, `conflict` to `disagreement`),
keep the map for acronyms embeddings handle unevenly (`k8s`, `iac`, `lz`,
`dod`), and treat the morphological entries (`hired` to `hiring`) as a
`prefixCredit` tuning question instead.

**Caveat on sample size.** Prod chat had one real turn at the time of writing.
CloudFlare reports roughly 87 daily uniques, and a new widget converts a small
fraction of those, so two months might yield anywhere from dozens to a couple of
hundred turns. That is enough to see a shape and not enough for statistics; if
December's logs are thin, the honest move is to wait longer rather than to read
tea leaves.

---

## Closed

### Test sweep: 153 to 218, plus a deployment smoke script

Asked to go bug hunting. **No bugs were found in the backend**, which is a
result worth recording rather than a disappointment: 65 new assertions across
three previously untested modules all passed first time.

What had no coverage, and why each mattered:

- **`limits.ts` had none at all**, and it holds the IP hashing, the rate limiter
  and the spend cap. It is the only thing between this feature and a surprise
  bill. The reconciliation against a real bill had verified the *constants*, not
  the function that multiplies them.
- **`tools.ts` had coverage for one handler of seven.** The model is the only
  caller and a model will pass a string where a number belongs, so every
  handler is now called with thirteen junk-argument shapes.
- **`types.ts` and `knowledge.ts` had none.**

The most useful new test is `estimateMicroUsd` **linearity**: doubling each
input in turn and asserting the result moves. The PII term was missing for weeks
and nothing caught it, because every existing test used the same shape. That
class of bug cannot survive this test.

Two properties now pinned that were previously only comments: every tool
citation resolves to a real page anchor, and `list_certifications` never emits
a currency or status word, which is a documented decision that contradicting
would put the assistant at odds with both the site and the résumé.

**One genuine latent bug, found by reading rather than by a failing test.**
`ChatPanel`'s NDJSON reader breaks on `done` without flushing its buffer. That
is correct *only* because `encodeEvent` always appends a newline, an invariant
held across two files that do not import each other. Remove that newline and
the last event of every turn vanishes with no error: the `done` event never
arrives, the turn never marks itself complete, and the caret blinks forever.
Now commented at the parser and pinned in `wire.test.ts`.

**`scripts/smoke.sh` is new**, and tests the deployment rather than the code: 24
checks, offline-safe to run, costing nothing. Every check corresponds to
something that has broken or that fails silently, the three worst being a wrong
Plausible filename served as the site's own `/404.html` with a 200, an unset
`CHAT_ENABLED` silently removing the chat, and an OAC signature failure
rewritten to HTML. The `/api/chat` check sends a correctly hashed but invalid
body, so it exercises the whole signed path without a model call. Deliberately
not part of `check.sh`, which has to keep working with no network.

24/24 against both prod and dev at the time of writing.

### Still untested, and deliberately so for now

The frontend has no test harness. `ChatWidget`, `ChatPanel`, `chatPanel.ts` and
`trackChat.ts` are covered only by the browser checks run by hand and by
`smoke.sh` against the built output. Adding jsdom and a component-testing
library is a real dependency decision for a site whose only interactive
JavaScript is the chat widget, and the highest-risk piece of that code, the
NDJSON parser, is now pinned from the Lambda side by `wire.test.ts`. Revisit if
the frontend grows a second interactive feature.

### Spend constants reconciled against a real bill

Closed 19 Oct 2026, four days after the price-list half. Bedrock finally
appeared in Cost Explorer with per-SKU detail, and **every rate in `PRICES` is
exactly right**:

| SKU | Actual, 18 Oct | Implied rate | Constant |
|---|---|---|---|
| `NovaLite-input-tokens` | $0.00547908 / 91.318k | $0.06/1M | `0.06` |
| `NovaLite-output-tokens` | $0.000678 / 2.825k | $0.24/1M | `0.24` |
| `Guardrail-ContentPolicyUnitsConsumed` | $0.00795 / 53 | $0.15/1K | `0.15` |
| `Guardrail-TopicPolicyUnitsConsumed` | $0.0045 / 30 | $0.15/1K | `0.15` |
| `Guardrail-SensitiveInformationPolicyPaidUnitsConsumed` | $0.0053 / 53 | $0.10/1K | `0.1` |
| `Guardrail-WordPolicyUnitsConsumed` | $0 / 53 | free | omitted |

**The open question is answered: sensitive-information units bill at the PAID
rate.** AWS documents neither the free/paid split nor what makes a unit free, so
the code took the paid reading on the grounds that over-counting trips the cap
early while under-counting leaves it somewhere other than where it claims. That
was correct rather than merely cautious, and the 20.9% undercount it fixed was
real money.

Two omissions also confirmed right: word policy bills $0 despite consuming 53
units, and no contextual-grounding or automated-reasoning lines appear at all.

**The unit model holds.** Content 53 units against 52 expected at two per turn,
topic 30 against 26 expected at one per turn. That asymmetry, measured earlier
from a live `ApplyGuardrail` call, is what the bill actually charges; the extras
are consistent with guardrail-blocked turns, which spend input units and no
output ones.

Reconciliation on the one complete day: actual **$0.023907**, counters
**$0.017458** over 26 turns, so the counter read 27% low. **$0.0052 of that
$0.00645 gap is the PII term landing partway through that same day**, so early
turns were recorded without it. Residual 5.2%, inside the ~20% tolerance.

Only 18 Oct was usable. 19 Oct was still `Estimated` and in progress, and
comparing a partial day against a full counter is how a reconciliation produces
a confident wrong answer. Worth one re-check on a clean post-fix day, which
should land within ~5% rather than 27%; if it does not, the constants moved.

### Chat alarms, with SNS email

There were zero alarms and zero dashboards, so a chat throwing on every request
looked exactly like a chat nobody used: empty spend counter, quiet logs, feature
dead and the evidence resembling disinterest.

Three alarms, prod only, each wired to an SNS topic with an email subscription:

| Alarm | Threshold | Why |
|---|---|---|
| `cv-chat-errors-prod` | `Errors >= 1` / 5 min | One unhandled exception is worth knowing at this traffic |
| `cv-chat-throttles-prod` | `Throttles >= 1` / 5 min | Account concurrency quota is 10, shared with ~15 `AWSAccelerator-*` Lambdas. Documented as accepted, never instrumented until now |
| `cv-chat-flood-prod` | `Invocations >= 300` / hour | The daily cap bounds Bedrock, but rejected requests still cost ~$2.70 per million. A smoke detector, not a circuit breaker |

Prod only on purpose: dev exists to be broken while testing, and alarming on it
would train everyone to ignore the emails. A test asserts dev creates none of
them *with chat otherwise fully enabled*, so it cannot pass for the wrong
reason.

`treatMissingData: NOT_BREACHING` on all three, because at this traffic most
five-minute windows have no datapoints and the default would leave every alarm
permanently INSUFFICIENT_DATA, which looks identical to broken monitoring. A
test asserts every alarm has an action, since an alarm without one is visible
only in a console nobody opens.

**The LZA pre-flight was done against the live policy JSON before writing any
CDK**, which is the step that would otherwise have cost a rolled-back deploy:

- `sns:*` appears in the org SCP only under `DenyExternalSNS`, which fires when
  `aws:ResourceOrgID` differs from the principal's org. An in-account topic does
  not match.
- **SNS is absent from the `DenyResourceAccessFromUntrustedNetworks` RCP action
  list** (s3, kms, sqs, secretsmanager, ecr, aoss, sts, dynamodb, logs,
  cognito-identity), so unlike the counters table and the log group this topic
  needs no `LZA:EXC:NET` tag. A test asserts nobody adds one by copying the
  table, because `sns:TagResource` with an `LZA:*` key is separately denied.
- `DenyLZASNSChanges` and `DenyLZACloudWatchAlarmChanges` are scoped to
  `AWSAccelerator-*` ARNs. A test asserts that prefix appears nowhere in the
  template, since using it would make our own resources undeletable by our own
  deploy role.
- `EmailSubscription` renders a native `AWS::SNS::Subscription`, so the standing
  jest assertion that no `Custom::` resource exists still holds.

**One manual step, once:** AWS emails a confirmation link and SNS delivers
nothing until it is followed. That is the only hand step in this repo and it was
an explicit decision, because the alternative was alarms with no action.

### The assistant denied its own page, and three defects were behind it

A visitor asked *"does Michael like dogs"* and got *"the CV does not mention
anything about his preference for dogs"*, while the About section said "two
Huskies". Fixed, and the diagnosis is worth keeping because only one of the
three causes was about retrieval quality.

**1. The content was never in the corpus.** `corpus.ts` reads data modules,
`resume.md` and `knowledge/`; it cannot import React. The pets, the hometown and
the **Top 5 CliftonStrengths** were hardcoded in `AboutMe.tsx`, and the whole
"About this site" section, including the design trade-offs, in
`ProjectShowcase.tsx`. So "what are his strengths" and "why no WAF" were
unanswerable too. Extracted `frontend/lib/data/about.ts` and `project.ts`; the
components render from them, so the page and the assistant cannot disagree.
`inCorpus: false` keeps certain family details out of the corpus while the
page still shows them.

**2. Retrieval was confidently wrong, which is worse than missing.**
`queryMass` used `idf.get(q) ?? 1`, so a term absent from the corpus scored 1
while a merely rare present term scored up to 5.5. `dogs` was absent and worth
1; `like` appeared in two of 250 passages and was worth 4.83. The query was
judged almost entirely on "like", matched *"Patterns & Practices: How I like to
build"*, and reported **0.83** confidence. The model read that, found no dogs,
and answered correctly: **retrieval lied to it.** An absent term is the
strongest evidence the corpus cannot answer, so it now weighs
`UNKNOWN_TERM_WEIGHT`. Same query: 0.47, correctly weak. Two more confident-wrong
answers went with it ("how is this site built" scored 1.00 on the *availability*
passage).

**3. The tool catalogue sent specific questions to the wrong tool.**
`get_highlights` ended with "prefer this over search_experience whenever the
question does not name a specific technology, employer or metric", and a pets
question names none of those. Worse, with one unrelated highlight as context the
model **invented a dog named "Sadie"** while saying the CV did not mention dogs.
Then, asked for his CliftonStrengths, it listed five plausible Gallup themes with
three wrong and **no tool call at all** — caught by the "No lookup" notice, which
fired in a browser for the first time.

The structural fix for that last one is `toolChoice: { any: {} }` on the first
hop, which Nova documents as "at least one tool will be called". Prompt rule 2
had enumerated the topics requiring a lookup, so anything off the list was fair
game to answer from priors; enumerated lists grow gaps. Forcing the call removes
the option instead of asking for it, and the tools are in-process keyword search
so it costs nothing.

Verified on dev afterwards: "does Michael like dogs" returns the Huskies and the
tabby with an `#about` citation; "what is his dog named" answers "he has two
Huskies" without inventing one; CliftonStrengths returns the correct five;
"why is there no WAF" gives the real trade-off and the ~$5/month; "does he have
kids" is refused. Every turn called a tool.

Retrieval is now asserted in `infrastructure/test/retrieval.test.ts` rather than
an esbuild heredoc in `check.sh`, with the negative cases that matter, and
`test/markdown-transform.js` gives jest the `*.md` loader esbuild has. 30 tests
to 57.

Two `.gitignore` traps surfaced on the way, the second a near-repeat of the
`md.d.ts` incident: the root tsconfig excludes `lambda/` but an import pulls it
in, so it needs `md.d.ts` via `files`; and `*.js` would have silently swallowed
the new jest transform, so `test/**/*.js` is now negated.

### Knowledge Base and vector search: re-costed, still no

Settled with current figures rather than October's, since the dogs failure looked
like it might be the documented trigger for revisiting. Per query, from the
Price List API:

| Option | Per query | Against a $0.000956 turn |
|---|---|---|
| Keyword, today | $0 | — |
| + the `ALIASES` map | $0 | — |
| Build-time embeddings in the bundle | ~$0, +$0.00075/deploy | +0% |
| S3 Vectors | $0.000055 | +5.8% |
| Managed KB retrieval | $0.001 | **+104%** |
| OpenSearch Serverless | $88-350/month floor | — |

Titan Embeddings V2 is $0.00002/1K tokens, so embedding all ~270 passages costs
about $0.00075, and S3 Vectors storage for ~1 MB is ~$0.00006/month. Embeddings
are affordable; **managed KB retrieval is the one disqualifying number**, which
is where October landed too.

It was **not** the trigger, and the distinction is the point: the dogs answer was
never *present*, so no amount of semantic search would have found it. Vocabulary
gaps that remain real, `dogs` against `Huskies` and `k8s` against `kubernetes`,
are handled by a curated corpus-aware `ALIASES` map at zero cost. Its length is
the signal: `retrieval.test.ts` asserts it stays under 30 entries, and if it
keeps growing, S3 Vectors is the thing to reach for and a managed Knowledge Base
still is not.

### The assistant can no longer print a fabricated tool result

Seen once on dev, 19 Oct 2026: "Tell me about the Azure to AWS assessment" came
back opening with the literal line *"Tool result: No relevant information
found."* while the request logged `hops:1, toolsUsed:[]`. **No tool was called.**
Nova Lite wrote a plausible tool transcript as prose rather than emitting a
`toolUse` block, then fell back to the contact handoff. Retrieval handles that
query at coverage 1.00, so the passage was present and reachable the whole time.

It mattered out of proportion to one bad answer, because the section tells
visitors the assistant "looks things up rather than guessing, and shows you
which tools it called". A fabricated result is the one artifact that must never
reach them: it is indistinguishable from evidence.

Fixed on both sides, because stripping the line alone would have left an
unsourced answer looking exactly like a sourced one:

- **`stripReasoning` moved to `lambda/chat/sanitize.ts` and extended.** It now
  drops line-anchored `Tool result:` / `Tool call:` / `Observation:` and the
  related forms. Anchored to the line start on purpose, since those words are
  ordinary English and appear in real answers about his own work. Extracted to
  its own module because `index.ts` cannot be imported from a test: it builds a
  Bedrock client and calls `awslambda.streamifyResponse` at module scope.
- **The trace now says when nothing was looked up.** `Chat.tsx` gained a
  `complete` flag set on the `done` event, needed to tell "still streaming, no
  tools yet" from "finished and never called one", and renders
  *"No lookup · answered from the system prompt"* for the latter. Suppressed on
  error, where the message is the point.

A useful consequence of stripping: when the invented line was the *entire*
answer, `answer` is now empty, which hits the existing re-prompt path in
`index.ts` that re-asks with tools withheld. So the visitor gets a real answer
rather than a blank bubble.

Guarded by `test/sanitize.test.ts`, 12 cases, including the exact observed text
and a negative case asserting a genuine mid-sentence "tool result" mention
survives. Stack assertions went from 18 tests to 30.

Not reproducible on retries before the fix, so the trigger is phrasing-dependent
and the root cause is model behaviour, not a bug in the loop. The handler cannot
stop the model inventing a lookup; it can stop the invention reaching a reader
and stop the UI implying evidence that does not exist.

**Verification status, stated precisely, because the two halves are not equally
proven.** The strip is covered by unit tests against the exact observed string.
The "No lookup" notice is reasoned and typechecked but has **not been seen
firing in a browser**: producing it needs a turn that completes successfully
with zero tool calls, and the model cannot be made to skip a lookup on demand.
The same question that failed before the fix now calls `search_experience`
correctly. The one case that does reliably finish without tools is a
guardrail block, where the notice is suppressed by design, confirmed on dev.
If a zero-tool success ever shows up in the logs
(`filter outcome="ok" and toolsUsed=[]`), check that the notice rendered.

### Public-repo exposure reviewed: stays public, with the account id pulled

Reviewed 18 Oct 2026 across all 118 commits. **Verdict: keep it public.** The
repo's value is that it is public, and nothing found was a reason to reverse
that.

**No history rewrite needed, and that was measured rather than assumed.** All
2,948 objects in `--all` history were scanned for `AKIA`/`ASIA` keys,
`aws_secret_access_key`, PEM private-key headers, Slack `xox*` tokens, GitHub
`ghp_`/`github_pat_` tokens, `sk-` API keys and JWTs: zero hits. The temporary
AWS credentials file deleted in Oct 2026 never entered git; it is absent from
the full list of files ever deleted. Secret removal is the usual reason to
rewrite, so there is no trigger.

**Done: the AWS account id is no longer published.** It is gone from
`cdk.json`, `bin/infrastructure.ts` and `CLAUDE.md`. Not a credential, and with
the data-perimeter RCPs not directly exploitable, but it was the one handle that
made the rest targetable (support-desk impersonation, cross-account trust
probing, bucket and ECR enumeration) and a forker has to replace it anyway.

`bin/infrastructure.ts` now **throws** instead of defaulting. That is the point
of the change as much as the removal is: a wrong-but-present id synthesises a
template aimed at someone else's account and fails late or not at all.
`deploy-infra.yml` passes `CDK_DEFAULT_ACCOUNT` from the existing
`vars.AWS_ACCOUNT_ID`, and `ci.yml` falls back to `000000000000` so synth still
runs in a fork that has set nothing. Verified both ways: the app throws with the
variable unset, and synths with a dummy id. Note the `cdk` CLI sets
`CDK_DEFAULT_ACCOUNT` itself once credentials resolve, so a local `cdk synth`
on an `aws sso login` session needs nothing extra, and testing the throw means
running the app directly rather than through the CLI.

**Done: two engagement write-ups widened.** `knowledge/20-engagements.md` never
named a customer and the gate enforces that, but re-identification works on
aggregates no name check can catch. The extractive-industry label became
"global industrial enterprise", "a government contract deadline" became "a
fixed contractual deadline", "US public-sector customers" became
"public-sector customers", and every exact month describing something that
happened to a customer became a year or a season. Michael's own role dates
stayed exact, since they are on his LinkedIn already. No engineering detail was
trimmed, because that is the value of the file and not the risk. The two rules
are now written at the top of that file so later edits follow them.

**Declined, deliberately: the EKS incident detail stays.** The strict-mTLS
Fluent Bit breakage, the RDS connection slots, the five-service outage and the
Keycloak stale-secret root cause were raised as a customer-sensitivity question
and the owner's call was to keep them. They are anonymised and they are the
part of that write-up that demonstrates triage rather than claiming it.

**Also kept: the LZA control-plane detail in `CLAUDE.md`.** It names SCP and RCP
statements, the `LZA:EXC:NET` tag key, the `cv-chat-*` carve-out and its being
load-bearing, and carries a copy-pasteable probe command. None of it is
exploitable without credentials already inside the account: the carve-out only
helps a principal that already holds `lambda:CreateFunction`. Recon value, not a
vulnerability, and the best evidence in the repo of operating under a real
policy regime.

**Also kept: `BACKLOG.md` itself.** Keeping it was the specific question asked.
The documented negative results with numbers, the Glue and Athena experiment
that produced nothing, the $350 OpenSearch floor, why WAF costs more than it
protects, are the hardest thing here to fake and carry almost no exposure.

**Done: added a `LICENSE`.** There was none, which contradicted the repo being
described as a fork-able template, since with no license nobody may legally
reuse it. MIT on the software, with the personal content carved out as all
rights reserved: the resume, `knowledge/`, the data modules, the images, the
WordPress archives and the vCard describe one person's career and are published
so the site and its assistant can serve them, not for reuse.

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
