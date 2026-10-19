"use client";

/**
 * Open/closed state for the chat widget, shared across the layout boundary.
 *
 * Three things open the panel and they do not share a React tree:
 * `ChatWidget` is mounted in `app/layout.tsx` (so the launcher survives on
 * every route), while the teaser section lives in `app/page.tsx`. A context
 * provider would mean wrapping the layout and threading a client boundary
 * around the whole tree for one boolean.
 *
 * So this is a module-level store read through `useSyncExternalStore`, which is
 * the React-sanctioned way to subscribe to state that lives outside React. No
 * provider, no new dependency, and the panel can be opened from anywhere by
 * importing `openChatPanel`.
 *
 * The nudge's dismissal is also here, because it is the same kind of
 * cross-component fact and because opening the panel must dismiss it.
 */
import { useSyncExternalStore } from "react";
import { trackChat } from "./trackChat";

const NUDGE_KEY = "cv-chat-nudge-dismissed";

let open = false;
let nudgeDismissed = false;

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Reads once, lazily, and tolerates a throw.
 *
 * localStorage is unavailable in a private window with site data blocked, and
 * the accessor itself can throw rather than returning null. A nudge that fails
 * to read its own dismissal should show again, which is the harmless direction.
 */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(NUDGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function openChatPanel() {
  // Opening is itself an answer to the nudge, so it never appears again.
  dismissNudge();
  if (open) return;
  open = true;
  // Fired here rather than in each caller, so the launcher, the inline band
  // and the nudge are all counted once and cannot drift apart. Guarded by the
  // `if (open) return` above, so reopening an open panel is not double-counted.
  trackChat("Chat: opened");
  emit();
}

export function closeChatPanel() {
  if (!open) return;
  open = false;
  emit();
}

export function dismissNudge() {
  if (nudgeDismissed) return;
  nudgeDismissed = true;
  try {
    window.localStorage.setItem(NUDGE_KEY, "1");
  } catch {
    // Non-fatal: the nudge simply reappears on the next visit.
  }
  emit();
}

/** Called once on mount to pick up a dismissal from a previous visit. */
export function hydrateNudge() {
  if (nudgeDismissed) return;
  if (readDismissed()) {
    nudgeDismissed = true;
    emit();
  }
}

export function useChatPanelOpen(): boolean {
  // Server snapshot is `false`: the panel is never open in the static export,
  // which is also what we want for the first paint.
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

export function useNudgeDismissed(): boolean {
  // Server snapshot is `true` so the bubble is absent from the exported HTML
  // and can only appear after hydration decides it should. Rendering it in the
  // static markup would flash it to everyone, including people who dismissed
  // it on a previous visit.
  return useSyncExternalStore(
    subscribe,
    () => nudgeDismissed,
    () => true,
  );
}
