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
import { runTool } from '../lambda/chat/tools';
import {
  MIN_COVERAGE,
  unknownQueryTerms,
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

  it('returns only the About passage, not a grab-bag', () => {
    // With `like` stopworded and `dogs` aliased to `huskies`, the query reduces
    // to one real term and exactly one passage matches. Before, three did.
    const hits = searchPassages('Does Michael like dogs', 4);
    expect(hits.map((h) => h.source)).toEqual(['About -> Off the clock']);
  });

  it('no longer scores 0.83 on "how I like to build"', () => {
    // The original failure. `like` occurred in two passages, so its IDF was
    // near maximal, `dogs` was absent and weighted 1, and the query was judged
    // entirely on `like`. Both halves are fixed: `like` is stopworded and an
    // absent term now weighs what a single-passage term weighs.
    const hits = searchPassages('Does Michael like dogs', 4);
    expect(hits[0].source).not.toBe('Skills -> Patterns & Practices');
  });
});

describe('function words must not be able to carry a query', () => {
  /*
   * The whole class, not the two instances that were found the hard way.
   * `shipped` and `like` were each patched after they caused a wrong answer;
   * an audit then found 43 more function words that could still carry a query
   * alone, and the rarer the word the higher its IDF, so the worst offenders
   * were the ones appearing once or twice. `got` occurred in exactly one
   * passage, so "what has he got" matched it at coverage 1.00.
   */
  it.each([
    'what does he not do',
    'what has he got',
    'what did he use',
    'how did he make that',
    'what way does he work',
    'what else has he done',
  ])('%j carries no searchable term', (q) => {
    expect(isBroadQuery(q)).toBe(true);
  });

  it('keeps real terms that look like function words', () => {
    // `no` is two characters so tokenize drops it anyway, but the point is that
    // stripping the question words must leave the technology behind.
    expect(isBroadQuery('why no WAF')).toBe(false);
    expect(top('why no WAF')).toBeDefined();
  });
});

describe('synonym coverage for terms the corpus words differently', () => {
  it('finds the federal work when asked about government', () => {
    // The corpus says "federal" and "DoD" and never "government", so before the
    // alias this scored 0.35 on a question the corpus answers well.
    expectResolves('does he have federal government experience');
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

  it('tracks how many distinct concepts the map is patching', () => {
    /*
     * The count that matters is distinct TARGET SETS, not entries. Thirty
     * entries covering six concepts is a handful of morphological variants;
     * thirty covering twenty-five concepts is a hand-built thesaurus, and a
     * thesaurus is the thing embeddings do better and cheaper than people.
     *
     * At the time of writing: 31 entries over 18 target sets, 11 of them
     * singletons. The first threshold (30 entries) fired in Oct 2026 and was
     * replaced with this measure rather than simply raised, because raising
     * your own tripwire twice is how a documented decision quietly becomes a
     * habit. BACKLOG item 7 carries the numbers and the cost of the
     * alternative.
     *
     * If this fails, do not bump it. Read the backlog item and decide whether
     * S3 Vectors is now worth $0.000055 a query.
     */
    const block = require('fs')
      .readFileSync(require.resolve('../lambda/chat/corpus.ts'), 'utf8')
      .match(/const ALIASES[\s\S]*?\n};/)![0];
    const entries = [...block.matchAll(/^\s{2}[a-z-]+:\s*\[(.*?)\]/gm)].map((mm) => mm[1].trim());
    const targetSets = new Set(entries);

    expect(entries.length).toBeLessThanOrEqual(40);
    expect(targetSets.size).toBeLessThanOrEqual(20);
  });
});

describe('morphological variants (a verb must find its noun)', () => {
  /*
   * A one-token query rescued only by a prefix match used to score exactly
   * 0.40 against a 0.50 threshold, so it could never pass. Measured: every
   * exact word scored 1.00 and every stem 0.40, and "migrate" found nothing
   * because it is not a prefix of "migration". `prefixCredit` now pays a
   * morphological match 0.85.
   */
  it.each(['mentor', 'teach', 'responsible', 'migrate', 'automate', 'deploy'])(
    '%j resolves to its noun form',
    (q) => expectResolves(q),
  );

  it('does not treat a coincidental short prefix as a match', () => {
    // plan/planet and test/testament share only four characters, under
    // MORPH_MIN_PREFIX. These resolve on their own merits or not at all, but
    // never via a bogus morphological match.
    const credit = (q: string) => searchPassages(q, 1)[0];
    expect(credit('zzzzzplan')).toBeUndefined();
  });
});

describe('loaded questions must not match technical homonyms', () => {
  it('does not answer "has he ever been fired" from policy prose', () => {
    // The corpus says "the SCP fired", which matched at coverage 1.00.
    expectWeakOrAbsent('has he ever been fired');
  });
});

describe('outreach, added Oct 2026', () => {
  it.each([
    'does he do volunteer work',
    'has he spoken at schools',
    'career day',
    'does he mentor',
  ])('resolves %j', (q) => expectResolves(q));

  it('names no school and no family member', () => {
    const all = passages.map((p) => p.text).join(' ');
    expect(all).not.toMatch(/Center Point/i);
    expect(all).not.toMatch(/\bISD\b/);
    expect(all).not.toMatch(/wife/i);
  });
});

describe('CliftonStrengths beyond the signature five', () => {
  it.each(['what is Restorative', 'does he have Intellection', 'self-assurance'])(
    'resolves %j',
    (q) => expectResolves(q),
  );

  it('distinguishes the signature five from six through ten', () => {
    const top = passages.find((p) => p.source === 'About -> CliftonStrengths')!;
    expect(top.text).toContain('signature five');
    expect(top.text).toContain('six through ten');
  });

  it('uses original summaries, not Gallup boilerplate', () => {
    // Gallup's own descriptions are copyrighted and identical in every report;
    // the assistant quotes the corpus verbatim to anyone.
    const all = passages.map((p) => p.text).join(' ');
    expect(all).not.toMatch(/People who are especially talented in the/i);
  });
});

describe('get_strengths returns a complete ordered list', () => {
  /*
   * Relevance ranking cannot answer "list all of X". On dev the assistant
   * answered "top ten" with four themes, out of order, because the eleven
   * strengths passages all scored coverage 1.00 within 4% of each other and
   * the tool returns four.
   */
  it('returns the signature five by default, in rank order', () => {
    const r = runTool('get_strengths', {}, { jobDescription: undefined });
    const data = r.data as { strengths: Array<{ rank: number; name: string; band: string }> };
    expect(data.strengths.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(data.strengths[0].name).toBe('Input');
    expect(data.strengths.every((s) => s.band === 'signature five')).toBe(true);
  });

  it('returns all ten when asked, still in order', () => {
    const r = runTool('get_strengths', { top: 10 }, { jobDescription: undefined });
    const data = r.data as { strengths: Array<{ rank: number; name: string; band: string }> };
    expect(data.strengths.map((s) => s.name)).toEqual([
      'Input',
      'Achiever',
      'Adaptability',
      'Learner',
      'Positivity',
      'Responsibility',
      'Relator',
      'Restorative',
      'Intellection',
      'Self-Assurance',
    ]);
    expect(data.strengths.slice(5).every((s) => s.band === 'top ten')).toBe(true);
  });

  it('clamps a silly argument rather than throwing', () => {
    for (const top of [0, -3, 99, Number.NaN]) {
      const r = runTool('get_strengths', { top }, { jobDescription: undefined });
      const data = r.data as { strengths: unknown[] };
      expect(data.strengths.length).toBeGreaterThanOrEqual(1);
      expect(data.strengths.length).toBeLessThanOrEqual(10);
    }
  });

  it('cites the About section', () => {
    const r = runTool('get_strengths', {}, { jobDescription: undefined });
    expect(r.citations.map((c) => c.anchor)).toEqual(['#about']);
  });
});

describe('recruiter screening questions, audited Oct 2026', () => {
  /*
   * A 49-question sweep across screening logistics, scope of role, depth
   * probes, industry fit, compliance and ways of working found 16 misses. Most
   * were vocabulary, not content: the answer existed but the corpus never used
   * the word a recruiter types. These lock the fixes in.
   */
  it.each([
    'what AWS services do you use to host this site',
    'how is this site hosted',
    'what is the hosting stack',
    'public sector experience',
    'has he worked at enterprise scale',
    'does he use AI coding tools',
    'has he hired anyone',
    'is he in an on-call rotation',
    'what industries has he worked in',
  ])('resolves %j', (q) => expectResolves(q));

  it('names every service in the ONE passage that gets retrieved', () => {
    /*
     * Not just "somewhere in the section". `windowed` splits a long knowledge
     * section into ~700-character chunks, and retrieval returns chunks, so a
     * bulleted list spread over four of them answers "what services" with
     * whichever chunk ranks first. The first attempt did exactly that and
     * replied with S3 and CloudFront only. The complete list is therefore
     * front-loaded into the opening sentence, and this asserts the retrieved
     * passage is self-sufficient.
     */
    const top = searchPassages('What AWS services do you use to host this site', 1)[0];
    expect(top).toBeDefined();
    expect(top.source).toContain('every AWS service hosting it');
    for (const svc of [
      'S3',
      'CloudFront',
      'Lambda',
      'DynamoDB',
      'Bedrock',
      'Certificate Manager',
      'IAM',
      'Parameter Store',
    ]) {
      expect(top.text).toContain(svc);
    }
  });

  // Retail and manufacturing used to belong here. They were a genuine content
  // gap, Michael supplied the industry list in Oct 2026, and they now resolve;
  // the assertions for them live in the industries block below. What remains
  // here is what should NEVER resolve.
  it.each([
    'what are his salary expectations',
    'does he need visa sponsorship',
  ])('still declines or misses %j, which is correct', (q) => expectWeakOrAbsent(q));

  it('answers the references question instead of matching reference architecture', () => {
    // It scored 0.85 against "reference architecture" passages, because
    // reference and references differ by one character and so trip the
    // morphological tier. Answering the question beats fighting the retriever.
    const h = searchPassages('who are his references', 1)[0];
    expect(h.source).toContain('References');
  });
});

describe('a trimmed query is worse than the whole question', () => {
  /*
   * `search_experience`'s input description used to say "Keywords, not a
   * sentence", and the model obeyed: asked "what AWS Services do you use to
   * host this infra/site?" it searched for "AWS Services", dropped the two
   * words that discriminate, and then told the visitor the CV did not cover it.
   *
   * The retriever stopwords filler itself, so pre-trimming buys nothing and
   * costs the specific terms. The description now says to keep the question
   * intact. This asserts the asymmetry that makes that the right instruction.
   */
  it('keeps the hosting answer for the full question and loses it when trimmed', () => {
    const full = searchPassages('What AWS Services do you use to host this infra/site?', 1)[0];
    const trimmed = searchPassages('AWS Services', 1)[0];

    expect(full.source).toContain('every AWS service hosting it');
    expect(trimmed.source).not.toContain('every AWS service hosting it');
    // And the trimmed form is not merely weak, it is confidently wrong, which
    // is why the instruction matters rather than the threshold.
    expect(trimmed.coverage).toBeGreaterThanOrEqual(MIN_COVERAGE);
  });
});

describe('site technology questions, all phrasings', () => {
  /*
   * Two different questions came back with an identical, shallow answer and
   * different citations. Cause: "hosted" was absent from the corpus (the
   * section said host and hosting, which share only four characters with it,
   * one below MORPH_MIN_PREFIX), and "technology" appeared nowhere in it. So
   * both questions scraped the comparison rows instead.
   *
   * Suffix stemming was tried and rejected: collapsing hosted to host made a
   * passage saying "run as host services" win at coverage 1.00, because host
   * occurs in exactly one other passage and is therefore maximally
   * informative. Confidently wrong is worse than weak. The fix is to use the
   * word forms in the content, which is what these assert.
   */
  it.each([
    "how's it hosted on AWS?",
    'What is the technology behind this site?',
    'what tech is this site built with',
    'What AWS Services do you use to host this infra/site?',
    'how is this site hosted',
    'what model does the chatbot use',
  ])('%j resolves to the site technology section', (q) => {
    const h = searchPassages(q, 1)[0];
    expect(h).toBeDefined();
    expect(h.coverage).toBeGreaterThanOrEqual(MIN_COVERAGE);
    expect(h.source).toContain('The technology behind this site');
  });

  it('answers "is there a knowledge base" from either the stack or the trade-offs', () => {
    // Both are right: the technology section says retrieval is keyword search
    // and not a Knowledge Base, and the design trade-offs say why, with the
    // per-query numbers. Accept either rather than pinning the ranking.
    const h = searchPassages('is there a knowledge base', 1)[0];
    expect(h.coverage).toBeGreaterThanOrEqual(MIN_COVERAGE);
    expect(h.source).toMatch(/technology behind this site|Design trade-offs/);
  });
});

describe('industries and compliance, supplied Oct 2026', () => {
  it.each([
    'has he worked in retail',
    'manufacturing experience',
    'life sciences experience',
    'capital markets',
    'adtech experience',
    'legal tech',
    'oil and gas',
    'telecommunications',
  ])('resolves %j', (q) => expectResolves(q));

  it.each(['SOC 2 experience', 'PCI DSS', 'ISO 27001', 'NIST 800-171', 'GDPR'])(
    'resolves %j',
    (q) => expectResolves(q),
  );

  it('does not claim he issues attestations', () => {
    const compliance = passages.filter((p) => p.source.includes('Compliance and regulatory'));
    expect(compliance.length).toBeGreaterThan(0);
    const text = compliance.map((p) => p.text).join(' ');
    expect(text).toMatch(/not an auditor|architecture, not attestation/i);
  });

  it('keeps the resume figure and the career list from contradicting', () => {
    const industries = passages.filter((p) => p.source.includes('Industries and sectors'));
    const text = industries.map((p) => p.text).join(' ');
    // The resume says 11 industries; that is the AllCloud period only, and the
    // career list is longer. Saying so is what stops the two being read as a
    // discrepancy, or one being used to inflate the other.
    expect(text).toMatch(/AllCloud delivery period only/i);
  });
});

describe('depth probes, answered Oct 2026', () => {
  it.each([
    'what is the hardest problem he has solved',
    'what was his hardest problem',
    'how does he handle disagreement',
    'how does he handle conflict',
    'what was his biggest mistake',
    'does he admit mistakes',
    'why does he have a review gate',
  ])('resolves %j', (q) => expectResolves(q));

  it('routes the hardest-problem question to the non-technical framing', () => {
    const h = searchPassages('what is the hardest problem he has solved', 1)[0];
    expect(h.source).toContain('hardest problems are not the technical ones');
  });

  it('routes disagreement to the disagreement section, not to availability', () => {
    // It landed on "Current availability" at 0.85 while `handle` was wrongly
    // stopworded: df=0 does not mean uninformative when the word shares a stem
    // with one in the corpus, and `handles` is in that section's heading.
    const h = searchPassages('how does he handle disagreement', 1)[0];
    expect(h.source).toContain('How he handles disagreement');
  });

  it('keeps the outage account reachable and names the root cause', () => {
    const tgw = passages.filter((p) => p.source.includes('A mistake'));
    const text = tgw.map((p) => p.text).join(' ');
    expect(text).toMatch(/outage/i);
    // The stale tag is the point of the story; without it this reads as
    // carelessness rather than as a labelling failure nobody owned.
    expect(text).toMatch(/test to production/i);
    expect(text).toMatch(/CloudTrail/);
  });

  it('does not name the other team or blame anyone', () => {
    const all = passages.map((p) => p.text).join(' ');
    expect(all).not.toMatch(/sales oversold|sales team sold/i);
    expect(all).not.toMatch(/their fault|incompeten/i);
  });
});

describe('typo tolerance, and the words it must refuse to correct', () => {
  /*
   * Added after BACKLOG.md item 3. The entry is worth reading against this
   * suite, because measuring it corrected the entry itself: it recorded
   * `kubernets`, `terrafrom` and `aws lamda` as all returning "nothing at
   * all", and by the time the work was done `kubernets` returned 0.85. The
   * morphological tier had landed in between, and it covers a typo in the last
   * two characters because the eight-character prefix survives.
   *
   * So the real gap was narrower than the entry said: a typo early enough in a
   * word to destroy its prefix. That is also why the correction window is
   * bounded at both ends -- a shared prefix of at least three, which is what
   * separates a misspelling from a different word, and no upper bound needed
   * because morphology already owns five and above.
   *
   * The negative cases below are not padding. Every one of them was a real
   * confident wrong answer produced by a weaker version of this rule, found by
   * sweeping plausible non-typo words rather than by imagination.
   */
  const CORRECTED: Array<[string, string]> = [
    // [query, a term that must appear in the passage it finds]
    ['terrafrom', 'terraform'],
    ['aws lamda', 'lambda'],
    ['clowdfront', 'cloudfront'],
  ];

  it.each(CORRECTED)('resolves %j to the passage about %s', (query, term) => {
    const hit = top(query);
    expect(hit).toBeDefined();
    expect(hit.coverage).toBeGreaterThanOrEqual(MIN_COVERAGE);
    expect(hit.text.toLowerCase()).toContain(term);
  });

  it('answers a misspelling the same way as the correct spelling', () => {
    // The point of the feature: the visitor should not be able to tell.
    for (const [typo, correct] of [
      ['terrafrom', 'terraform'],
      ['clowdfront', 'cloudfront'],
    ]) {
      expect(top(typo).source).toBe(top(correct).source);
    }
  });

  /*
   * Each of these is a real English word that a weaker rule rewrote into an
   * unrelated corpus term. `equality` became `quality` and answered a question
   * about equality with delivery-quality prose at coverage 1.00; `diving`
   * became `driving` and scored 1.00 on a Vivsoft role. A miss here is the
   * correct answer, and a confident hit is the worst outcome this file exists
   * to prevent.
   */
  const MUST_NOT_CORRECT = [
    'equality', // -> quality, shares no prefix
    'ghosts', // -> hosts
    'minux', // -> linux
    'rocker', // -> docker
    'dicker', // -> docker
    'diving', // -> driving, shares one character
    'taxes', // -> takes, shares two
  ];

  it.each(MUST_NOT_CORRECT)('refuses to rewrite %j into a corpus term', (query) => {
    const hit = top(query);
    // Either nothing matched, or it matched weakly enough to be reported as
    // low confidence. What it must never be is a confident answer.
    if (hit) {
      expect({ query, coverage: hit.coverage < MIN_COVERAGE }).toEqual({
        query,
        coverage: true,
      });
    }
  });

  it('leaves a word the corpus actually contains alone', () => {
    // Correction never second-guesses a real corpus token, which is what keeps
    // short common words out of its reach entirely.
    for (const q of ['node', 'code', 'cost', 'scale']) {
      expect(top(q)?.coverage).toBeGreaterThanOrEqual(MIN_COVERAGE);
    }
  });

  it('does not correct a token under five characters', () => {
    // At four, distance 1 relates half the dictionary. `aws lamda` works at
    // exactly five; nothing shorter is eligible.
    expect(top('zqxj')).toBeUndefined();
  });

  it('does not rescue nonsense that is nowhere near a corpus term', () => {
    // Distance 2 or more must stay a miss, or the gate below is meaningless.
    for (const q of ['xyzzyplugh', 'qwertyuiop', 'zzzzzplan']) {
      const hit = top(q);
      if (hit) expect(hit.coverage).toBeLessThan(MIN_COVERAGE);
    }
  });

  it('still reports a corrected term as reachable, not as a content gap', () => {
    // unknownQueryTerms is the "what should I write next" signal, and a
    // misspelling of something already written is not a gap.
    expect(unknownQueryTerms('terrafrom')).toEqual([]);
    expect(unknownQueryTerms('clowdfront')).toEqual([]);
  });

  it('keeps reporting a genuine gap that merely looks like a typo', () => {
    // `pressure` is absent and is not a misspelling of anything present, so it
    // must still reach the log.
    expect(unknownQueryTerms('how does he handle pressure')).toContain('pressure');
  });

  it('leaves a misspelling of a deliberately stopworded verb as a miss', () => {
    /*
     * `shipped` is in STOP because "what has he shipped" is a broad question
     * that must route to curated highlights, and it occurred once in prose
     * about tenancy cost, which made it a confident wrong answer. A typo of it
     * must not reopen that path. `shiped` is the realistic slip and it stays
     * unreachable: no corpus token starting `shi` is within one edit of it.
     */
    expect(top('shiped')).toBeUndefined();
    expect(unknownQueryTerms('what has he shiped')).toContain('shiped');
  });

  it('gives a corrected typo exactly the behaviour of the word it fixes', () => {
    /*
     * The contract, and the bound on how much damage a correction can do: a
     * corrected token is the real token, so it can only ever produce an answer
     * the correctly-spelled query already produced.
     *
     * `shipd` is the honest edge case. It corrects to `ships`, which is a real
     * corpus word and is NOT stopworded even though `shipped` is, so a visitor
     * who meant "shipped" lands on a narrow answer rather than on highlights.
     * That asymmetry is in the STOP list and predates this tier: `ships`
     * scored 1.00 on this same passage before typo correction existed. Recorded
     * rather than special-cased, because the rule that would catch it has more
     * surface than the problem.
     */
    expect(top('shipd').source).toBe(top('ships').source);
    expect(top('terrafrom').source).toBe(top('terraform').source);
  });
});

describe('unknownQueryTerms, the content-gap signal', () => {
  /*
   * This is what gets logged instead of the question. It has to report the
   * residue nothing could reach, and it has to stay quiet about terms the
   * aliases or the morphological tier already handle, or a month of logs is
   * noise.
   */
  it('reports a word the corpus genuinely lacks', () => {
    expect(unknownQueryTerms('how does he handle pressure')).toContain('pressure');
  });

  it('stays quiet about terms an alias already reaches', () => {
    // dogs -> husky, k8s -> kubernetes, government -> federal.
    expect(unknownQueryTerms('does he like dogs')).toEqual([]);
    expect(unknownQueryTerms('k8s experience')).toEqual([]);
    expect(unknownQueryTerms('federal government work')).toEqual([]);
  });

  it('stays quiet about a morphological variant', () => {
    // hosted/hosting, mentor/mentoring: reachable via prefixCredit.
    expect(unknownQueryTerms('how is this site hosted')).toEqual([]);
    expect(unknownQueryTerms('does he mentor')).toEqual([]);
  });

  it('returns nothing for a query with no distinctive terms at all', () => {
    // Broad queries have no useful tokens, so there is no residue to report.
    expect(unknownQueryTerms('what has he shipped on AWS')).toEqual([]);
  });

  it('does not leak the question, only the terms', () => {
    const terms = unknownQueryTerms('is he any good at underwater basketweaving');
    expect(terms.join(' ')).not.toMatch(/is he any good/);
    expect(terms.every((t) => !t.includes(' '))).toBe(true);
  });
});
