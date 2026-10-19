// The "About this site" section: the WordPress-to-Next.js comparison, the design
// trade-offs, and the architecture description.
//
// Extracted from ProjectShowcase.tsx in Oct 2026 for the same reason as
// `about.ts`: it was hardcoded in a React component, and the chat assistant
// reads data modules rather than components, so none of it was reachable. That
// made "how is this site built" and "why no WAF" unanswerable, which is the
// worst possible gap in a section whose purpose is demonstrating the work.
//
// The trade-offs are the valuable part. Anyone can list services; stating what
// was given up and why is the thing worth being able to answer.
//
// Pure TypeScript, no React, no lucide, no `@/` aliases, so esbuild inlines it.

export interface ComparisonRow {
  aspect: string;
  /** The 2015 WordPress install. */
  wp: string;
  /** This site. */
  aws: string;
}

/*
 * The summary and the archive note each render with an inline <code> span, so
 * they are stored as parts and composed two ways: the component assembles the
 * JSX, and the `summary` / `archiveNote` exports below concatenate the same
 * parts into the plain text the corpus indexes. Derived rather than restated,
 * so the two cannot drift, and the monospace styling survives.
 */
export const summaryParts = {
  lead: "The previous version of this site was a 2015-era WordPress install on The7 theme. This rewrite is its opposite: no server, no plugins, no database. Infrastructure is code. Deploys are a ",
  code: "git push",
  tail: ".",
} as const;

export const summary =
  summaryParts.lead + summaryParts.code + summaryParts.tail;

export const comparison: ComparisonRow[] = [
  {
    aspect: "Monthly cost",
    wp: "BlueHost unlimited plan (shared across ~30 sites)",
    aws: "Pennies per month (this site alone; actual numbers pending a few weeks of traffic)",
  },
  { aspect: "First-load time", wp: "3 to 4 s", aws: "< 1 s" },
  {
    aspect: "Security posture",
    wp: "Theme + plugin patch treadmill",
    aws: "Zero server; signed OAC; managed TLS",
  },
  {
    aspect: "Update workflow",
    wp: "FTP or wp-admin clickops",
    aws: "git push; Actions handles the rest",
  },
  { aspect: "Infra definition", wp: "None (clickops)", aws: "AWS CDK in TypeScript" },
];

export const tradeoffs: string[] = [
  "CloudFlare for DNS instead of Route 53; keeps this project single-account and lets me skip cross-account delegation. Trade-off: ACM validation needs a manual CNAME.",
  "No WAF; saves ~$5/mo and a portfolio site doesn't warrant managed-rules cost.",
  "OAC, not OAI; AWS's 2023+ recommended pattern for signed S3-origin access.",
  "Static export, not SSR; zero servers and no per-request logic. Fits a resume, not a SaaS.",
];

/**
 * Doubles as the diagram's alt text and as a searchable description of the
 * request path, which is why it reads as prose rather than a label.
 */
export const architecture =
  "Architecture diagram: Git push to GitHub triggers GitHub Actions, which assumes an IAM OIDC role to deploy infrastructure (CloudFront, ACM, OAC, S3) via CDK and sync site content to S3. Site visitors reach the site via CloudFlare (CNAME) → CloudFront (TLS via ACM) → OAC → S3.";

export const archiveNoteParts = {
  lead: "The original site is preserved as a read-only static snapshot at ",
  code: "/legacy/",
  tail: " for posterity; same domain, same bucket, no WordPress runtime involved.",
} as const;

export const archiveNote =
  archiveNoteParts.lead + archiveNoteParts.code + archiveNoteParts.tail;

export const sourceUrl = "https://github.com/Groff-Labs/Personal-Resume";
