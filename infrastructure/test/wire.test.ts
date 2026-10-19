/**
 * The wire contract between the Lambda and the browser, and the knowledge
 * chunker that feeds it.
 *
 * `types.ts` and `knowledge.ts` had no direct coverage. The NDJSON contract in
 * particular is an invariant held across two files that do not import each
 * other: `encodeEvent` appends a newline, and `ChatPanel`'s reader relies on it
 * by breaking on `done` WITHOUT flushing its remaining buffer. That is correct
 * today and silently wrong the moment the newline goes away, and the symptom
 * would be the last event of every turn vanishing: no error, just a missing
 * `done` and an answer that never stops looking like it is streaming.
 */
import { encodeEvent, type ChatEvent } from '../lambda/chat/types';
import { highlightSections, splitSections, windowed } from '../lambda/chat/knowledge';

const decode = (u: Uint8Array) => new TextDecoder().decode(u);

describe('encodeEvent: the NDJSON contract', () => {
  const sample: ChatEvent[] = [
    { type: 'status', message: 'Sending' },
    { type: 'tool_call', id: 'a1', name: 'search_experience', input: { query: 'landing zone' } },
    {
      type: 'tool_result',
      id: 'a1',
      name: 'search_experience',
      summary: '4 matches',
      citations: [{ anchor: '#experience', label: 'Experience' }],
      ms: 51,
    },
    { type: 'delta', text: 'He deployed Landing Zone Accelerator.' },
    { type: 'citations', citations: [{ anchor: '#skills', label: 'Skills' }] },
    { type: 'error', code: 'rate_limited', message: 'too many', retryAfter: 60 },
    { type: 'done', hops: 2, usage: { inputTokens: 10, outputTokens: 2, microUsd: 956 } },
  ];

  it('terminates every event with exactly one newline', () => {
    // ChatPanel's reader does `buffer.split("\n")` then `lines.pop()` and
    // breaks on `done` without flushing. Drop this newline and the final
    // event of every turn is lost.
    for (const e of sample) {
      const s = decode(encodeEvent(e));
      expect(s.endsWith('\n')).toBe(true);
      expect(s.slice(0, -1)).not.toContain('\n');
    }
  });

  it('emits one parseable JSON object per line, round-tripping', () => {
    for (const e of sample) {
      const s = decode(encodeEvent(e));
      expect(JSON.parse(s)).toEqual(e);
    }
  });

  it('survives concatenation, which is how the stream is actually read', () => {
    const stream = sample.map((e) => decode(encodeEvent(e))).join('');
    const lines = stream.split('\n');
    const remainder = lines.pop();
    // The reader keeps the remainder as a partial line. With the trailing
    // newline guaranteed, that remainder is always empty at the end.
    expect(remainder).toBe('');
    expect(lines).toHaveLength(sample.length);
    expect(lines.map((l) => (JSON.parse(l) as ChatEvent).type)).toEqual(sample.map((e) => e.type));
  });

  it('escapes a newline inside answer text rather than emitting it raw', () => {
    // A model answer containing a line break must not split into two lines, or
    // the reader sees a truncated JSON object and drops the whole event.
    const e: ChatEvent = { type: 'delta', text: 'line one\nline two\n\nline three' };
    const s = decode(encodeEvent(e));
    expect(s.split('\n')).toHaveLength(2); // the payload, then the terminator
    expect((JSON.parse(s) as { text: string }).text).toBe('line one\nline two\n\nline three');
  });

  it('handles multi-byte characters, which the resume prose contains', () => {
    // "résumé", the middot and the arrow all appear in real answers, and a
    // chunk boundary mid-character is the classic streaming bug.
    const e: ChatEvent = { type: 'delta', text: 'résumé · 51ms → done — ok' };
    const bytes = encodeEvent(e);
    expect(JSON.parse(decode(bytes))).toEqual(e);

    // Split the bytes at every position and reassemble with a streaming
    // decoder, which is what the browser does across reads.
    for (let i = 1; i < bytes.length; i++) {
      const dec = new TextDecoder();
      const joined =
        dec.decode(bytes.slice(0, i), { stream: true }) + dec.decode(bytes.slice(i));
      expect(JSON.parse(joined)).toEqual(e);
    }
  });
});

describe('splitSections', () => {
  it('strips HTML comments before splitting, so unwritten notes never reach the model', () => {
    /*
     * This is a content guarantee, not a formatting nicety. `knowledge/` is a
     * public directory where unwritten sections were marked with HTML
     * comments, and the rule is that the assistant must never quote one. The
     * comment has to be removed BEFORE splitting, or a comment containing a
     * `##` would also invent a section heading.
     */
    const md = [
      '## Real heading',
      'Real body.',
      '<!-- TODO: ask about the NDA -->',
      '',
      '## Another heading',
      '<!--',
      '## A heading inside a comment',
      'and a body inside a comment',
      '-->',
      'Visible body.',
    ].join('\n');

    const sections = splitSections(md);
    const all = JSON.stringify(sections);

    expect(all).not.toMatch(/TODO/);
    expect(all).not.toMatch(/NDA/);
    expect(all).not.toMatch(/inside a comment/);
    expect(sections.map((s) => s.heading)).toEqual(['Real heading', 'Another heading']);
  });

  it('drops a section with no body rather than emitting an empty one', () => {
    const sections = splitSections('## Heading with nothing under it\n\n## Real\nBody.');
    for (const s of sections) {
      expect(s.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns nothing for empty or comment-only input', () => {
    expect(splitSections('')).toEqual([]);
    expect(splitSections('<!-- everything is a comment -->')).toEqual([]);
  });
});

describe('windowed', () => {
  it('keeps a short text whole', () => {
    expect(windowed('One short sentence.')).toEqual(['One short sentence.']);
  });

  it('never exceeds the limit by more than one sentence', () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
    const chunks = windowed(text, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      // Splitting at sentence boundaries means a chunk can overshoot by the
      // length of one sentence, but not unboundedly.
      expect(c.length).toBeLessThan(200 + 80);
    }
  });

  it('loses no words', () => {
    const text = Array.from({ length: 40 }, (_, i) => `word${i} and more text here.`).join(' ');
    const rejoined = windowed(text, 150).join(' ');
    for (let i = 0; i < 40; i++) {
      expect(rejoined).toContain(`word${i}`);
    }
  });

  it('emits no empty chunk', () => {
    for (const size of [40, 100, 700, 5000]) {
      const chunks = windowed('A. B. C. '.repeat(50), size);
      expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
    }
  });
});

describe('highlightSections', () => {
  it('returns ordered highlights with a title and a body', () => {
    // Order is the whole point of this file: it backs get_highlights and is
    // retrieved as a list rather than by relevance.
    const hs = highlightSections();
    expect(hs.length).toBeGreaterThan(3);
    for (const h of hs) {
      expect(h.title.trim().length).toBeGreaterThan(0);
      expect(h.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('leaks no HTML comment', () => {
    expect(JSON.stringify(highlightSections())).not.toContain('<!--');
  });
});
