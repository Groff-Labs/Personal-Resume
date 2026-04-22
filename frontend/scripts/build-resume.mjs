// Regenerate frontend/public/resume.pdf from the canonical resume.md source
// at the repo root. Invoked automatically as the `prebuild` npm hook so every
// `next build` (local and CI) ships a fresh PDF; also available as
// `npm run resume` for local iteration.

import { mdToPdf } from "md-to-pdf";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(REPO_ROOT, "resume.md");
const DEST = path.resolve(__dirname, "../public/resume.pdf");

// Inline print stylesheet. Matches the site's visual language (cyan-600
// accents, JetBrains Mono for dates, Inter-ish sans) but uses system fonts
// so no network fetch is needed at print time.
const css = `
  /* Reset — we pass stylesheet:[] to skip md-to-pdf's default markdown.css
     so there are no surprise paddings/margins fighting ours. */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: Letter; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.32;
    color: #111827;
    padding: 0.4in 0.55in;
  }
  h1 {
    font-size: 19pt;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin: 0;
  }
  h1 + p {
    margin: 0 0 8pt;
    color: #374151;
    font-size: 9pt;
  }
  h2 {
    font-size: 9pt;
    font-weight: 700;
    color: #0891b2;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 0.75pt solid #d1d5db;
    padding-bottom: 2pt;
    margin: 10pt 0 5pt;
  }
  h3 {
    font-size: 10pt;
    font-weight: 700;
    margin: 6pt 0 0;
    color: #111827;
  }
  h3 + p {
    margin: 0 0 2pt;
    color: #6b7280;
    font-size: 8.5pt;
  }
  h3 + p em {
    font-style: normal;
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    letter-spacing: -0.01em;
  }
  p { margin: 0 0 5pt; }
  ul { margin: 1pt 0 0; padding-left: 12pt; }
  li { margin-bottom: 1.5pt; }
  li::marker { color: #0891b2; }
  hr { border: 0; border-top: 0.75pt solid #e5e7eb; margin: 7pt 0 3pt; }
  strong { color: #111827; }
  a { color: #0891b2; text-decoration: none; }
  code {
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 8.25pt;
    color: #374151;
  }
  h3 { break-after: avoid-page; }
  li { break-inside: avoid-page; }
  /* Skills block becomes two columns in print — last UL in document */
  body > ul:last-of-type { column-count: 2; column-gap: 18pt; }
  body > ul:last-of-type li { break-inside: avoid-column; }
`;

const started = Date.now();
const pdf = await mdToPdf(
  { path: SRC },
  {
    dest: DEST,
    // Sets the <title> tag, which Chromium embeds as the PDF's
    // document-title metadata. Without this, the PDF title defaults to
    // the source URL (e.g. "localhost:44657/resume.md#") which is ugly
    // in browser tab titles and PDF viewers.
    document_title: "Michael Groff — Résumé",
    stylesheet: [], // skip md-to-pdf's default markdown.css
    stylesheet_encoding: "utf-8",
    css,
    pdf_options: {
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    },
    launch_options: {
      // Honor env-supplied Chrome binary (CI runners have it preinstalled),
      // otherwise fall back to the Chromium that puppeteer downloaded.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
);

if (!pdf) throw new Error("mdToPdf returned no result");

const { size } = await fs.stat(DEST);
console.log(
  `✓ Built ${path.relative(REPO_ROOT, DEST)} — ${(size / 1024).toFixed(1)} KB in ${
    Date.now() - started
  } ms`,
);
