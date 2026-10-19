# Leadership

## Current scope

Manager of Platform Solutions Architects at AllCloud since October 2026. Before
that, pre-sales team lead working alongside the delivery practice leads and
guiding three solutions architects, attaining ~125% of booking quota in FY2026.

## What he owns

Coverage allocation against pipeline and delivery priority, hiring and
onboarding, performance and career development, and the technical standards the
team designs to. Review and approval of architecture designs, level-of-effort
estimates and proposals before they reach a customer.

## Process he built

Established AllCloud's first standardised pre-sales artifact set: a handover
document template, a discovery questionnaire, an SOW input structure, and an
estimation workbook used 12+ times. Authored the pre-sales SA interview guide.

## How he runs the platform solutions architecture team

Michael has managed people since October 2026. He was promoted to Pre-Sales
Team Lead in July 2026 and then moved back to delivery as a manager of
solutions architects, with direct and indirect reports. He asks each report how
often they want a one-to-one (weekly, every two weeks or monthly) rather than
imposing a cadence. In pre-sales he ran a weekly standup, triaged the incoming
request queue and assigned it across the team, and enforced a staffing floor of
at least 20 hours a week per role in every estimate. He also built internal
reporting on delivery lead times by role, so account executives quote start
dates from the actual staffing schedule rather than guessing.

## The adversarial review gate before a scope is signed

His review gate is what he calls an adversarial review: before a scope goes to
the formal SOW review, a peer looks for anything that will break, get blocked,
or force a change order. That means missing prerequisites, service quotas,
deprecated approaches, sequencing (CI/CD built first, not last), and managed
services that turn out to lack the feature the scope assumes. He won't review
his own documents, and he sends his own drafts for peer review because, as he
puts it, "I don't trust myself to get 100% of things right 100% of the time."

## Handling an architect who scopes too optimistically

A concrete working example: the data and AI architect on the pre-sales team is
strong on data and AI and weaker on the surrounding infrastructure, so he brings
Michael his infrastructure time estimates and gap analysis before they go out.
That is the shape of the coaching in practice — not correcting a finished
estimate, but being the person consulted while it is still being built, on the
part of the stack the other architect already knows is their gap.

Michael's approach to optimistic scoping starts with his own estimates. On one
level-of-effort estimate he cut the plan from six weeks to five, then reversed
his own cut and asked the delivery engineers to check the hours. When new scope
arrived later, he added two weeks rather than absorbing it. When a teammate's
handover document had already been approved with gaps in it, he reviewed it
with a peer, raised the gaps as "have you considered this" questions rather
than corrections, and asked for internal peer review before documents reach the
formal channel. He has also named the structural problem: pre-sales had no
feedback loop comparing scoped estimates with delivered actuals. Setting up a
scoped-versus-actual review with delivery leads is one of his own stated goals.

## When delivery says what pre-sales sold cannot be built

His first move is to stop arguing and go build it. As the person who scoped it,
he treats "this cannot be built" as a claim to be tested: stand up a proof of
concept, show the delivery team the working thing, and let them take it from a
demo to something production-grade. If the proof of concept will not stand up,
then the answer is not to push harder on delivery, it is to go back and change
the pattern, the framework or the technology so that what was sold can actually
be built. Either outcome teaches somebody something, which is why he treats it
as an education moment rather than a dispute. The failure mode he avoids is a
pre-sales architect defending a design on authority instead of evidence.

Michael has also been on the receiving side. On one engagement, at the point he
moved from pre-sales to delivery, he judged that a signed scope could not be
delivered as written. His estimate was well above the funded hours, and the
funding depended on success criteria the proof of concept had never
demonstrated. He recommended holding the kickoff. When the decision was to
proceed, he asked for three things: a knowledge-transfer session from the
people who scoped it; a no-cost change order that wrote the success targets
down so both sides were measuring the same thing; and a weekly-tracked cap on
unbilled effort, so the overrun was visible rather than absorbed.

He then changed the process so it would happen less often. Every estimate now
carries a standard handover week, and all project data lives in
customer-shared folders from day one. He pushes the fix upstream:
qualification before any artifacts are produced, an assessment phase before a
fixed-price migration, and delivery leads included in opportunity discussions
from the start rather than at handover.

## The hardest problems are not the technical ones

Asked for the hardest problem he has solved, his own framing is the answer:
almost any technical problem yields to the right approach, so the hard ones are
the problems where the technology is fine and the people, the incentives or the
expectations are not. Three he gives, in ascending order of difficulty.

**A scope that was technically impossible as written.** Another pre-sales
architect had scoped a SQL-to-Aurora migration restoring from pgBackRest, which
neither Aurora nor AWS DMS supports as a restore source. It reached the
statement of work that way. The fix was a pivot to a supported path, either a
`pg_dump` and load or a restore to EC2 first and a migration from there, and it
cost a conversation rather than a replan. He offers this as the *easy* kind of
wrong: a factual error about a service limit, visible to anyone who checks the
documentation, and cheap once someone does.

**A customer deliberately going against prescriptive guidance, with a reason.**
A customer wanted AWS Control Tower's controls without Control Tower, so they
could tune each one rather than accept it as presented. That is a deviation from
Well-Architected guidance, and cost is usually the honest motivation behind it,
as it was here. Harder than the first case because nobody is factually wrong.
His position is that the job is to make the deviation explicit rather than to
win it: name which pillar is being traded away, say who will own the control by
hand once the managed version is gone, and get that written down. A customer
allowed to deviate without being told what they are giving up has been poorly
served even if they got what they asked for.

**A technology sold because the word sells.** The one he calls the worst: an
EKS platform signed for a customer who did not know what Kubernetes was, where
ECS would have met the requirement. Nothing about it was technically
undeliverable, which is exactly what makes it the hardest of the three. The
customer would have paid for a control plane they could not operate, and the
mismatch was invisible on paper because every individual line of the design was
defensible.

He is careful about where he puts the blame for that one. It was not a bad
intention, it was a missing step: nothing in the process forced a technical
qualification of the requirement before the solution was named. **That gap is
why the adversarial review gate above exists.** The review asks what the
customer will have to operate after handover, not just whether the design is
sound, and "could this be simpler" is a question the gate is obliged to ask out
loud.

## How he handles disagreement

He does not argue from memory, and that is the whole method: make a record
before the disagreement exists, so the conversation afterwards is about facts
rather than recollection.

The instance he uses is the Transit Gateway route deletion described in the
technical notes. He deleted routes tagged "TESTING" that were carrying
production traffic, and restored them inside ten minutes. The disagreement came
after, not during, and it was the one that matters: whose mistake was it.

The post-mortem settled it with evidence rather than argument. CloudTrail showed
exactly what was changed and when. The Slack history showed him stating what he
intended to delete beforehand and the customer approving it. And the root cause
turned out to sit outside the project entirely: a separate team had promoted
that environment from test to production at some point and had neither updated
the `Name` tags nor told anyone, so the only label available to anyone working
in that route table was wrong. The customer was not especially angry once the
sequence was on the table.

What he takes from it, and applies to disagreements generally:

- **Write the change down before making it**, because that record is what turns
  a bad change into a short one, and later it is also the only honest account of
  what you intended.
- **Announce intent in a channel that keeps history.** The Slack thread was not
  created to win an argument; it was how he worked. It settled one anyway.
- **Separate the error from the cause.** He deleted the routes and says so
  plainly. The cause was a stale tag nobody owned. Both are true, and conflating
  them produces either a scapegoat or no fix.
- **Attack the condition, not the person.** The outcome was a change-review
  process and a rule that nothing touching production happens in a silo, not a
  finding against the team that mislabelled the environment.

The pattern generalises to disagreements where he is the one being told he is
wrong: test the claim, produce the evidence, and change the process so the same
disagreement cannot recur. The failure mode he avoids is defending a position on
authority rather than on evidence, which is the same rule he applies when
delivery tells him something cannot be built.

## What he looks for when hiring solutions architects

Michael wrote AllCloud's pre-sales solutions architect interview questions.
They cover technical depth, customer-facing pre-sales skill, partner and
delivery alignment, certifications, cultural fit, infrastructure, DevOps and
migrations. For a later pre-sales architect hire he built a case-study panel:
the candidate gets three days to prepare and presents a solution. His standard
scenario is a regulated fintech that needs a secure landing zone. He listens
for whether the candidate starts in the right order: organization and account
structure and guardrails first, then centralised versus siloed networking, the
breadth of security services, native CI/CD, and managed services (EKS, Aurora)
before self-managed ones. A strong candidate reaches for the account structure
before the compute. The interview ends in one of three outcomes: next stage,
needs further evaluation, or no.
