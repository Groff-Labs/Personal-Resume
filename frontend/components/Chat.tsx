"use client";

/**
 * The inline entry point for the assistant.
 *
 * Until Oct 2026 this was the whole feature: a full chat card sitting between
 * About and Skills. The conversation moved into a floating widget
 * (`ChatWidget`, mounted in `app/layout.tsx`) so it is reachable from anywhere
 * on the page rather than only when someone happens to scroll to it.
 *
 * This band stayed rather than being deleted, and the reason is worth keeping.
 * The sentence below is the only place the page *states* what the feature is:
 * an agent with read-only tools that shows its own lookups. A visitor who
 * scrolls past without ever clicking still reads that, and it is in the static
 * export, so it survives for anything that reads the HTML without running the
 * panel. Moving it inside the panel would have hidden the claim behind the
 * click it is meant to earn.
 *
 * It also keeps `id="chat"` alive, which the nav's "Ask" link and its
 * IntersectionObserver both target.
 */
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { showChat } from "@/lib/data/chat";
import { openChatPanel } from "@/lib/chatPanel";

export default function Chat() {
  // Mirrors the `showTestimonials` pattern: the whole section disappears when
  // the feature is off, so a build without CHAT_ENABLED ships nothing.
  if (!showChat) return null;

  return (
    // no-print: the assistant has no place on a printed CV, and the @media
    // print block in globals.css already hides .no-print.
    <section id="chat" className="section-container bg-surface-1 no-print">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="eyebrow mb-2">Ask my CV</p>
        <h2 className="section-title">Ask the assistant anything</h2>
        <p className="mb-6 text-sm text-ink-muted">
          An agent with read-only tools over the same data this page renders. It
          looks things up rather than guessing, and shows you which tools it
          called.
        </p>

        <button
          type="button"
          onClick={openChatPanel}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <MessageSquare className="h-4 w-4" />
          Ask the assistant
        </button>

        <p className="mt-3 text-xs text-ink-subtle">
          Opens in the corner, and stays there while you read.
        </p>
      </motion.div>
    </section>
  );
}
