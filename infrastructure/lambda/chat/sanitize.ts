/**
 * Prose sanitising for model output, kept separate from `index.ts` so it is
 * testable.
 *
 * `index.ts` cannot be imported from a test: it builds a Bedrock client and
 * calls `awslambda.streamifyResponse` at module scope, neither of which exists
 * outside the Lambda runtime. These are pure string functions with no imports.
 */

/**
 * Patterns a model emits when it writes a tool transcript as prose instead of
 * emitting a real `toolUse` block.
 *
 * Not hypothetical. Oct 2026, on dev: "Tell me about the Azure to AWS
 * assessment" came back opening with the literal line
 * `Tool result: No relevant information found.`, while the request logged
 * `hops:1, toolsUsed:[]` — no tool was called at all. Retrieval handles that
 * query at coverage 1.00, so the passage was present and reachable; the model
 * simply invented a lookup and its failure.
 *
 * This matters beyond tidiness. The chat section tells visitors the assistant
 * "looks things up rather than guessing, and shows you which tools it called",
 * so a fabricated result is the single artifact that must never reach them: it
 * is indistinguishable from evidence. The genuine trace is built from
 * `tool_call` / `tool_result` stream events, which the model cannot author.
 *
 * Anchored with `^` so a real sentence that happens to mention a tool result
 * mid-paragraph survives.
 */
const FABRICATED_TOOL_LINE =
  /^[ \t]*(?:tool[ _-]?(?:result|call|output|response|use)|observation|function[ _-]?(?:result|call|response))\s*:.*$/gim;

/**
 * Inline source attributions, which leak internal passage labels to the reader.
 *
 * Prompt rule 14 forbids these, and the rule is not sufficient: observed on dev
 * in Oct 2026, an answer ended with
 * `(Source: Leadership -> The hardest problems are not the technical ones)`.
 * Those arrows and section names are corpus bookkeeping, and the interface
 * already renders provenance as citation chips from the anchors the tools
 * return, so an inline attribution is both redundant and a leak.
 *
 * Matched anywhere, not just at line start, because the model appends it to the
 * end of a sentence.
 */
const INLINE_SOURCE =
  /\s*[([]\s*(?:source|from|per|citation|ref(?:erence)?)\s*[:=][^)\]]*[)\]]/gi;

/** Remove `<thinking>` / `<reasoning>` scaffolding, invented tool lines and source leaks. */
export function stripReasoning(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<\/?thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(FABRICATED_TOOL_LINE, '')
    .replace(INLINE_SOURCE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
