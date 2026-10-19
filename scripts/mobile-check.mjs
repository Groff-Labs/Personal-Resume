/**
 * Mobile layout invariants, checked in a real browser.
 *
 *   node scripts/mobile-check.mjs [base-url]
 *
 * These exist because six real defects survived 218 unit tests and 24 smoke
 * checks, and every one was invisible without measuring a rendered page:
 *
 *  1. The comparison table was 332px inside a 286px `overflow-hidden` card with
 *     no scrollable ancestor, so the "Next.js + AWS (new)" column was cut off
 *     and unreachable. Silent content loss.
 *  2. Company names were clipped mid-glyph at 320px: the timeline gutter leaves
 *     that column 82px and "Vivsoft Technologies" is one 104px word with
 *     nowhere to wrap. Also silent content loss, and the reason the clipping
 *     check below is not written against the table alone.
 *  3. An unqualified `whitespace-nowrap` made Experience dates overflow their
 *     container by up to 64px, because the class was written for the desktop
 *     grid column.
 *  4. The hamburger, theme toggle and resume download were 36x36, under the
 *     44px tap minimum, on a layout where the hamburger is the only way to
 *     navigate.
 *  5. The chat panel's send and close buttons were 36x36 and 24x24, which is
 *     why this script opens the panel rather than measuring the page at rest.
 *  6. The certification filter pills were 34px, the only way to filter 36
 *     certifications on a phone.
 *
 * Note what the clipping check looks for: content wider than an ancestor that
 * clips it, with nothing scrollable in between. That shape is the bug class,
 * not the single instance, which is how it covers both 1 and 2 and would cover
 * a third case nobody has written yet.
 *
 * ON THE DEPENDENCY, which is the honest caveat. This repo does NOT depend on
 * Playwright, and nothing installs it. The script therefore resolves it at
 * runtime and exits 0 with a skip when it is absent, the same way `check.sh`
 * skips the résumé checks without poppler, so it can never break a build.
 *
 * It tries `playwright-core` first and falls back to `playwright`.
 * `playwright-core` is a few megabytes and downloads no browsers, driving the
 * Chrome already installed on the machine, which is why it is preferred: a full
 * `playwright` install pulls hundreds of megabytes of browsers for three
 * layout assertions. To enable this locally or in CI:
 *
 *   npm i -D playwright-core      # then it uses your installed Chrome
 *
 * Until someone does, running it prints a skip and does nothing.
 */

/** Resolve a browser driver without making it a hard dependency. */
async function loadChromium() {
  for (const mod of ['playwright-core', 'playwright']) {
    try {
      const { chromium } = await import(mod);
      return { chromium, mod };
    } catch {
      // Not installed; try the next.
    }
  }
  return null;
}

const driver = await loadChromium();
if (!driver) {
  console.log(
    '\x1b[33mskip\x1b[0m  mobile layout checks: neither playwright-core nor ' +
      'playwright is installed.\n        Enable with: npm i -D playwright-core',
  );
  process.exit(0);
}
const { chromium } = driver;

const BASE = process.argv[2] ?? 'https://michaelgroff.info';
const WIDTHS = [320, 390];

/** Minimum tap target, Apple HIG and WCAG 2.5.5 Enhanced. */
const MIN_TAP = 44;

/**
 * Controls that must be reachable one-handed. Inline text links are exempt.
 *
 * The last two live inside the chat panel, which is closed on load, so the
 * panel is opened before measuring. They were 36x36 and 24x24 when this file
 * was written, found by opening the panel by hand at 390px after the nav
 * controls were already fixed, which is the argument for checking it here
 * rather than remembering to.
 */
const CRITICAL_CONTROLS = [
  'Toggle menu',
  'Download resume',
  'Ask the assistant about',
  'Theme',
  'Send question',
  'Close the assistant',
];

const failures = [];
const passes = [];
const pass = (m) => { passes.push(m); console.log(`  \x1b[32mok\x1b[0m    ${m}`); };
const fail = (m, d) => {
  failures.push(m);
  console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
  if (d) console.log(`        ${d}`);
};

/*
 * Measurement must not show up as traffic. This script runs against prod by
 * default and opens the chat panel, which would otherwise fire a real
 * `Chat: opened` event on every run -- and the chat funnel is the evidence the
 * S3 Vectors decision is waiting on, so synthetic opens would corrupt exactly
 * the number being collected. A no-op shim swallows the pageview too.
 */
const stubAnalytics = (page) =>
  page.addInitScript(() => {
    window.plausible = () => {};
  });

/*
 * `channel: 'chrome'` so playwright-core can drive the installed Chrome rather
 * than a bundled browser it does not have. Falls back to the default launch
 * for a full `playwright` install, which does bundle one.
 */
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
} catch {
  browser = await chromium.launch();
}

try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await stubAnalytics(page);
    await page.goto(BASE, { waitUntil: 'load' });
    // Let the in-view animations settle; content below the fold is only laid
    // out once framer-motion has run.
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 600));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 300));
    });
    // Open the chat panel so its own controls and layout are measured too. It
    // is the only interactive surface on the site, and it is a fixed-position
    // layer sharing the viewport edge with the nav controls.
    await page.evaluate(async () => {
      const launcher = document.querySelector('button[aria-label*="Ask the assistant"]');
      if (!launcher) return;
      launcher.click();
      await new Promise((r) => setTimeout(r, 500));
    });

    console.log(`\n\x1b[1m${width}px\x1b[0m`);

    const report = await page.evaluate(
      ({ minTap, controls }) => {
        const vw = window.innerWidth;

        /*
         * Is anything between `el` and the body a horizontal scroller? Used by
         * both checks below, for opposite reasons: content inside one is
         * allowed past the viewport edge, and content clipped above one is
         * still reachable.
         */
        const inScroller = (el) => {
          let node = el.parentElement;
          while (node && node !== document.body) {
            const ox = getComputedStyle(node).overflowX;
            if (ox === 'auto' || ox === 'scroll') return true;
            node = node.parentElement;
          }
          return false;
        };

        // 1. Nothing may extend past the viewport -- unless it sits inside a
        // horizontal scroller, where extending past the edge is the point.
        const offscreen = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1 && !inScroller(el)) {
            offscreen.push({
              section: el.closest('section')?.id ?? '(none)',
              tag: el.tagName.toLowerCase(),
              overBy: Math.round(r.right - vw),
              text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44),
            });
          }
        }

        // 2. Content clipped by an ancestor with nothing scrollable between.
        const clipped = [];
        for (const el of document.querySelectorAll('table, pre, img, [class*="grid"], div')) {
          if (el.scrollWidth <= el.clientWidth + 2 || el.clientWidth === 0) continue;
          let node = el;
          let scrollable = false;
          let clipper = null;
          while (node && node !== document.body) {
            const ox = getComputedStyle(node).overflowX;
            if (ox === 'auto' || ox === 'scroll') { scrollable = true; break; }
            if (ox === 'hidden' && !clipper) clipper = node;
            node = node.parentElement;
          }
          if (!scrollable && clipper) {
            clipped.push({
              section: el.closest('section')?.id ?? '(none)',
              tag: el.tagName.toLowerCase(),
              hiddenBy: Math.round(el.scrollWidth - el.clientWidth),
              text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44),
            });
          }
        }

        // 3. Critical controls must clear the tap minimum.
        const tooSmall = [];
        for (const el of document.querySelectorAll('a, button, [role="button"]')) {
          const label = el.getAttribute('aria-label') || '';
          if (!controls.some((c) => label.includes(c))) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.width < minTap || r.height < minTap) {
            tooSmall.push({ label, w: Math.round(r.width), h: Math.round(r.height) });
          }
        }

        return {
          horizontalScroll: document.documentElement.scrollWidth > vw,
          docScrollWidth: document.documentElement.scrollWidth,
          offscreen,
          clipped,
          tooSmall,
        };
      },
      { minTap: MIN_TAP, controls: CRITICAL_CONTROLS },
    );

    report.horizontalScroll
      ? fail(`${width}px: no horizontal page scroll`, `scrollWidth ${report.docScrollWidth}`)
      : pass(`${width}px: no horizontal page scroll`);

    report.offscreen.length === 0
      ? pass(`${width}px: nothing extends past the viewport`)
      : fail(
          `${width}px: nothing extends past the viewport`,
          report.offscreen
            .slice(0, 4)
            .map((o) => `#${o.section} <${o.tag}> +${o.overBy}px "${o.text}"`)
            .join('; '),
        );

    report.clipped.length === 0
      ? pass(`${width}px: no content clipped with no way to scroll to it`)
      : fail(
          `${width}px: no content clipped with no way to scroll to it`,
          report.clipped
            .slice(0, 4)
            .map((c) => `#${c.section} <${c.tag}> ${c.hiddenBy}px hidden "${c.text}"`)
            .join('; '),
        );

    report.tooSmall.length === 0
      ? pass(`${width}px: critical controls are at least ${MIN_TAP}px`)
      : fail(
          `${width}px: critical controls are at least ${MIN_TAP}px`,
          report.tooSmall.map((t) => `"${t.label}" ${t.w}x${t.h}`).join('; '),
        );

    await page.close();
  }

  // Desktop regression guard. Every fix above is mobile-scoped, so the risk is
  // having changed something at full width: the dates must stay on one line and
  // the table must not scroll.
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await stubAnalytics(desktop);
  await desktop.goto(BASE, { waitUntil: 'load' });
  await desktop.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 600));
  });
  console.log('\n\x1b[1m1280px (regression guard)\x1b[0m');

  const d = await desktop.evaluate(() => {
    const dates = [...document.querySelectorAll('#experience .font-mono')].filter((e) =>
      /\d{4}\s*[–-]\s*/.test(e.textContent || ''),
    );
    const table = document.querySelector('#project table');
    const wrapper = table?.parentElement;
    return {
      dateCount: dates.length,
      datesWrapped: dates.filter((e) => e.scrollWidth > e.clientWidth + 2).length,
      tableScrolls: wrapper ? wrapper.scrollWidth > wrapper.clientWidth + 2 : null,
    };
  });

  d.dateCount > 0
    ? pass(`found ${d.dateCount} experience date ranges`)
    : fail('found experience date ranges', 'selector matched nothing; the guard is not guarding');

  d.datesWrapped === 0
    ? pass('dates still fit on one line at 1280px')
    : fail('dates still fit on one line at 1280px', `${d.datesWrapped} overflow`);

  d.tableScrolls === false
    ? pass('comparison table needs no scrolling at 1280px')
    : fail('comparison table needs no scrolling at 1280px', `scrolls: ${d.tableScrolls}`);

  await desktop.close();
} finally {
  await browser.close();
}

console.log('\n\x1b[1m----------------------------------------\x1b[0m');
if (failures.length === 0) {
  console.log(`\x1b[32m${passes.length} mobile checks passed against ${BASE}\x1b[0m`);
  process.exit(0);
}
console.log(`\x1b[31m${passes.length} passed, ${failures.length} FAILED against ${BASE}:\x1b[0m`);
for (const f of failures) console.log(`  - ${f}`);
process.exit(1);
