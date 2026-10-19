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
];

/** Keys map to lucide components in AboutMe.tsx. Keep them in step. */
export type StrengthIcon = "library" | "flame" | "waves" | "bookOpen" | "sun";

export interface Strength {
  name: string;
  /** Hex, used for the card's top border and icon tint. */
  color: string;
  icon: StrengthIcon;
  /** One sentence, adapted from Gallup's published CliftonStrengths themes. */
  summary: string;
}

export const strengths: Strength[] = [
  {
    name: "Input",
    color: "#2563eb",
    icon: "library",
    summary:
      "A need to collect and archive; information, ideas, artifacts, even relationships.",
  },
  {
    name: "Achiever",
    color: "#0891b2",
    icon: "flame",
    summary:
      "Work hard with great stamina; immense satisfaction from being busy and productive.",
  },
  {
    name: "Adaptability",
    color: "#0d9488",
    icon: "waves",
    summary:
      "Prefer to go with the flow; take things as they come and discover the future one day at a time.",
  },
  {
    name: "Learner",
    color: "#7c3aed",
    icon: "bookOpen",
    summary:
      "Continuous desire to learn and improve; the process excites more than the outcome.",
  },
  {
    name: "Positivity",
    color: "#ea580c",
    icon: "sun",
    summary: "Contagious enthusiasm; naturally upbeat, energizes others.",
  },
];
