// Availability signal shown in the Hero "open-to" pill.
//
// To change what recruiters see, flip ACTIVE_STATUS_ID to any id below.
// That's the only line you need to touch. Add your own preset by copying
// an entry — keep the three parts (lead / emphasis / tail) so the bolded
// token renders, and pick a `tone` for the color + ping behavior.
//
//   available  emerald + pulsing dot  -> "I'm actively looking, come find me"
//   open       cyan (brand) + pulse   -> passively open, conversations welcome
//   settled    muted, no pulse        -> not looking; honest, low-key

export type StatusTone = "available" | "open" | "settled";

export interface HeroStatus {
  id: string;
  tone: StatusTone;
  /** Text before the emphasized token. */
  lead: string;
  /** Bolded token (usually a company or the offer). Optional. */
  emphasis?: string;
  /** Text after the emphasized token. Optional. */
  tail?: string;
}

export const heroStatuses: HeroStatus[] = [
  {
    id: "open-to-roles",
    tone: "available",
    lead: "",
    emphasis: "Open to new roles",
    tail: " — AWS architecture & platform work.",
  },
  {
    id: "open-conversations",
    tone: "open",
    lead: "Happy at ",
    emphasis: "AllCloud",
    tail: "; interesting conversations welcome.",
  },
  {
    id: "open-consulting",
    tone: "open",
    lead: "Open to ",
    emphasis: "AWS consulting & advisory",
    tail: " engagements.",
  },
  {
    id: "settled",
    tone: "settled",
    lead: "Heads-down at ",
    emphasis: "AllCloud",
    tail: " — not currently looking.",
  },
];

/** The single knob: change this to switch what the Hero pill shows. */
export const ACTIVE_STATUS_ID = "open-to-roles";

export const activeHeroStatus: HeroStatus =
  heroStatuses.find((s) => s.id === ACTIVE_STATUS_ID) ?? heroStatuses[0];
