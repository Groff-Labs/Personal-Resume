/**
 * Wire contract between the chat Lambda and Chat.tsx.
 *
 * Kept in sync by hand: the frontend is a separate tsconfig/bundle and importing
 * across that boundary would drag the Lambda's deps into the browser. The shapes
 * are small and stable; if they start churning, generate them from here instead.
 *
 * The response is newline-delimited JSON (one event per line), not SSE, because
 * a Lambda Function URL with RESPONSE_STREAM gives us a raw byte stream and
 * NDJSON is the cheapest thing to parse incrementally in the browser.
 */

export interface ChatRequestMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  /** Client-generated UUID. Used only for per-IP conversation counting. */
  conversationId: string;
  messages: ChatRequestMessage[];
  /** Optional pasted job description for the match tool. Truncated server-side. */
  jobDescription?: string;
}

export type ChatErrorCode =
  | 'bad_request'
  | 'rate_limited'
  | 'budget_exhausted'
  | 'turn_limit'
  | 'guardrail_blocked'
  | 'internal';

/**
 * Streamed events. `tool_call` / `tool_result` are what make the agent loop
 * visible in the UI — they are the demonstrable artifact, not decoration.
 */
export type ChatEvent =
  | { type: 'status'; message: string }
  | { type: 'tool_call'; id: string; name: string; input: Record<string, unknown> }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      summary: string;
      citations: Array<{ anchor: string; label: string }>;
      ms: number;
    }
  | { type: 'delta'; text: string }
  | { type: 'citations'; citations: Array<{ anchor: string; label: string }> }
  | {
      type: 'error';
      code: ChatErrorCode;
      message: string;
      /** Seconds, only on rate_limited. */
      retryAfter?: number;
    }
  | {
      type: 'done';
      hops: number;
      usage: { inputTokens: number; outputTokens: number; microUsd: number };
    };

export function encodeEvent(e: ChatEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(e) + '\n');
}
