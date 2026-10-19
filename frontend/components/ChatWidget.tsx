"use client";

/**
 * The floating chat launcher and its panel.
 *
 * Mounted in `app/layout.tsx` rather than `page.tsx` so the launcher is present
 * regardless of what else is on screen. The inline teaser in `Chat.tsx` is a
 * second entry point: it keeps the "this is an agent with read-only tools"
 * claim in the page's static HTML, where a scroller and a crawler both see it,
 * which a panel behind a click cannot do.
 *
 * Deliberately NOT a modal. It is a non-blocking companion to the page: focus
 * is not trapped, the rest of the document stays reachable, and background
 * scroll is left alone, unlike the two image lightboxes in this codebase which
 * are genuinely modal. So it is a labelled region with an `aria-expanded`
 * launcher, not `role="dialog" aria-modal`.
 *
 * z-index sits above the fixed nav (z-50) so an open panel is not clipped on a
 * phone, and below the lightboxes (z-100) so an enlarged diagram still covers
 * it.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MessageSquare, X } from "lucide-react";
import { showChat } from "@/lib/data/chat";
import {
  closeChatPanel,
  dismissNudge,
  hydrateNudge,
  openChatPanel,
  useChatPanelOpen,
  useNudgeDismissed,
} from "@/lib/chatPanel";
import ChatPanel from "./ChatPanel";

/** How long before the bubble appears, if the visitor has not scrolled past the hero. */
const NUDGE_DELAY_MS = 12_000;

export default function ChatWidget() {
  // Same gate as everything else chat-related: a build without CHAT_ENABLED
  // ships no launcher, no panel and no reference to /api/chat.
  if (!showChat) return null;
  return <Widget />;
}

function Widget() {
  const open = useChatPanelOpen();
  const nudgeDismissed = useNudgeDismissed();
  const reduceMotion = useReducedMotion();

  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    hydrateNudge();
  }, []);

  // The bubble appears on whichever comes first: a dwell timer, or scrolling
  // past roughly the hero. Scroll is the better signal (it means they are
  // reading) and the timer is the fallback for someone who lands and pauses.
  const nudgeReady = useNudgeTrigger(nudgeDismissed);

  // Escape closes, from anywhere. Registered only while open so it does not
  // swallow Escape from the image lightboxes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChatPanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus moves into the panel on open and back to the launcher on close, but
  // only when the panel was actually open first: without that guard this steals
  // focus on mount for every visitor.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      // The composer is what someone opened this to use.
      const input = panelRef.current?.querySelector<HTMLTextAreaElement>("#chat-input");
      (input ?? panelRef.current)?.focus();
    } else if (wasOpen.current) {
      launcherRef.current?.focus();
    }
  }, [open]);

  const showNudge = !open && !nudgeDismissed && nudgeReady;

  return (
    // no-print: a chat launcher has no place on a printed CV, and the
    // @media print block in globals.css hides .no-print.
    <div className="no-print fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            tabIndex={-1}
            role="region"
            aria-label="Ask the assistant about Michael's CV"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            /*
             * Sizing: on a phone this is the viewport minus the gutters and the
             * launcher, which is why the width is a calc rather than a fixed
             * value. `max-h` leaves the nav visible so the page never feels
             * hijacked, and `overflow-y-auto` keeps a long transcript inside
             * the panel instead of growing it off screen.
             */
            className="w-[calc(100vw-2rem)] sm:w-[26rem] max-h-[min(32rem,calc(100vh-8rem))] overflow-y-auto rounded-lg border border-line bg-surface-1 shadow-2xl"
          >
            <div className="sticky top-0 flex items-start gap-2 border-b border-line bg-surface-1 px-4 py-3">
              <div className="flex-1">
                <p className="eyebrow">Ask my CV</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Read-only tools over this page&apos;s own data. It shows you
                  what it looked up.
                </p>
              </div>
              <button
                type="button"
                onClick={closeChatPanel}
                aria-label="Close the assistant"
                className="shrink-0 rounded-md p-1 text-ink-subtle transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4">
              <ChatPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNudge && (
          <motion.div
            key="nudge"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex max-w-[16rem] items-start gap-2 rounded-lg border border-line bg-surface-1 px-3 py-2 shadow-lg"
          >
            <button
              type="button"
              onClick={openChatPanel}
              className="text-left text-xs leading-snug text-ink-muted transition-colors hover:text-accent"
            >
              Questions about his experience? Ask the assistant.
            </button>
            <button
              type="button"
              onClick={dismissNudge}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 shrink-0 rounded p-1 text-ink-subtle transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? closeChatPanel() : openChatPanel())}
        aria-expanded={open}
        aria-label={open ? "Close the assistant" : "Ask the assistant about Michael's CV"}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-colors hover:bg-accent-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
    </div>
  );
}

/**
 * True once the bubble has earned the right to appear.
 *
 * Split out because the two triggers have to be torn down together: whichever
 * fires first, the other must stop listening, or a dismissed bubble can be
 * re-armed by a later scroll.
 */
function useNudgeTrigger(dismissed: boolean): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (dismissed || ready) return;

    const timer = window.setTimeout(() => setReady(true), NUDGE_DELAY_MS);
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.8) setReady(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [dismissed, ready]);

  return ready;
}
