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

/** Remove `<thinking>` / `<reasoning>` scaffolding and invented tool lines. */
export function stripReasoning(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<\/?thinking>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(FABRICATED_TOOL_LINE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
