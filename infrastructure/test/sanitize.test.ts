import { stripReasoning } from '../lambda/chat/sanitize';

/**
 * Guards the one failure the chat section's own copy promises cannot happen:
 * the assistant says it "looks things up rather than guessing, and shows you
 * which tools it called", so a model-invented tool transcript must never reach
 * a visitor. It is indistinguishable from evidence.
 *
 * The first case is the exact text observed on dev in Oct 2026, on a request
 * that logged `hops:1, toolsUsed:[]`.
 */
describe('stripReasoning', () => {
  it('removes the fabricated tool line observed in production', () => {
    const observed =
      'Tool result: No relevant information found.\n\n' +
      'Michael Groff is available for new roles focusing on AWS architecture ' +
      'and platform work.';

    const out = stripReasoning(observed);

    expect(out).not.toContain('Tool result');
    expect(out).toBe(
      'Michael Groff is available for new roles focusing on AWS architecture ' +
        'and platform work.',
    );
  });

  it.each([
    'Tool call: search_experience(query: "landing zone")',
    'tool_result: nothing found',
    'Tool Output: 4 matches',
    'TOOL USE: get_highlights',
    'Observation: the CV does not mention this',
    'Function call: list_certifications',
    '  Tool result: indented by the model',
  ])('removes %j', (line) => {
    expect(stripReasoning(`${line}\nThe real answer.`)).toBe('The real answer.');
  });

  it('leaves a genuine mid-sentence mention alone', () => {
    // Anchoring to line start is what makes this safe: the words themselves
    // are legitimate English and appear in answers about his own work.
    const real =
      'He treats a tool result as evidence rather than a conclusion, and the ' +
      'observation: that estimates drift, drove the review process.';
    expect(stripReasoning(real)).toBe(real);
  });

  it('still strips thinking and reasoning blocks', () => {
    expect(stripReasoning('<thinking>deliberating</thinking>Answer.')).toBe('Answer.');
    expect(stripReasoning('<reasoning>step one</reasoning>Answer.')).toBe('Answer.');
  });

  it('collapses the blank lines stripping leaves behind', () => {
    const out = stripReasoning('Tool result: a\nTool result: b\n\n\n\nReal answer.');
    expect(out).toBe('Real answer.');
  });

  it('returns empty when the whole answer was fabricated, so the caller re-asks', () => {
    // `index.ts` re-prompts with tools withheld when `answer` is empty, so an
    // answer that was nothing but an invented tool line becomes a real answer
    // rather than a blank bubble.
    expect(stripReasoning('Tool result: No relevant information found.')).toBe('');
  });
});
