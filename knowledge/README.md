# knowledge/ — the chat assistant's corpus

Markdown the "Ask my CV" assistant can search but the site does not render. This
is where detail goes that would bloat a 3-page résumé: per-engagement stories,
technical depth, the career narrative, recruiter FAQs.

**Edit these as plain markdown. No code changes needed to change the content.**
Pushing a change to `dev` redeploys the assistant: `deploy-infra.yml` watches
`knowledge/**`, because the corpus is bundled into the Lambda at synth time.
Adding a *new file* needs one line in
`infrastructure/lambda/chat/knowledge.ts`; editing an existing one needs
nothing.

---

## This is public. Treat it that way.

Three separate exposures, and it is easy to conflate "not on the page" with
"not public":

1. **It is committed to a public GitHub repo.** Anyone can read it, and git
   keeps every revision — deleting a sentence later does not unpublish it.
2. **It is bundled into the Lambda and quoted to anyone who asks the bot.**
3. **It is forked.** This repo is used as a template.

So the standard is: *would I say this, in these words, to a recruiter I had
just met?* If no, it does not go here.

### Specifically do not write

These are already recorded as landmines in `CLAUDE.md` and a brain-dump is
exactly where they creep back in:

- **Customer or client names.** The résumé anonymises deliberately ("a global
  industrial enterprise"). Keep that, and watch for detail that
  re-identifies: industry plus region plus headcount plus dates can be enough
  on its own. Give the industry at the widest label that is still true; a small
  industry plus a migration plus a date is a short list.
- **The "Business Impact at a Glance" percentages** (43% time-to-market, 69%
  unplanned downtime, 45% security incidents). They are labelled "(AWS
  benchmark)" in a vendor deck — marketing, not delivered results.
- **Inflated figures.** Every number here should survive someone asking you to
  show the source. Specifically: **do not put a dollar figure on AWS MAP
  funding.** A records search in Oct 2026 could not substantiate the ~$1.2M the
  résumé used to carry — the closest figures found were *budgets*, not
  approvals, and the approval emails were not searchable. The programme **count**
  is defensible and the dollar amount is not, so the résumé now says "16+ AWS
  MAP programs" and nothing more. Restore a figure only against approval
  emails you could produce on request.
- **Delivery-phase cost savings.** Confirmed Sep 2026 that no delivery-phase TCO
  workbook exists for any of the 17 engagements. The category is absent from the
  résumé on purpose. Do not reintroduce it here.
- **Anything under NDA**, or internal pricing, margins, pipeline or named deals.
- **Review notes in `<!-- -->` comments.** The bot never sees them, but git
  publishes them. A note like "check the NDA" or "this figure is unverified"
  discloses the very thing it is worried about. Keep those in your head or in
  a private file, and leave only neutral TODOs here.

### Also worth remembering

The assistant answers *from these files*. If a sentence here is wrong, the bot
will state it confidently to a recruiter, and it will contradict the résumé —
which `CLAUDE.md` treats as the expensive kind of wrong. Vagueness is safer than
a number you cannot defend.

---

## How retrieval works, and how to write for it

Files are split into passages on `##` and `###` headings. Each passage is
scored against the question by keyword overlap weighted by inverse document
frequency — rare terms count, ubiquitous ones do not.

Two consequences for how you write:

- **Put distinctive nouns in the heading and the first sentence.** A passage
  headed "Azure-to-AWS assessment for a global industrial enterprise" is
  findable;
  one headed "Project 3" is not.
- **"AWS" is nearly worthless as a search term here** because it appears in
  almost every passage. Write the specific thing: `Landing Zone Accelerator`,
  `Transit Gateway`, `M-21-31`, `Karpenter`, `6R`, `MAP Mobilize`. Those are
  what make a passage retrievable.

Keep passages roughly a paragraph. Very long sections get windowed, and a
window that straddles two topics matches neither well.

---

## Files

| File | Holds |
|---|---|
| `00-overview.md` | The short answer to "who is he". |
| `10-highlights.md` | **Curated.** Drives the `get_highlights` tool, which answers broad openers like "what has he actually done?" This is the one file where ordering matters: best first. |
| `20-engagements.md` | Anonymised engagement write-ups: problem, architecture, outcome. |
| `30-technical-depth.md` | How he has actually used a technology, for "tell me about a hard problem". |
| `40-leadership.md` | Team lead and manager specifics. |
| `50-career-narrative.md` | Why each move happened. |
| `60-recruiter-faq.md` | Location, remote, availability, what he is looking for. |

Sections marked `<!-- TODO -->` are unwritten. The assistant simply will not
find anything for them, which is the correct failure: it says it does not know
and points at the contact details.
