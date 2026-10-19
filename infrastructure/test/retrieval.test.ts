/**
 * Retrieval behaviour, as assertions rather than a script someone remembers to
 * run.
 *
 * `scripts/check.sh` already had a retrieval step, but it only proved broad
 * queries stayed broad and a handful of technical terms resolved. It could not
 * have caught what happened in Oct 2026: asked "does Michael like dogs", the
 * assistant said the CV does not mention dogs while the page said "two
 * Huskies". Two separate causes, both now pinned here.
 *
 * The negative cases matter more than the positive ones. A retriever that
 * returns something confident for every question is worse than one that admits
 * a miss, because the model believes it.
 *
 * This file is also the instrument for the open question of whether to adopt
 * semantic search. The decision should come from a failing case here, not from
 * another round of cost estimates.
 */
import {
  MIN_COVERAGE,
  isBroadQuery,
  passages,
  searchPassages,
} from '../lambda/chat/corpus';

/** Highest-coverage hit, or undefined when nothing scored at all. */
const top = (q: string) => searchPassages(q, 1)[0];

/** Does any passage in the result set come from the expected source? */
const sources = (q: string, limit = 4) =>
  searchPassages(q, limit).map((h) => h.source);

function expectResolves(q: string) {
  const h = top(q);
  expect(h).toBeDefined();
  expect(isBroadQuery(q)).toBe(false);
  // Report the coverage in the failure message; a bare toBeGreaterThan hides it.
  expect({ q, coverage: Number(h!.coverage.toFixed(2)) }).toEqual({
    q,
    coverage: expect.any(Number),
  });
  expect(h!.coverage).toBeGreaterThanOrEqual(MIN_COVERAGE);
}

function expectWeakOrAbsent(q: string) {
  const h = top(q);
  const weak = !h || h.coverage < MIN_COVERAGE;
  expect({ q, weak }).toEqual({ q, weak: true });
}

describe('corpus coverage', () => {
  it('indexes the About section, which was invisible until Oct 2026', () => {
    const srcs = passages.map((p) => p.source);
    expect(srcs).toContain('About -> Off the clock');
    expect(srcs.some((s) => s.startsWith('About -> CliftonStrengths'))).toBe(true);
  });

  it('indexes the about-this-site section', () => {
    const srcs = passages.map((p) => p.source);
    expect(srcs.some((s) => s.startsWith('This site ->'))).toBe(true);
    expect(srcs).toContain('This site -> Design trade-offs');
  });

  it('keeps family detail out of the corpus while the page still shows it', () => {
    // The page renders all six "Off the clock" facts. `inCorpus: false` keeps
    // two of them from the assistant, which is an explicit decision rather
    // than an oversight. If this fails, someone flipped a flag in about.ts.
    const all = passages.map((p) => p.text).join(' ');
    expect(all).not.toContain('public school teacher');
    expect(all).not.toContain('two daughters');
  });
});

describe('the reported bug: "does Michael like dogs"', () => {
  it('finds the pets, in several phrasings', () => {
    for (const q of [
      'Does Michael like dogs',
      'does he have dogs',
      'what pets does he have',
      'does he have any animals',
    ]) {
      expectResolves(q);
      expect(sources(q)).toContain('About -> Off the clock');
    }
  });

  it('no longer scores 0.83 on "how I like to build"', () => {
    // The original failure. `like` occurred in two passages, so its IDF was
    // near maximal, `dogs` was absent and weighted 1, and the query was judged
    // entirely on `like`. Both halves are fixed: `like` is stopworded and an
    // absent term now weighs what a single-passage term weighs.
    const hits = searchPassages('Does Michael like dogs', 4);
    expect(hits.map((h) => h.text).join(' ')).not.toContain('Patterns & Practices');
  });
});

describe('an absent term must lower confidence, not be ignored', () => {
  it.each([
    'does he like scuba diving',
    'has he worked with mainframes',
    'does he speak Japanese',
    'what is his COBOL experience',
  ])('reports a miss for %j rather than a confident wrong answer', (q) => {
    expectWeakOrAbsent(q);
  });
});

describe('strengths and personality', () => {
  it.each([
    'what are his strengths',
    'CliftonStrengths',
    'what are his Gallup strengths',
    'tell me about Adaptability',
  ])('resolves %j', (q) => expectResolves(q));
});

describe('this site', () => {
  it.each([
    'how is this site built',
    'why CloudFlare instead of Route 53',
    'why did he choose a static export',
  ])('resolves %j', (q) => expectResolves(q));

  it('can reach the no-WAF rationale, even if it does not rank first', () => {
    // Ranks level with a job bullet that also mentions WAF, so assert the
    // trade-off is in the set the model receives rather than that it wins.
    expect(sources('why no WAF')).toContain('This site -> Design trade-offs');
  });
});

describe('no regressions on the queries the gate already relied on', () => {
  it.each(['landing zone', 'multi-tenant SaaS', 'M-21-31', 'Istio', 'kubernetes'])(
    '%j still resolves',
    (q) => expectResolves(q),
  );

  it.each(['what has he shipped on AWS', 'what has he built', 'is he any good'])(
    '%j is still reported broad',
    (q) => expect(isBroadQuery(q)).toBe(true),
  );
});

describe('alias map', () => {
  it('bridges k8s to kubernetes', () => expectResolves('k8s'));

  it('stays small; growth here is the signal to adopt semantic search', () => {
    // Not a correctness assertion. A curated map is the cheap answer for a few
    // hundred passages over a known vocabulary; if it has to keep growing,
    // that is the evidence that vectors have become worth paying for. S3
    // Vectors at ~$0.000055/query is the option, not a managed Knowledge Base
    // at $0.001. See the RAG note in CLAUDE.md.
    const aliasLines = require('fs')
      .readFileSync(require.resolve('../lambda/chat/corpus.ts'), 'utf8')
      .match(/const ALIASES[\s\S]*?\n};/)![0]
      .split('\n')
      .filter((l: string) => /^\s{2}[a-z]+:/.test(l));
    expect(aliasLines.length).toBeLessThanOrEqual(30);
  });
});
