// Build-time WebP generator. Walks frontend/public/images/ and writes a
// .webp sibling for every .jpg/.jpeg/.png, skipping files whose .webp
// already exists and is newer than the source. Next.js static export
// can't optimize images on request (images.unoptimized: true is required
// for `output: 'export'`), so the pipeline handles it here instead.
//
// Hooked into the `prebuild` npm script, so every `npm run build` keeps
// the WebP derivatives in lockstep with the source raster files. Run
// manually via `npm run images`.
//
// Not converted:
// - og-image.png  (social-card scrapers don't all handle WebP)
// - favicon-*.png (browser chrome; small already, touched rarely)
// - legacy/ and blog/ archives (preserved byte-for-byte from WP mirrors)

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(HERE, "../public/images");

// Map raster extensions → webp. SVGs stay SVG.
const CONVERT_EXT = new Set([".jpg", ".jpeg", ".png"]);

// Exempt from both resize-to-800 and WebP conversion. These assets need
// their original resolution preserved (lightbox scales them up).
const EXCLUDE_SUBSTRINGS = [
  "diagrams/cv_infra_diagram",
];

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}

const started = Date.now();
let converted = 0;
let skipped = 0;
let savings = 0;

// Collect sources once so we can detect collisions (e.g. foo.jpg and
// foo.jpeg both generating foo.webp, where filesystem order decides the
// winner non-deterministically). Bail loudly instead of shipping the
// wrong image silently.
const sources = [];
for await (const p of walk(IMAGES_DIR)) {
  if (CONVERT_EXT.has(path.extname(p).toLowerCase())) sources.push(p);
}
sources.sort();
const stems = new Map();
for (const s of sources) {
  const stem = s.slice(0, -path.extname(s).length);
  if (stems.has(stem)) {
    const other = stems.get(stem);
    throw new Error(
      `WebP output collision: ${path.relative(IMAGES_DIR, s)} and ${path.relative(IMAGES_DIR, other)} would both write ${stem}.webp. Delete or rename one.`,
    );
  }
  stems.set(stem, s);
}

for (const src of sources) {
  const ext = path.extname(src).toLowerCase();

  const rel = path.relative(IMAGES_DIR, src);
  if (EXCLUDE_SUBSTRINGS.some((s) => rel.includes(s))) {
    skipped++;
    continue;
  }

  const dest = src.slice(0, -ext.length) + ".webp";
  const srcStat = await fs.stat(src);

  let destStat = null;
  try {
    destStat = await fs.stat(dest);
  } catch {
    // dest missing, will create
  }

  if (destStat && destStat.mtimeMs >= srcStat.mtimeMs) {
    skipped++;
    continue;
  }

  // Cap the longest side at 800 px. No image on the site renders larger
  // than ~1024 physical pixels (the Education hero banner) and most max
  // out at 300–400 px. 800 covers 2x retina for any 400 px display slot.
  // withoutEnlargement leaves small source images alone.
  //
  // Quality 82 is the practical sweet spot for photographic content;
  // effort 4 balances compression vs. encode time (effort 6 shaves a
  // few % more bytes but doubles the CPU).
  await sharp(src)
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(dest);

  const destSize = (await fs.stat(dest)).size;

  // For simple graphics (logos, line-art diagrams), PNG often beats WebP.
  // If the generated .webp is larger than the source, discard it — the
  // component keeps referencing the original extension.
  if (destSize >= srcStat.size) {
    await fs.unlink(dest);
    const srcKb = (srcStat.size / 1024).toFixed(0);
    const destKb = (destSize / 1024).toFixed(0);
    console.log(`  ${rel}  skipped (webp ${destKb} KB ≥ src ${srcKb} KB)`);
    skipped++;
    continue;
  }

  const srcKb = (srcStat.size / 1024).toFixed(0);
  const destKb = (destSize / 1024).toFixed(0);
  const pct = Math.round(((srcStat.size - destSize) / srcStat.size) * 100);
  console.log(`  ${rel}  ${srcKb} KB → ${destKb} KB  (-${pct}%)`);
  savings += srcStat.size - destSize;
  converted++;
}

const elapsed = Date.now() - started;
console.log(
  `✓ ${converted} converted, ${skipped} up-to-date — saved ${(savings / 1024).toFixed(0)} KB in ${elapsed} ms`,
);
