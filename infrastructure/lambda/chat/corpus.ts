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
  const all = [...jobPassages(), ...skillPassages(), ...knowledgePassages(), ...resumeSections()];
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

const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'across', 'over',
  'his', 'her', 'their', 'what', 'which', 'does', 'did', 'has', 'have', 'had',
  'was', 'were', 'are', 'any', 'all', 'you', 'michael', 'groff', 'about', 'can',
  'tell', 'more', 'work', 'worked', 'experience', 'how', 'much', 'many', 'who',
]);

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
  return tokenize(query).filter((t) => {
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
  const queryMass = qTokens.reduce((sum, q) => sum + (idf.get(q) ?? 1), 0);

  const scored = passages.map((p) => {
    const pTokens = new Set(tokenize(p.text));
    let score = 0;
    let matched = 0;
    for (const q of qTokens) {
      const qIdf = idf.get(q) ?? 1;
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
