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

## Industries and sectors he has delivered in

Asked as "has he worked in <industry>", which is a screening question, so it is
answered in the words a recruiter uses rather than left implicit in the
engagement write-ups.

The résumé's figure is 17 AWS engagements across 11 industries at AllCloud. The
ones documented in this corpus, by sector: security software, public sector and
government (via a software vendor serving public-sector customers, with a
GovCloud-deployable design and OMB M-21-31 logging controls), heavy industry,
HR technology, healthcare, and software and SaaS generally. Earlier roles add
federal and defense work at Accenture Federal Services and Vivsoft, including
IL4 and IL5 accreditation requirements and DISA SRG controls, and managed
hosting across many customer verticals at Rackspace.

That list is shorter than eleven on purpose. The count comes from the résumé;
the sector names are only written down where an engagement write-up records
them, and the rest are not reconstructed from the count.

If an industry is not named here, say so plainly rather than stretching an
adjacent one. "He has not published work in that sector" is a better answer
than a guess a hiring manager can check.

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
