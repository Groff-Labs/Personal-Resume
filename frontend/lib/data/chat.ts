// "Ask my CV" assistant.
//
// Hidden unless NEXT_PUBLIC_CHAT_ENABLED is set to something truthy at build
// time, injected in deploy-site.yml from the environment-scoped GitHub variable
// CHAT_ENABLED. Same role as `showTestimonials` in testimonials.ts.
//
// An env var rather than a committed boolean, deliberately: it lets the section
// be live on dev while still hidden in prod, so promoting the code doesn't
// publish the feature. There is an independent server-side kill switch too
// (`chatModelId: ""` in infrastructure/cdk.json), which tears down the backend
// without a site rebuild.
//
// THE FALSY LIST IS NOT DECORATION, and the comment here used to be wrong.
// It said the convention was "empty value disables the feature", which is not
// reachable: the GitHub API rejects an empty variable value outright with
// `422 Variable value cannot be empty`, so the only way to clear one is to
// delete it. Anyone who instead did the obvious thing and set CHAT_ENABLED=0
// got a non-empty string, and a kill switch that failed OPEN -- the chat
// shipped. Found Oct 2026 while disabling the assistant on dev.
//
// So an unset variable still disables (deleting it is what GitHub supports),
// and the values a person would reach for to mean "off" now also disable.
// Anything else non-empty enables, so the existing "1" is unaffected.
const OFF = new Set(["0", "false", "off", "no"]);

/**
 * Exported and pure so the kill switch can be asserted directly. `showChat`
 * itself is a module-scope const read from the environment, which a test can
 * only vary through `resetModules` gymnastics; this takes the value as an
 * argument instead.
 */
export function chatEnabled(raw: string | undefined): boolean {
  const v = (raw ?? "").trim();
  return v !== "" && !OFF.has(v.toLowerCase());
}

export const showChat = chatEnabled(process.env.NEXT_PUBLIC_CHAT_ENABLED);

export const chatEndpoint = "/api/chat";

/** Mirrors the server-side caps in the Lambda. Enforced there too; these are
 *  only so the UI can stop a hopeless request before spending a round trip. */
export const CHAT_MAX_CHARS = 500;
export const CHAT_MAX_JD_CHARS = 6000;
export const CHAT_MAX_TURNS = 6;

export const suggestedPrompts = [
  "What has he actually shipped on AWS?",
  "Which AWS certifications does he hold?",
  "Does he have landing zone experience?",
  "Is he open to new roles?",
];

/** Anchor -> label for the citation chips. Keys must match the rendered ids. */
export const sectionLabels: Record<string, string> = {
  "#about": "About",
  "#skills": "Skills",
  "#experience": "Experience",
  "#education": "Education",
  "#certifications": "Certifications",
  "#contact": "Contact",
};

export const disclosure =
  "Answers come from Amazon Nova Lite reading this page's own data, with Amazon Bedrock Guardrails on the input and the output. It can still be wrong; the PDF résumé is canonical.";

/* ------------------------------------------------------------------ *
 * Wire contract. Mirrors infrastructure/lambda/chat/types.ts by hand:
 * importing across that boundary would drag the Lambda's dependencies into
 * the browser bundle. Keep the two in step.
 * ------------------------------------------------------------------ */

export interface ChatCitation {
  anchor: string;
  label: string;
}

export type ChatErrorCode =
  | "bad_request"
  | "rate_limited"
  | "budget_exhausted"
  | "turn_limit"
  | "guardrail_blocked"
  | "internal";

export type ChatEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; id: string; name: string; input: Record<string, unknown> }
  | {
      type: "tool_result";
      id: string;
      name: string;
      summary: string;
      citations: ChatCitation[];
      ms: number;
    }
  | { type: "delta"; text: string }
  | { type: "citations"; citations: ChatCitation[] }
  | { type: "error"; code: ChatErrorCode; message: string; retryAfter?: number }
  | {
      type: "done";
      hops: number;
      usage: { inputTokens: number; outputTokens: number; microUsd: number };
    };

/**
 * Lambda does not accept unsigned payloads, so a POST through CloudFront's
 * Lambda OAC requires the viewer to send the SHA-256 of the request body in
 * `x-amz-content-sha256`; CloudFront uses it as the payload hash when signing.
 *
 * Note the header must NOT be named in the origin request policy — CloudFront
 * rejects that outright and manages the header itself. See chat-api.ts.
 */
export async function bodyHash(body: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
