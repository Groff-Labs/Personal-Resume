# Recruiter FAQ

Short, factual answers to the questions that come first. If one of these is
stale the assistant will state it confidently, so keep it current.

## Where he is based

San Antonio, Texas. Recent roles have been remote with San Antonio as the base.

## Remote, hybrid or onsite

Remote only. He is comfortable with some travel, in the range of 5 to 20%, but
not with a hybrid or onsite requirement.

## Travel

He prefers roles with little travel. Travel-heavy work is not for him, though
he travels occasionally when a customer engagement needs it.

## Current availability

The site's availability signal is the single source of truth and the assistant
reads it from `frontend/lib/data/status.ts` via the
`get_availability_and_contact` tool, so it cannot disagree with the pill shown
under the headshot. Change it there, not here.

## References

Available on request, and not published here. Ask Michael directly and he will
arrange them; naming former colleagues and managers on a public page is their
decision to make rather than his.

Worth saying explicitly because "who are his references" otherwise matches the
reference-architecture work scattered through this corpus, which is a different
sense of the word entirely.

## Notice period and start date

He is not under a contractual notice requirement. He would give two weeks,
because that is the industry standard at his level and leaving a team mid-sprint
is not how he wants to be remembered. Anything shorter is worth asking about
directly rather than assuming.

## What he is looking for next

A people and business leadership role where the technical and commercial
knowledge both get used — Manager, Director or VP scope. He is interested in
product and software companies, and in organisations still adopting cloud that
need someone cloud-native on their side of the table rather than only on the
vendor's. He particularly enjoys building the internal tooling a delivery or
pre-sales team runs on, and wants to be somewhere he can visibly move the needle
rather than be one more cog.

Industry is open: professional services, software, logistics, oil and gas,
healthcare have all appealed. The one real filter is that the company has to
genuinely value technology and invest in it. He would rather not work for a
private-equity or venture-capital-owned business, though he recognises that
narrows the field.

## Industries and sectors he has worked in

Asked as "has he worked in <industry>", which is a screening question, so it is
answered in the words a recruiter uses rather than left implicit in the
engagement write-ups.

Industries, across his whole career:

SaaS and ISV software products · healthcare and health tech · financial
services, regtech and compliance · capital markets and securities exchange ·
life sciences and pharma · adtech, marketing and media · mining and natural
resources · legal tech and professional services · transportation and logistics
· HR tech, talent and recruitment · oil and gas · cybersecurity · education ·
energy and utilities · AEC and engineering.

Grouped as verticals: software and internet · healthcare and life sciences ·
financial services · advertising, marketing and media · professional and
business services · energy, utilities and natural resources · public sector and
regulated workloads · transportation and logistics · manufacturing and
industrial · telecommunications · retail and consumer goods.

**The résumé's "17 AWS engagements across 11 industries" is a narrower figure on
purpose: it counts the AllCloud delivery period only.** The list above is the
whole career, so the two numbers are not in conflict and neither should be used
to inflate the other. If someone asks how many industries, ask which they mean.

Where an engagement is written up in detail, the sector is given but the
customer never is. If an industry above is not backed by a write-up, the honest
answer is that he has worked in the sector without a publishable example.

## Compliance and regulatory frameworks he has worked against

Named because each one is a hard filter on a job specification, so a defensible
yes is worth stating and a silence reads as a no.

HITRUST · DoD Impact Level 4 and Impact Level 5 · DISA Security Requirements
Guide · SOC 2 Type I and Type II · PCI DSS · GDPR · ISO 27001 · NIST 800-53 ·
NIST 800-171 · OMB M-21-31 logging controls.

**The claim is architecture, not attestation**, and the distinction matters when
a compliance lead is the one asking. He designs and delivers systems intended to
satisfy these frameworks: the controls, the evidence a system has to produce,
the logging and retention, the isolation boundaries. He is not an auditor or an
assessor, does not issue or sign attestations, and has said he hands payments
standards and penetration testing to specialists. For HITRUST specifically, he
scoped an engagement around a customer keeping its certification through a
migration rather than obtaining one.

## Enterprise scale, and what scale means here

The largest estates he has assessed or built on run to a few hundred virtual
machines across multiple regions and dozens of cloud subscriptions, with
hundreds of terabytes of data, multi-year retention requirements and full
north-south and east-west traffic inspection. Multi-account AWS organizations
under Landing Zone Accelerator, with an account per tenant in one case, are his
normal unit of work rather than an exception.

He has not run a hyperscale consumer platform, and does not claim to.

## On-call, operations and what he builds for

His stated design bar is that a system has to run at 2am on a Sunday without
waking anyone, and it comes from having been the person woken up: Rackspace
Windows administrator, then AWS Cloud Support Engineer, before architecture.
That is the whole reason he designs for boring operations rather than elegance.

He is not currently in an on-call rotation; his role is pre-sales architecture
and team leadership. Earlier operations roles were on-call, and he has triaged
live multi-service incidents as recently as the multi-tenant platform
engagement, where one incident took down five platform services at once and he
root-caused all five.

## Hiring, onboarding and building a team

He has been a people manager since October 2026, and hiring and onboarding are
explicitly part of the role along with performance and career development. He
also wrote the team's first handover-document template and discovery
questionnaire, which is onboarding of a different kind: it is how a new
architect learns what good looks like without shadowing someone for a month.

What he screens for in an architect, and the review gate he runs before a scope
is signed, are both covered in the leadership notes.

## AI coding tools

He uses them, openly, and does not treat it as something to be coy about. This
site's own repository is the evidence: an agentic assistant built with Bedrock,
a public commit history, and written decision records stating the residual risk
of a change and the alternatives rejected. He also helped build the team's
internal library of AI-assistant skills encoding its statement-of-work,
estimate, design-guide and staffing workflows.

His position on it is that the tool does not change who owns the result. The
review gate, the measurement and the written trade-off are the work; the
assistant is how the typing happens faster.

## Compensation

Not discussed by the assistant. Bedrock Guardrails blocks the topic outright and
redirects to contacting him directly. Do not add figures here; they would be
published to a public repo and quoted to anyone who asks.

## Certifications

AWS Certified Solutions Architect – Professional (2022), Solutions Architect –
Associate (2021), SysOps Administrator – Associate (2023), CompTIA Security+
(2024), plus AWS Partner and Knowledge training badges. The résumé shows earn
years only, with no status or expiry labels, by deliberate decision.

## Clearance

Held an Active Security Clearance during Accenture Federal Services
(December 2019 to May 2021); type available on request.

He does not hold an active clearance today. He is a US citizen and held Secret
at Accenture Federal and an interim Top Secret at Vivsoft, so a sponsoring
employer has a straightforward path to reinstating one.

## Education

Bachelor of Arts, Texas State University, San Marcos — School of Journalism &
Mass Communication.

He learned the engineering on the job. The degree in mass communication and
journalism turns out to be useful in a customer-facing architecture role, where
most of the work is explaining a design to people who have to fund it.
