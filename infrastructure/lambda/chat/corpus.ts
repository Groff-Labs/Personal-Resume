/**
 * The assistant's view of the CV.
 *
 * These imports reach across into `frontend/` on purpose. The data modules are
 * pure TypeScript (interfaces plus exported consts, no React, no `@/` aliases),
 * so esbuild follows the relative paths and inlines them into the bundle, and
 * `resume.md` arrives as a string via `loader: { '.md': 'text' }`.
 *
 * There is deliberately NO generated JSON and no codegen step. CLAUDE.md is
 * emphatic that the site and the resume must never disagree; a snapshot would
 * be a third copy to drift. `cdk synth` IS the build step, and the Lambda asset
 * hash changes whenever this data changes, so `cdk deploy` ships it.
 *
 * Consequence to remember: editing `frontend/lib/data/**` or `resume.md` now
 * changes the Lambda, which is why deploy-infra.yml watches those paths too.
 */
import { jobs, type Job } from '../../../frontend/lib/data/jobs';
import { skillGroups } from '../../../frontend/lib/data/skills';
import { certifications } from '../../../frontend/lib/data/certifications';
import { activeHeroStatus } from '../../../frontend/lib/data/status';
import { contact } from '../../../frontend/lib/data/contact';
import { offTheClock, strengths } from '../../../frontend/lib/data/about';
import {
  archiveNote,
  architecture,
  comparison,
  summary as projectSummary,
  tradeoffs,
} from '../../../frontend/lib/data/project';
import { showTestimonials, testimonials } from '../../../frontend/lib/data/testimonials';
import resumeMarkdown from '../../../resume.md';
import { knowledgeDocs, splitSections, windowed } from './knowledge';

/** Anchors must match the `id` attributes the page actually renders. */
export const ANCHORS = {
  about: '#about',
  skills: '#skills',
  experience: '#experience',
  education: '#education',
  certifications: '#certifications',
  contact: '#contact',
  /** ProjectShowcase.tsx renders `id="project"`. */
  project: '#project',
} as const;

export type Anchor = (typeof ANCHORS)[keyof typeof ANCHORS];

export interface Citation {
  anchor: Anchor;
  label: string;
}

export { jobs, skillGroups, certifications, activeHeroStatus, contact };

/* ------------------------------------------------------------------ *
 * Employer lookup
 * ------------------------------------------------------------------ */

/**
 * `id` is the tool's enum, so it must stay in step with `jobs.ts`. Built from
 * the data rather than hardcoded, so a new employer can't be silently missing.
 */
export const employerIds: string[] = jobs.map((j) => j.id);

export function findJob(company: string): Job | undefined {
  const needle = company.trim().toLowerCase();
  return (
    jobs.find((j) => j.id.toLowerCase() === needle) ??
    jobs.find((j) => j.company.toLowerCase() === needle) ??
    jobs.find((j) => j.company.toLowerCase().includes(needle))
  );
}

/** Flattens a Job's `roles` / `responsibilities` split into one shape. */
export function rolesOf(job: Job): Array<{
  title: string;
  startDate: string;
  endDate: string;
  responsibilities: string[];
}> {
  if (job.roles && job.roles.length > 0) return job.roles;
  return [
    {
      title: job.title,
      startDate: job.startDate,
      endDate: job.endDate,
      responsibilities: job.responsibilities ?? [],
    },
  ];
}

/* ------------------------------------------------------------------ *
 * Search index over every responsibility bullet + resume.md prose
 * ------------------------------------------------------------------ */

export interface Passage {
  text: string;
  /** Human-readable provenance, e.g. "AllCloud -> Sr. Solutions Architect". */
  source: string;
  anchor: Anchor;
}

function resumeSections(): Passage[] {
  const out: Passage[] = [];
  let heading = 'Resume';

  for (const rawLine of resumeMarkdown.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('<!--') || line === '---') continue;

    const h = /^#{1,3}\s+(.*)$/.exec(line);
    if (h) {
      heading = h[1].replace(/[*_`]/g, '').trim();
      continue;
    }

    // Bullets and prose both carry facts; strip markdown emphasis so the model
    // and the keyword scorer see the same plain text.
    const text = line
      .replace(/^[-*]\s+/, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`/g, '')
      .trim();

    if (text.length < 25) continue;
    out.push({ text, source: `Resume -> ${heading}`, anchor: ANCHORS.experience });
  }
  return out;
}

function jobPassages(): Passage[] {
  const out: Passage[] = [];
  for (const job of jobs) {
    for (const role of rolesOf(job)) {
      for (const text of role.responsibilities) {
        out.push({
          text,
          source: `${job.company} -> ${role.title}`,
          anchor: ANCHORS.experience,
        });
      }
    }
  }
  return out;
}

function skillPassages(): Passage[] {
  return skillGroups.map((g) => ({
    text: `${g.category}: ${g.summary} Includes ${g.items.join(', ')}.`,
    source: `Skills -> ${g.category}`,
    anchor: ANCHORS.skills,
  }));
}

/**
 * The About section's personal facts and CliftonStrengths.
 *
 * Added Oct 2026 after the assistant told a visitor the CV "does not mention
 * anything about his preference for dogs" while the page said "two Huskies".
 * The content was hardcoded in `AboutMe.tsx`, and this module reads data
 * modules rather than components, so it had never been indexed.
 *
 * `inCorpus` is honoured here and nowhere else: the page shows every fact, the
 * assistant sees only the ones marked. That excludes the wife's profession and
 * the daughters by explicit decision, and `prompt.ts` rule 10 refuses
 * family-status questions independently, so this is one of two layers.
 */
function aboutPassages(): Passage[] {
  const out: Passage[] = [];

  const facts = offTheClock.filter((f) => f.inCorpus).map((f) => f.label);
  if (facts.length > 0) {
    // One passage, not one per fact: they are short, and a visitor asking
    // "what is he like outside work" should get the set rather than a sliver.
    out.push({
      text: `Outside work, off the clock. ${facts.join('. ')}.`,
      source: 'About -> Off the clock',
      anchor: ANCHORS.about,
    });
  }

  // Strengths get their own passage each, because the summaries are the
  // substance and a visitor may ask about one theme by name.
  for (const st of strengths) {
    out.push({
      text: `CliftonStrengths theme ${st.name}, one of his Gallup top five strengths. ${st.summary}`,
      source: `About -> CliftonStrengths -> ${st.name}`,
      anchor: ANCHORS.about,
    });
  }

  out.push({
    text: `His top five Gallup CliftonStrengths, in order: ${strengths
      .map((st) => st.name)
      .join(', ')}.`,
    source: 'About -> CliftonStrengths',
    anchor: ANCHORS.about,
  });

  return out;
}

/**
 * The "About this site" section: how this CV is built and what was traded away.
 *
 * Also hardcoded in a component until Oct 2026, which meant "how is this site
 * built" and "why no WAF" had nothing to retrieve, in the one section whose
 * entire purpose is demonstrating the work. The trade-offs are the valuable
 * part: anyone can list services, stating what was given up and why is rarer.
 */
function projectPassages(): Passage[] {
  const out: Passage[] = [
    {
      text: `About this site, michaelgroff.info: a WordPress to Next.js rewrite on AWS. ${projectSummary}`,
      source: 'This site -> Overview',
      anchor: ANCHORS.project,
    },
    {
      text: `How this site is built, its request path and deployment pipeline. ${architecture}`,
      source: 'This site -> Architecture',
      anchor: ANCHORS.project,
    },
    {
      text: `The 2015 WordPress archive of this site. ${archiveNote}`,
      source: 'This site -> Archive',
      anchor: ANCHORS.project,
    },
  ];

  for (const row of comparison) {
    out.push({
      text: `This site, ${row.aspect} compared between the old WordPress install and the current Next.js on AWS build. WordPress: ${row.wp}. Next.js on AWS: ${row.aws}.`,
      source: `This site -> ${row.aspect}`,
      anchor: ANCHORS.project,
    });
  }

  for (const line of tradeoffs) {
    out.push({
      text: `Design trade-off made building this site. ${line}`,
      source: 'This site -> Design trade-offs',
      anchor: ANCHORS.project,
    });
  }

  return out;
}

/**
 * Testimonials, when the section is switched on.
 *
 * Gated on the same `showTestimonials` flag the page uses, so the assistant
 * cannot quote a testimonial that no visitor can see. Today that flag is false
 * and the entries are placeholders; indexing it now means turning the section
 * on does not quietly leave the assistant a section behind.
 */
function testimonialPassages(): Passage[] {
  if (!showTestimonials) return [];
  return testimonials.map((t) => ({
    text: `Testimonial from ${t.name}, ${t.role}. "${t.quote}"`,
    source: `Testimonials -> ${t.name}`,
    anchor: ANCHORS.about,
  }));
}

function knowledgePassages(): Passage[] {
  const out: Passage[] = [];
  for (const doc of knowledgeDocs) {
    for (const section of splitSections(doc.content)) {
      for (const chunk of windowed(`${section.heading}. ${section.body}`)) {
        out.push({
          text: chunk,
          source: `${doc.label} -> ${section.heading}`,
          anchor: doc.anchor as Anchor,
        });
      }
    }
  }
  return out;
}

/**
 * Job bullets are the authoritative phrasing, so they come first and resume.md
 * lines that merely restate them are dropped. Dedupe is on a normalized prefix
 * rather than exact text, because resume.md rewords bullets slightly for print.
 */
export const passages: Passage[] = (() => {
  const all = [
    ...jobPassages(),
    ...skillPassages(),
    ...aboutPassages(),
    ...projectPassages(),
    ...testimonialPassages(),
    ...knowledgePassages(),
    ...resumeSections(),
  ];
  const seen = new Set<string>();
  const kept: Passage[] = [];

  for (const p of all) {
    const key = p.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 70);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(p);
  }
  return kept;
})();

/*
 * Stopwords.
 *
 * This was a hand-curated denylist and that was the wrong shape for the job.
 * Every function word missing from it was a latent confident-wrong answer
 * waiting for the right phrasing, and the list had already been patched twice
 * after the fact: `shipped`, then `like`. An audit in Oct 2026 found **43 more
 * function words that could still carry a query on their own**, and the danger
 * runs the wrong way round: the rarer the word, the higher its IDF, so the most
 * dangerous were the ones appearing once or twice. `got` occurred in exactly one
 * passage, which made "what has he got" reduce to `got` and match that single
 * passage at coverage 1.00.
 *
 * Measured: "what does he not do" returned a passage about this website's
 * design trade-offs at **1.00 confidence**, because `not` (37 passages) was the
 * only token the old list left standing.
 *
 * So the general English function words come from a standard list rather than
 * from whatever someone remembered, and the domain-specific entries below are
 * the only hand-maintained part. Verified not to regress anything: every query
 * in `test/retrieval.test.ts` keeps its result, "why no WAF" improves from 0.52
 * to 1.00, and the two cases above correctly become broad.
 */
const STOP = new Set([
  // General English function words. Only entries longer than two characters
  // matter, because `tokenize` already drops anything shorter.
  'about', 'above', 'after', 'again', 'against', 'all', 'along', 'also',
  'although', 'always', 'among', 'and', 'any', 'are', 'around', 'because',
  'been', 'before', 'being', 'below', 'between', 'both', 'but', 'came', 'can',
  'cannot', 'come', 'could', 'did', 'does', 'doing', 'done', 'down', 'during',
  'each', 'either', 'else', 'even', 'ever', 'every', 'few', 'for', 'from',
  'further', 'get', 'got', 'had', 'has', 'have', 'having', 'her', 'here', 'him',
  'his', 'how', 'however', 'into', 'its', 'itself', 'just', 'least', 'less',
  'like',
  'made', 'make', 'many', 'may', 'might', 'more', 'most', 'much', 'must',
  'never', 'new', 'next', 'not', 'now', 'off', 'often', 'once', 'only', 'onto',
  'other', 'our', 'out', 'over', 'own', 'per', 'perhaps', 'put', 'rather',
  'really', 'said', 'same', 'say', 'see', 'seem', 'seen', 'several', 'she',
  'should', 'since', 'some', 'still', 'such', 'take', 'than', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'though',
  'through', 'thus', 'together', 'too', 'toward', 'under', 'until', 'upon',
  'use', 'used', 'using', 'very', 'want', 'was', 'way', 'well', 'went', 'were',
  'what', 'when', 'where', 'whether', 'which', 'while', 'who', 'whom', 'why',
  'will', 'with', 'within', 'without', 'would', 'yet', 'you', 'your',
  // Corpus-specific. Everything here is either the subject of every passage
  // (so it cannot discriminate) or a word people use to ask a broad question.
  'michael', 'groff', 'across', 'tell', 'work', 'worked', 'experience',
  // Achievement verbs. These are how people phrase a BROAD question ("what has
  // he shipped", "what has he built") and they also occur incidentally in
  // prose, which is the dangerous combination.
  //
  // Concretely: "shipped" appeared exactly once in the corpus, in "it is the
  // inverse of what he shipped here" — a sentence about tenancy cost. Being
  // rare gave it a high IDF, so "what has he shipped on AWS" reduced to that
  // one token, matched it fully, scored coverage 1.00, and the broad-query
  // guard stopped firing. The assistant then answered the single most common
  // opening question with a passage about cluster-per-tenant cost trade-offs.
  //
  // Coverage measures whether the query's rare words were matched, not whether
  // the passage is about what was asked, so it cannot catch this on its own.
  // Stopwording the verb can: the query now reduces to nothing, is reported
  // tooBroad, and routes to the curated get_highlights instead. No real search
  // term is lost, because nobody searches for "shipped" as a technology.
  'shipped', 'ship', 'built', 'build', 'delivered', 'deliver', 'done', 'achieved',
  'accomplished', 'good', 'best', 'impressive', 'actually',
  // Preference verbs. "like" was the original symptom: it occurred in exactly
  // two passages, so its IDF was near maximal, and "does Michael like dogs"
  // reduced to it and matched "How I like to build" at 0.83 confidence. `like`
  // is in the general list above now; these are its relatives.
  'likes', 'prefer', 'prefers', 'favorite', 'favourite', 'enjoy', 'enjoys',
]);

/**
 * Query-only synonyms, applied before scoring.
 *
 * Keyword retrieval cannot bridge a vocabulary gap: "dogs" and "Huskies" share
 * no token, so indexing the pets line does not by itself answer "does he like
 * dogs". Measured the same way, "k8s" missed entirely while "containers"
 * scored 1.00.
 *
 * A curated map rather than embeddings, deliberately. For a few hundred
 * passages over a known vocabulary it is deterministic, reviewable, testable
 * and free, where a vector store is $0.000055 a query (S3 Vectors) and a
 * managed Knowledge Base is $0.001 — the latter more than doubling the cost of
 * a turn. See the RAG note in CLAUDE.md for the full costing.
 *
 * **This map's length is the signal to watch.** It is here to cover a handful
 * of known mismatches, not to become a hand-built thesaurus. If it keeps
 * growing, that is the evidence that semantic search has become worth its
 * price, and S3 Vectors is the store to reach for.
 *
 * Expansion is additive and query-side only: the original token is always kept,
 * so an alias can add a match but never remove one.
 */
const ALIASES: Record<string, string[]> = {
  // Pets. The page says "two Huskies, one standard-issue tabby, one black cat".
  dog: ['husky', 'huskies'],
  dogs: ['husky', 'huskies'],
  puppy: ['husky', 'huskies'],
  pet: ['husky', 'huskies', 'tabby', 'cat'],
  pets: ['husky', 'huskies', 'tabby', 'cat'],
  cats: ['cat', 'tabby'],
  animal: ['husky', 'huskies', 'tabby', 'cat'],
  animals: ['husky', 'huskies', 'tabby', 'cat'],
  // Technology shorthand people actually type.
  k8s: ['kubernetes'],
  kube: ['kubernetes'],
  iac: ['terraform', 'cdk', 'cloudformation'],
  tf: ['terraform'],
  cicd: ['pipeline', 'actions', 'codepipeline'],
  lz: ['landing'],
  // "does he have federal government experience" scored 0.35 because the
  // corpus says "federal" and "DoD" but never "government", so the absent
  // term dragged the denominator down on a question the corpus can answer.
  government: ['federal'],
  governmental: ['federal'],
  dod: ['defense'],
  fintech: ['financial'],
  // Personality and working style.
  strength: ['cliftonstrengths', 'gallup'],
  strengths: ['cliftonstrengths', 'gallup'],
  personality: ['cliftonstrengths', 'gallup'],
  hobby: ['hobbies', 'texan', 'enthusiast'],
  hobbies: ['texan', 'enthusiast'],
};

/**
 * Translates a query's tokens through `ALIASES`.
 *
 * Corpus-aware on purpose, and this is the subtle part. A naive version that
 * merely *adds* every alias would make things worse, not better: aliases that
 * happen to be absent from the corpus would each add `UNKNOWN_TERM_WEIGHT` to
 * the coverage denominator and never match anything, so `pets` expanding to
 * four aliases of which one is present would score roughly 0.25 and be rejected
 * — the opposite of the intent. Only aliases the corpus actually contains are
 * added.
 *
 * An absent original is dropped once an alias replaces it, because it has been
 * translated: `dogs` is not in the corpus, `huskies` is, and keeping `dogs`
 * would hold the coverage of a correct answer at about a half. A *present*
 * original is kept alongside its aliases, since both are real evidence.
 */
function expandAliases(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    const known = (ALIASES[t] ?? []).filter((a) => idf.has(a));
    for (const a of known) out.add(a);
    // Keep the original unless an alias just stood in for a term the corpus
    // does not have.
    if (known.length === 0 || idf.has(t)) out.add(t);
  }
  return [...out];
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]/g, ' ')
    .split(/[\s/]+/)
    .map((t) => t.replace(/^[-.]+|[-.]+$/g, ''))
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** Inverse document frequency, so "aws" counts for less than "m-21-31". */
const idf: Map<string, number> = (() => {
  const df = new Map<string, number>();
  for (const p of passages) {
    for (const t of new Set(tokenize(p.text))) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const m = new Map<string, number>();
  for (const [t, n] of df) m.set(t, Math.log(1 + passages.length / n));
  return m;
})();

/**
 * What a query term absent from the corpus is worth.
 *
 * This number was `1`, and that was a real bug with a visible symptom. An
 * absent term has no IDF entry, so it fell back to 1, while a merely *rare*
 * present term scores `log(1 + N/df)` — up to 5.5 here. The one token that
 * proves the corpus cannot answer was therefore weighted as the least important
 * word in the question.
 *
 * Measured, Oct 2026, N=250. "Does Michael like dogs" tokenises to `like`
 * (df=2, idf 4.83) and `dogs` (absent, weight 1). Denominator 5.83, a passage
 * containing "like" matched 4.83, coverage **0.83** — comfortably above
 * MIN_COVERAGE. So retrieval reported high confidence and returned "Patterns &
 * Practices: How I like to build." The model read that, saw no dogs, and told
 * the visitor the CV does not mention them. The model was right; retrieval lied
 * to it.
 *
 * `tools.ts` already had the guard for this ("one rare-but-incidental word can
 * rescue an otherwise broad query"), but the metric feeding it could not drop
 * far enough to trip it.
 *
 * An absent term is the *strongest* available evidence that the corpus does not
 * cover the question, so it is now worth what a term appearing in exactly one
 * passage is worth, which is the most any real term can score. Same figures
 * after the change: coverage 0.47, correctly weak. Every query the gate asserts
 * ("landing zone", "multi-tenant SaaS", "M-21-31", "Istio", "kubernetes") stayed
 * at 1.00.
 *
 * Used for both the coverage numerator and its denominator via
 * `queryTermWeight`, so the two cannot drift apart. A prefix match still earns
 * its partial credit, which is what keeps "kubernet" finding "kubernetes".
 */
const UNKNOWN_TERM_WEIGHT = Math.log(1 + passages.length);

function queryTermWeight(t: string): number {
  return idf.get(t) ?? UNKNOWN_TERM_WEIGHT;
}

/**
 * Terms appearing in more than this share of passages are discarded from a
 * query entirely rather than merely down-weighted.
 *
 * Measured on dev: "AWS" scored a top hit of 0.35 against 1.21 for "landing
 * zone", and the top result for "what has he shipped on AWS" was a CI/CD skills
 * line. The term appears in nearly every passage, so its tiny IDF still decided
 * the ranking once every other term had been stopworded away. Dropping such
 * terms means a query made only of them scores nothing, which is honest: it is
 * a broad question, and `isBroadQuery` routes it to curated highlights instead
 * of a grab-bag.
 */
const UBIQUITOUS_SHARE = 0.25;

function usefulQueryTokens(query: string): string[] {
  // Aliases first, so a translated token is then subject to the same ubiquity
  // filter as one the visitor typed.
  return expandAliases(tokenize(query)).filter((t) => {
    const score = idf.get(t);
    // Unknown terms are kept: they may be a rare technology worth matching on
    // prefix. Known-but-ubiquitous terms are dropped.
    if (score === undefined) return true;
    return score > Math.log(1 + 1 / UBIQUITOUS_SHARE);
  });
}

/**
 * True when a question carries no distinctive term to search on — "what has he
 * done", "tell me about his AWS experience". Keyword retrieval cannot rank
 * these, so the assistant is told to use get_highlights instead.
 */
export function isBroadQuery(query: string): boolean {
  return usefulQueryTokens(query).length === 0;
}

/**
 * Confidence threshold, expressed as the share of the query's IDF mass a
 * passage actually matched. Scale-invariant by construction.
 *
 * An earlier version thresholded the raw ranking score at 0.55, calibrated on a
 * 146-passage corpus. Growing the corpus to 228 moved every score: "landing
 * zone" fell 1.13 -> 0.95 and "kubernetes" 0.74 -> 0.62, while the known-bad
 * "what has he shipped on AWS" rose 0.38 -> 0.41. The cutoff still separated
 * them, but the margin collapsed from 0.36 to 0.21 and would have kept closing
 * as the knowledge base grew, eventually flagging good answers as weak with no
 * sign that anything had changed.
 *
 * The raw score is still the right thing for *ranking* (relative order within
 * one query). It is the wrong thing for *confidence*, because IDF depends on
 * corpus size and the length divisor penalises longer knowledge passages. The
 * fraction of the query matched does not move when the corpus grows.
 *
 * At 0.5: a single-token query that matches scores 1.0; "landing zone" with
 * both terms matched scores 1.0; "shipped" earning only a prefix match scores
 * 0.4 and is correctly rejected.
 */
export const MIN_COVERAGE = 0.5;

export interface ScoredPassage extends Passage {
  /** Ranking score. Comparable within one query, not across corpus sizes. */
  score: number;
  /** Share of the query's IDF mass matched, 0..1. Use this for confidence. */
  coverage: number;
}

/**
 * Token-overlap search weighted by IDF. No embeddings, no vector store, no
 * Knowledge Base: the corpus is a few hundred short passages, and retrieval
 * fees would have cost several times more than sending the whole thing to the
 * model. See the RAG note in CLAUDE.md.
 */
export function searchPassages(query: string, limit = 4): ScoredPassage[] {
  const qTokens = usefulQueryTokens(query);
  if (qTokens.length === 0) return [];

  // Total IDF the query could possibly match, for the coverage denominator.
  const queryMass = qTokens.reduce((sum, q) => sum + queryTermWeight(q), 0);

  const scored = passages.map((p) => {
    const pTokens = new Set(tokenize(p.text));
    let score = 0;
    let matched = 0;
    for (const q of qTokens) {
      const qIdf = queryTermWeight(q);
      if (pTokens.has(q)) {
        score += qIdf;
        matched += qIdf;
      } else {
        // Partial credit for prefix matches so "kubernetes" finds "kubernetes-based"
        // and "terraform" finds "terraformed". Weighted the same in coverage, so
        // a query rescued only by a prefix match scores 0.4 and is rejected.
        for (const t of pTokens) {
          if (t.startsWith(q) || q.startsWith(t)) {
            score += (idf.get(t) ?? 1) * 0.4;
            matched += qIdf * 0.4;
            break;
          }
        }
      }
    }
    return {
      ...p,
      // Favour shorter passages at equal overlap: denser, and fewer input tokens.
      score: score / Math.log(12 + p.text.length),
      coverage: queryMass > 0 ? matched / queryMass : 0,
    };
  });

  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Skill inventory, used by the deterministic JD matcher
 * ------------------------------------------------------------------ */

export interface InventoryEntry {
  /** Lowercased term to match against the job description. */
  term: string;
  /** The term as written on the site, for display. */
  display: string;
  source: string;
  anchor: Anchor;
}

export const inventory: InventoryEntry[] = (() => {
  const out: InventoryEntry[] = [];
  const push = (display: string, source: string, anchor: Anchor) => {
    const term = display.toLowerCase().trim();
    if (term.length < 2) return;
    out.push({ term, display, source, anchor });
  };

  for (const g of skillGroups) {
    for (const item of g.items) push(item, `Skills -> ${g.category}`, ANCHORS.skills);
  }
  for (const c of certifications) {
    push(c.name, `Certifications -> ${c.vendor}`, ANCHORS.certifications);
  }
  for (const job of jobs) {
    for (const role of rolesOf(job)) {
      push(role.title, `${job.company} -> ${role.title}`, ANCHORS.experience);
    }
  }

  // De-dupe on term, keeping the first (skills outrank titles as evidence).
  const seen = new Set<string>();
  return out.filter((e) => (seen.has(e.term) ? false : (seen.add(e.term), true)));
})();
