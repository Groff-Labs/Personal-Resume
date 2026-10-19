// The About section's "Off the clock" facts and the Top 5 CliftonStrengths.
//
// The bio paragraphs are deliberately NOT here. They are already in the corpus
// via knowledge/00-overview.md, so moving them would add a second copy of text
// the assistant can already read. Only these two lists were missing.
//
// Extracted from AboutMe.tsx in Oct 2026 for one reason: it was hardcoded in the
// component, and `infrastructure/lambda/chat/corpus.ts` reads data modules, not
// React. So every word of it was invisible to the chat assistant. Asked "does
// Michael like dogs" it answered that the CV does not mention dogs, while the
// page three sections up said "two Huskies". The strengths were invisible too,
// which matters more: "what are his strengths" is a question a recruiter asks.
//
// Same rule as `jobs.ts` and `skills.ts`: pure TypeScript, no React, no lucide,
// no `@/` aliases, so esbuild can inline it into the Lambda bundle. Icons are
// named here as strings and mapped to components in AboutMe.tsx.

/** Keys map to lucide components in AboutMe.tsx. Keep them in step. */
export type AboutIcon = "user" | "users" | "sparkles" | "briefcase" | "target";

export interface AboutFact {
  label: string;
  icon: AboutIcon;
  /**
   * Whether the chat assistant may see this.
   *
   * The page renders every fact; the corpus indexes only `true`. The split is
   * deliberate and was an explicit decision, not an oversight: a visitor who
   * scrolls to the About section chooses to read it, whereas an assistant that
   * will volunteer a man's children to anyone who types a question is a
   * different kind of exposure. Pets, hometown, location and the tech-enthusiast
   * line are in. The wife's profession and the daughters are not.
   *
   * `prompt.ts` rule 10 independently refuses family-status questions, so this
   * is the second of two layers rather than the only one.
   */
  inCorpus: boolean;
}

export const offTheClock: AboutFact[] = [
  { icon: "user", label: "Native Texan from Bandera, TX", inCorpus: true },
  { icon: "users", label: "Married to a Texas public school teacher", inCorpus: false },
  { icon: "users", label: "Father of two daughters", inCorpus: false },
  {
    icon: "sparkles",
    label: "Fur-father of four; two Huskies, one standard-issue tabby, and one black cat",
    inCorpus: true,
  },
  { icon: "briefcase", label: "Based in San Antonio, TX", inCorpus: true },
  { icon: "target", label: "Avid tech enthusiast", inCorpus: true },
  // No school or district named, on purpose: a small rural district plus a
  // date would identify a family member. knowledge/70-outreach.md has the
  // longer version under the same constraint.
  {
    icon: "users",
    label: "Speaks at elementary school career days about what cloud engineers do",
    inCorpus: true,
  },
];

/** Keys map to lucide components in AboutMe.tsx. Keep them in step. */
export type StrengthIcon = "library" | "flame" | "waves" | "bookOpen" | "sun";

export interface Strength {
  name: string;
  /** 1-based rank from the assessment. The order is the whole point. */
  rank: number;
  /** Hex, used for the card's top border and icon tint. */
  color: string;
  icon: StrengthIcon;
  /**
   * One sentence, written here rather than taken from Gallup.
   *
   * Gallup's own theme descriptions ("People who are especially talented in
   * the Input theme have a craving to know more...") are the same copyrighted
   * boilerplate in every report, stamped "Copyright (c) 2000, 2006-2012
   * Gallup, Inc. All rights reserved." in the signature-themes PDF on this
   * site. Theme names and his rank order are facts about him; that prose is
   * not ours to republish, and the chat assistant quotes the corpus verbatim
   * to anyone. These are original, and deliberately say how the theme shows up
   * in his work, which is more use to a reader than the generic definition.
   */
  summary: string;
}

export const strengths: Strength[] = [
  {
    name: "Input",
    rank: 1,
    color: "#2563eb",
    icon: "library",
    summary:
      "A need to collect and archive; information, ideas, artifacts, even relationships.",
  },
  {
    name: "Achiever",
    rank: 2,
    color: "#0891b2",
    icon: "flame",
    summary:
      "Work hard with great stamina; immense satisfaction from being busy and productive.",
  },
  {
    name: "Adaptability",
    rank: 3,
    color: "#0d9488",
    icon: "waves",
    summary:
      "Prefer to go with the flow; take things as they come and discover the future one day at a time.",
  },
  {
    name: "Learner",
    rank: 4,
    color: "#7c3aed",
    icon: "bookOpen",
    summary:
      "Continuous desire to learn and improve; the process excites more than the outcome.",
  },
  {
    name: "Positivity",
    rank: 5,
    color: "#ea580c",
    icon: "sun",
    summary: "Contagious enthusiasm; naturally upbeat, energizes others.",
  },
  /*
   * Themes 6 to 10. These do NOT render: the grid is five cards plus a callout,
   * and `AboutMe.tsx` slices the first five. They are here because the chat
   * assistant indexes the whole array, so "what are his strengths" can answer
   * beyond the signature five when someone asks.
   *
   * Colours and icons repeat from above and are unused. Kept required rather
   * than optional so the type does not grow holes for a presentational field,
   * and so showing ten later needs only a slice change.
   */
  {
    name: "Responsibility",
    rank: 6,
    color: "#2563eb",
    icon: "library",
    summary:
      "Treats a commitment as owned the moment it is made; the reason an estimate gets followed up rather than filed.",
  },
  {
    name: "Relator",
    rank: 7,
    color: "#0891b2",
    icon: "flame",
    summary:
      "Does his best work inside a few close working relationships rather than a broad network.",
  },
  {
    name: "Restorative",
    rank: 8,
    color: "#0d9488",
    icon: "waves",
    summary:
      "Drawn to diagnosing what is broken and fixing it, which is why a failing pipeline reads as interesting rather than annoying.",
  },
  {
    name: "Intellection",
    rank: 9,
    color: "#7c3aed",
    icon: "bookOpen",
    summary:
      "Thinks a problem through before and after the decision; prefers a reasoned argument to a quick consensus.",
  },
  {
    name: "Self-Assurance",
    rank: 10,
    color: "#ea580c",
    icon: "sun",
    summary:
      "Comfortable deciding under uncertainty and standing behind the call once made.",
  },
];

/** The five that render as cards. The rest are corpus-only. */
export const signatureStrengths: Strength[] = strengths.slice(0, 5);
