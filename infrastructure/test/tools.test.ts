/**
 * Every tool handler, and the properties that are not obvious from reading one.
 *
 * Only `get_strengths` had direct coverage before this; the other six were
 * exercised only incidentally through retrieval tests, which means a handler
 * could return the wrong shape, cite the wrong anchor or throw on a hostile
 * argument and nothing would fail. The model is the only caller, and a model
 * will absolutely pass a string where a number belongs.
 */
import { MAX_JD_CHARS, converseTools, runTool, toolSpecs } from '../lambda/chat/tools';

const call = (name: string, input: Record<string, unknown> = {}, jd?: string) =>
  runTool(name, input, { jobDescription: jd });

/** Every anchor a tool may cite must be a real section id on the page. */
const PAGE_ANCHORS = [
  '#about',
  '#skills',
  '#experience',
  '#education',
  '#certifications',
  '#contact',
  '#project',
];

describe('the tool catalogue', () => {
  it('exposes every spec to Converse, wrapped in toolSpec', () => {
    // Converse rejects a bare spec: "member must satisfy enum value set:
    // toolSpec, systemTool, modelTool or cachePoint". A cast once hid this.
    expect(converseTools).toHaveLength(toolSpecs.length);
    for (const t of converseTools) {
      expect(Object.keys(t)).toEqual(['toolSpec']);
      expect(t.toolSpec?.name).toBeTruthy();
      expect(t.toolSpec?.description).toBeTruthy();
      expect(t.toolSpec?.inputSchema).toBeTruthy();
    }
  });

  it('gives every tool a description long enough to choose by', () => {
    // Tool selection has gone wrong twice, both times because a description
    // said too little or implied too much. A one-liner is a warning sign.
    for (const spec of toolSpecs) {
      expect({ name: spec.name, long: spec.description.length > 80 }).toEqual({
        name: spec.name,
        long: true,
      });
    }
  });

  it('declares every required input in its own schema properties', () => {
    for (const spec of toolSpecs) {
      const json = spec.inputSchema.json as {
        properties?: Record<string, unknown>;
        required?: string[];
      };
      for (const req of json.required ?? []) {
        expect({ tool: spec.name, req, declared: !!json.properties?.[req] }).toEqual({
          tool: spec.name,
          req,
          declared: true,
        });
      }
    }
  });
});

describe('every handler returns a usable result', () => {
  it.each(toolSpecs.map((s) => s.name))('%s returns data, citations and a summary', (name) => {
    // Called with no arguments at all, which is what a model does when it
    // guesses. Nothing may throw, and the shape must hold.
    const r = call(name, {}, 'a'.repeat(200));
    expect(r.data).toBeDefined();
    expect(Array.isArray(r.citations)).toBe(true);
    expect(typeof r.summary).toBe('string');
    expect(r.summary.length).toBeGreaterThan(0);
  });

  it.each(toolSpecs.map((s) => s.name))('%s cites only real page anchors', (name) => {
    // A citation chip rendering a dead anchor sends the reader nowhere, and
    // the anchors are the feature's provenance claim.
    const r = call(name, {}, 'a'.repeat(200));
    for (const c of r.citations) {
      expect({ name, anchor: c.anchor, known: PAGE_ANCHORS.includes(c.anchor) }).toEqual({
        name,
        anchor: c.anchor,
        known: true,
      });
      expect(c.label).toBeTruthy();
    }
  });

  it('reports an unknown tool rather than throwing', () => {
    const r = call('get_salary_expectations');
    expect(JSON.stringify(r.data)).toMatch(/unknown tool/i);
    expect(r.citations).toEqual([]);
  });
});

describe('hostile and wrong-typed arguments', () => {
  /*
   * The model is the only caller and it will pass a string for a number, a
   * number for a string, null, and arguments that do not exist. None of that
   * may throw: an exception here becomes a 500 the visitor sees as a broken
   * feature.
   */
  const junk: Array<Record<string, unknown>> = [
    { limit: 'lots' },
    { limit: -5 },
    { limit: 9999 },
    { limit: null },
    { top: 'all' },
    { company: 12345 },
    { company: '' },
    { query: '' },
    { query: 'x'.repeat(5000) },
    { vendor: null, kind: 'nonsense' },
    { item: 42 },
    { acknowledge: false },
    { unexpectedKey: { nested: true } },
  ];

  it.each(toolSpecs.map((s) => s.name))('%s survives every junk argument', (name) => {
    for (const input of junk) {
      expect(() => call(name, input, 'a'.repeat(100))).not.toThrow();
    }
  });
});

describe('search_experience', () => {
  it('flags a broad query instead of returning a grab-bag', () => {
    const r = call('search_experience', { query: 'what has he shipped' });
    const data = r.data as { tooBroad?: boolean; matches?: unknown[] };
    expect(data.tooBroad).toBe(true);
    expect(data.matches).toEqual([]);
  });

  it('flags a weak match rather than presenting it as the answer', () => {
    const r = call('search_experience', { query: 'does he speak Japanese' });
    const data = r.data as { lowConfidence?: boolean; note?: string };
    // Either nothing matched, or it matched weakly and said so. What it must
    // never do is return a hit with no caveat.
    expect(data.lowConfidence === true || /nothing on the cv/i.test(data.note ?? '')).toBe(true);
  });

  it('resolves a specific term with citations', () => {
    const r = call('search_experience', { query: 'landing zone' });
    const data = r.data as { matches?: Array<{ text: string; source: string }> };
    expect((data.matches ?? []).length).toBeGreaterThan(0);
    expect(r.citations.length).toBeGreaterThan(0);
  });
});

describe('match_job_description', () => {
  it('says so when no job description was supplied', () => {
    const r = call('match_job_description', { acknowledge: 'pasted' });
    expect(JSON.stringify(r.data).length).toBeGreaterThan(0);
    // Must not pretend to have matched something.
    expect(JSON.stringify(r.data)).not.toMatch(/"coverage":\s*[1-9]/);
  });

  it('truncates a job description beyond the cap', () => {
    // The JD is the largest input the endpoint takes, so the cap is a cost
    // control as much as a sanity one.
    const huge = 'kubernetes terraform '.repeat(2000);
    expect(huge.length).toBeGreaterThan(MAX_JD_CHARS);
    const r = call('match_job_description', { acknowledge: 'pasted' }, huge);
    // Nothing in the result may echo more than the cap's worth of input.
    expect(JSON.stringify(r.data).length).toBeLessThan(MAX_JD_CHARS * 4);
  });

  it('finds real overlap in a plausible job description', () => {
    const jd = `Senior Platform Engineer. Required: Amazon EKS, Terraform,
      multi-account AWS landing zones, CI/CD pipelines. Nice to have: Istio.`;
    const r = call('match_job_description', { acknowledge: 'pasted' }, jd);
    const text = JSON.stringify(r.data).toLowerCase();
    expect(text).toMatch(/terraform|eks|landing/);
  });
});

describe('get_role', () => {
  it('returns a known employer', () => {
    const employers = (toolSpecs.find((s) => s.name === 'get_role')!.inputSchema.json as {
      properties: { company: { enum: readonly string[] } };
    }).properties.company.enum;
    expect(employers.length).toBeGreaterThan(0);

    const r = call('get_role', { company: employers[0] });
    expect(JSON.stringify(r.data).length).toBeGreaterThan(50);
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it('does not invent an employer it was not given', () => {
    const r = call('get_role', { company: 'Acme Corp' });
    const text = JSON.stringify(r.data);
    // Must report the miss, not fabricate a role.
    expect(text).not.toMatch(/responsibilities/i);
  });
});

describe('get_availability_and_contact', () => {
  it('returns the contact details and cites contact', () => {
    const r = call('get_availability_and_contact');
    const text = JSON.stringify(r.data);
    expect(text).toMatch(/@/); // an email is present
    expect(r.citations.some((c) => c.anchor === '#contact')).toBe(true);
  });
});

describe('list_certifications', () => {
  it('filters by vendor without crashing on an unknown one', () => {
    const aws = call('list_certifications', { vendor: 'AWS' });
    expect(JSON.stringify(aws.data)).toMatch(/AWS/);
    const none = call('list_certifications', { vendor: 'Nonexistent Vendor' });
    expect(() => JSON.stringify(none.data)).not.toThrow();
  });

  it('never attaches a currency or status claim to a certification', () => {
    /*
     * A documented decision: all three proctored AWS certs are older than the
     * three-year window, and the choice is to show the earn year and nothing
     * else. "Active", "expired" or "current" appearing here would contradict
     * the site and the resume.
     */
    const text = JSON.stringify(call('list_certifications', {}).data).toLowerCase();
    expect(text).not.toMatch(/\bactive\b|\bexpired\b|\bcurrently valid\b/);
  });
});
