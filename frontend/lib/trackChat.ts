/**
 * Chat usage events for Plausible.
 *
 * Added Oct 2026 because the honest answer to "can we see chat usage" was no.
 * Plausible was reporting pageviews and the chat fired nothing, so there was no
 * way to tell whether anyone opened the widget, let alone asked anything. That
 * matters beyond curiosity: the December decision on whether to buy semantic
 * search needs an engagement rate, and CloudWatch can only see turns that
 * reached the Lambda, never the visitor who opened the panel and closed it.
 *
 * Why Plausible rather than anything new: the script is already loaded, already
 * proxied first-party through CloudFront (so ad blockers do not eat it), and
 * cookieless. A second analytics dependency would cost bundle size on a site
 * that scores 97-99 on PageSpeed for a signal this small.
 *
 * Event names only, never content. No question text, no answer text, no
 * identifiers. `props` carries the error code or the tool count, which are
 * bounded enumerations rather than anything a visitor typed.
 */

type ChatEventName =
  | "Chat: opened"
  | "Chat: question asked"
  | "Chat: answered"
  | "Chat: error";

interface PlausibleFn {
  (event: string, opts?: { props?: Record<string, string | number | boolean> }): void;
}

/**
 * Fires an event if Plausible is present, and does nothing if it is not.
 *
 * Deliberately silent on every failure path. Analytics must never be able to
 * break the feature it measures: the tag is absent whenever
 * PLAUSIBLE_SRC is unset (every local build, and any fork that has not
 * configured it), and a blocker can remove the function after load.
 */
export function trackChat(
  event: ChatEventName,
  props?: Record<string, string | number | boolean>,
): void {
  try {
    const p = (window as unknown as { plausible?: PlausibleFn }).plausible;
    if (typeof p !== "function") return;
    p(event, props ? { props } : undefined);
  } catch {
    // Never surface an analytics failure to the visitor.
  }
}
