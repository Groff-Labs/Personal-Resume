/**
 * The chat feature's client-side kill switch.
 *
 * Worth its own file because this is the control that decides whether a
 * feature is published, and it failed open. `showChat` was
 * `(env ?? "") !== ""`, so every value a person would reach for to mean "off"
 * meant "on": `CHAT_ENABLED=0` shipped the chat.
 *
 * The comment above it claimed the convention was "empty value disables",
 * which is not reachable either — the GitHub API refuses an empty variable
 * value with `422 Variable value cannot be empty`, so the only way to clear
 * one is to delete it. Found Oct 2026 while disabling the assistant on dev,
 * which is why the dev variable is deleted rather than blanked.
 */
import { chatEnabled } from '../../frontend/lib/data/chat';

describe('chatEnabled', () => {
  it('is off when the variable is absent, which is how GitHub clears one', () => {
    expect(chatEnabled(undefined)).toBe(false);
    expect(chatEnabled('')).toBe(false);
    expect(chatEnabled('   ')).toBe(false);
  });

  it.each(['0', 'false', 'off', 'no', 'FALSE', 'Off', ' no '])(
    'is off for %j, the values a person means as off',
    (raw) => {
      expect({ raw, on: chatEnabled(raw) }).toEqual({ raw, on: false });
    },
  );

  it.each(['1', 'true', 'yes', 'on', 'enabled'])('is on for %j', (raw) => {
    expect({ raw, on: chatEnabled(raw) }).toEqual({ raw, on: true });
  });

  it('keeps the value prod actually uses enabled', () => {
    // Guards against a tightening of the rule turning the live feature off.
    expect(chatEnabled('1')).toBe(true);
  });
});
