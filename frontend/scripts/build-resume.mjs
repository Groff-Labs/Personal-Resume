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
  @page { size: Letter; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.25pt;
    line-height: 1.42;
    color: #111827;
    padding: 0.55in 0.7in;
  }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin: 0 0 2pt;
  }
  h1 + p {
    margin: 0 0 14pt;
    color: #374151;
    font-size: 10pt;
  }
  h2 {
    font-size: 10pt;
    font-weight: 700;
    color: #0891b2;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    border-bottom: 1pt solid #d1d5db;
    padding-bottom: 3pt;
    margin: 18pt 0 8pt;
  }
  h3 {
    font-size: 11pt;
    font-weight: 700;
    margin: 10pt 0 1pt;
    color: #111827;
  }
  h3 + p {
    margin: 0 0 5pt;
    color: #6b7280;
    font-size: 9.25pt;
  }
  h3 + p em {
    font-style: normal;
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    letter-spacing: -0.01em;
  }
  p { margin: 0 0 8pt; }
  ul { margin: 2pt 0 0; padding-left: 14pt; }
  li { margin-bottom: 3pt; }
  li::marker { color: #0891b2; }
  hr { border: 0; border-top: 1pt solid #e5e7eb; margin: 14pt 0 6pt; }
  strong { color: #111827; }
  a { color: #0891b2; text-decoration: none; }
  code {
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 9pt;
    color: #374151;
  }
  h3 { break-after: avoid-page; }
  li { break-inside: avoid-page; }
`;

const started = Date.now();
const pdf = await mdToPdf(
  { path: SRC },
  {
    dest: DEST,
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
