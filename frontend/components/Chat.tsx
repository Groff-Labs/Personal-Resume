"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  ChevronDown,
  CornerDownRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  CHAT_MAX_CHARS,
  CHAT_MAX_JD_CHARS,
  CHAT_MAX_TURNS,
  type ChatCitation,
  type ChatErrorCode,
  type ChatEvent,
  bodyHash,
  chatEndpoint,
  disclosure,
  sectionLabels,
  showChat,
  suggestedPrompts,
} from "@/lib/data/chat";
import { contact } from "@/lib/data/contact";

interface ToolTrace {
  id: string;
  name: string;
  input: Record<string, unknown>;
  summary?: string;
  ms?: number;
}

interface Turn {
  question: string;
  answer: string;
  tools: ToolTrace[];
  citations: ChatCitation[];
  error?: { code: ChatErrorCode; message: string };
}

type Phase = "idle" | "working" | "done";

export default function Chat() {
  // Mirrors the `showTestimonials` pattern: the whole section disappears when
  // the feature is off, so a build without CHAT_ENABLED ships nothing.
  if (!showChat) return null;
  return <ChatSection />;
}

function ChatSection() {
  const reduceMotion = useReducedMotion();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [jd, setJd] = useState("");
  const [jdOpen, setJdOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [openTrace, setOpenTrace] = useState<number | null>(null);

  // Conversation id lives in a ref, not storage: a reload starts a fresh
  // conversation and nothing about the exchange is persisted anywhere.
  const conversationId = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const atTurnLimit = turns.filter((t) => !t.error).length >= CHAT_MAX_TURNS;
  const busy = phase === "working";

  async function send(question: string) {
    const text = question.trim().slice(0, CHAT_MAX_CHARS);
    if (!text || busy || atTurnLimit) return;

    setDraft("");
    setPhase("working");
    setStatus("Sending");

    const index = turns.length;
    setTurns((prev) => [...prev, { question: text, answer: "", tools: [], citations: [] }]);
    setOpenTrace(index);

    const patch = (fn: (t: Turn) => Turn) =>
      setTurns((prev) => prev.map((t, i) => (i === index ? fn(t) : t)));

    // Only completed exchanges go back as history; the server re-grounds every
    // claim with a fresh tool call regardless.
    const history = turns
      .filter((t) => !t.error && t.answer)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer },
      ]);

    const body = JSON.stringify({
      conversationId: conversationId.current,
      messages: [...history, { role: "user", content: text }],
      ...(jd.trim().length >= 40 ? { jobDescription: jd.slice(0, CHAT_MAX_JD_CHARS) } : {}),
    });

    try {
      const res = await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Required: Lambda rejects unsigned payloads behind CloudFront OAC.
          "x-amz-content-sha256": await bodyHash(body),
        },
        body,
      });

      if (!res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // NDJSON: one event per line, so split on newlines and keep the remainder.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: ChatEvent;
          try {
            event = JSON.parse(line) as ChatEvent;
          } catch {
            continue;
          }

          switch (event.type) {
            case "status":
              setStatus(event.message);
              break;
            case "tool_call":
              setStatus(`Looking up ${event.name.replace(/_/g, " ")}`);
              patch((t) => ({
                ...t,
                tools: [...t.tools, { id: event.id, name: event.name, input: event.input }],
              }));
              break;
            case "tool_result":
              patch((t) => ({
                ...t,
                tools: t.tools.map((x) =>
                  x.id === event.id ? { ...x, summary: event.summary, ms: event.ms } : x,
                ),
              }));
              break;
            case "delta":
              setStatus("");
              patch((t) => ({ ...t, answer: t.answer + event.text }));
              break;
            case "citations":
              patch((t) => ({ ...t, citations: event.citations }));
              break;
            case "error":
              patch((t) => ({ ...t, error: { code: event.code, message: event.message } }));
              break;
            case "done":
              break;
          }
        }
      }
    } catch {
      patch((t) => ({
        ...t,
        error: {
          code: "internal",
          message: `Could not reach the assistant. The résumé is at ${contact.resumePdf}.`,
        },
      }));
    } finally {
      setPhase("done");
      setStatus("");
    }
  }

  return (
    // no-print: a chat transcript has no place in a printed CV, and the
    // @media print block in globals.css already hides .no-print.
    <section id="chat" className="section-container bg-surface-1 no-print">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <p className="eyebrow text-center mb-2">Ask my CV</p>
        <h2 className="section-title">Ask the assistant</h2>
        <p className="text-center text-sm text-ink-muted max-w-2xl mx-auto mb-8">
          An agent with read-only tools over the same data this page renders. It
          looks things up rather than guessing, and shows you which tools it
          called.
        </p>

        <div className="card max-w-3xl mx-auto">
          {/* transcript */}
          {turns.length > 0 && (
            <ol className="space-y-6 mb-6">
              {turns.map((turn, i) => (
                <li key={i} className="space-y-3">
                  <p className="flex items-start gap-2 text-sm font-medium text-ink">
                    <CornerDownRight className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                    <span>{turn.question}</span>
                  </p>

                  {/* The tool trace. This is the point of the feature: it is
                      visible evidence the answer came from a lookup. */}
                  {turn.tools.length > 0 && (
                    <div className="rounded-md border border-line bg-surface-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenTrace(openTrace === i ? null : i)}
                        aria-expanded={openTrace === i}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left eyebrow hover:text-accent transition-colors"
                      >
                        <Wrench className="w-3 h-3 shrink-0" />
                        <span>
                          {turn.tools.length} tool call{turn.tools.length === 1 ? "" : "s"}
                        </span>
                        <ChevronDown
                          className={`w-3 h-3 ml-auto transition-transform ${
                            openTrace === i ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {openTrace === i && (
                        <ol className="border-t border-line divide-y divide-line">
                          {turn.tools.map((tool) => (
                            <li
                              key={tool.id}
                              className="px-3 py-2 font-mono text-[11px] text-ink-muted"
                            >
                              <span className="text-accent">{tool.name}</span>
                              <span className="break-all">
                                ({Object.entries(tool.input).length === 0
                                  ? ""
                                  : Object.entries(tool.input)
                                      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                                      .join(", ")}
                                )
                              </span>
                              {tool.summary && (
                                <span className="block text-ink-subtle">
                                  → {tool.summary}
                                  {typeof tool.ms === "number" ? ` · ${tool.ms}ms` : ""}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}

                  {turn.error ? (
                    <p
                      className={`flex items-start gap-2 text-sm ${
                        turn.error.code === "guardrail_blocked"
                          ? "text-ink-muted"
                          : "text-ink-muted"
                      }`}
                    >
                      {turn.error.code === "guardrail_blocked" && (
                        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                      )}
                      <span>
                        {turn.error.message}
                        {turn.error.code === "guardrail_blocked" && (
                          <span className="eyebrow block mt-1">Blocked by guardrail</span>
                        )}
                      </span>
                    </p>
                  ) : (
                    turn.answer && (
                      <div className="text-sm text-ink leading-relaxed whitespace-pre-line">
                        {turn.answer}
                        {busy && i === turns.length - 1 && !reduceMotion && (
                          <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-accent animate-pulse" />
                        )}
                      </div>
                    )
                  )}

                  {/* Citations resolve to the real sections of this page, so a
                      claim and its source are one click apart. */}
                  {turn.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {turn.citations.map((c) => (
                        <a
                          key={c.anchor}
                          href={c.anchor}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-line text-[11px] text-ink-muted hover:text-accent hover:border-accent transition-colors"
                        >
                          {sectionLabels[c.anchor] ?? c.label}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {/* live status, announced to screen readers */}
          <p aria-live="polite" role="status" className="sr-only">
            {status}
          </p>
          {busy && status && (
            <p className="flex items-center gap-2 text-xs text-ink-subtle mb-4">
              <Sparkles className="w-3 h-3 animate-pulse" />
              {status}…
            </p>
          )}

          {/* composer */}
          {atTurnLimit ? (
            <p className="text-sm text-ink-muted">
              That&apos;s {CHAT_MAX_TURNS} questions, which is plenty for a demo. For anything
              more,{" "}
              <a href={contact.emailHref} className="text-accent hover:underline">
                email him
              </a>
              .
            </p>
          ) : (
            <>
              {turns.length === 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-full border border-line text-xs text-ink-muted hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft);
                }}
                className="flex items-end gap-2"
              >
                <label className="sr-only" htmlFor="chat-input">
                  Ask a question about Michael&apos;s CV
                </label>
                <textarea
                  id="chat-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, CHAT_MAX_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(draft);
                    }
                  }}
                  rows={2}
                  disabled={busy}
                  placeholder="Ask about his roles, skills or certifications…"
                  className="flex-1 resize-none rounded-md border border-line bg-surface-0 px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  aria-label="Send question"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-40"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </form>

              {/* JD matcher. Collapsed by default: it is the heaviest input the
                  endpoint accepts and has its own tighter daily allowance. */}
              <details
                open={jdOpen}
                onToggle={(e) => setJdOpen((e.currentTarget as HTMLDetailsElement).open)}
                className="mt-4"
              >
                <summary className="eyebrow cursor-pointer hover:text-accent transition-colors">
                  Match against a job description
                </summary>
                <p className="mt-2 text-xs text-ink-subtle">
                  Paste a job description and ask how he lines up. Matching is computed in code
                  against the data on this page, not inferred by the model, so it cannot invent a
                  skill.
                </p>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value.slice(0, CHAT_MAX_JD_CHARS))}
                  rows={5}
                  placeholder="Paste the job description…"
                  className="mt-2 w-full resize-y rounded-md border border-line bg-surface-0 px-3 py-2 text-xs text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                />
                <p className="mt-1 font-mono text-[11px] text-ink-subtle">
                  {jd.length} / {CHAT_MAX_JD_CHARS}
                </p>
              </details>
            </>
          )}

          <p className="mt-5 pt-4 border-t border-line text-[11px] text-ink-subtle">
            {disclosure}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
