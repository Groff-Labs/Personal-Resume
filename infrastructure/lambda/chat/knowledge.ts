/**
 * The knowledge corpus: markdown under `knowledge/` that the assistant can
 * search but the site does not render.
 *
 * Imports are explicit rather than globbed. esbuild has no glob import, and the
 * alternatives were a codegen step (which this design deliberately avoids) or a
 * plugin. One line per file is self-documenting and the failure mode is
 * obvious: forget the line and the file simply isn't searched.
 *
 * ADDING A FILE: add an import and an entry below. Editing an existing file
 * needs no change here — esbuild inlines the content and the asset hash shifts,
 * so `cdk deploy` ships it.
 */
import overview from '../../../knowledge/00-overview.md';
import highlights from '../../../knowledge/10-highlights.md';
import engagements from '../../../knowledge/20-engagements.md';
import technicalDepth from '../../../knowledge/30-technical-depth.md';
import leadership from '../../../knowledge/40-leadership.md';
import careerNarrative from '../../../knowledge/50-career-narrative.md';
import recruiterFaq from '../../../knowledge/60-recruiter-faq.md';
import outreach from '../../../knowledge/70-outreach.md';

export interface KnowledgeDoc {
  id: string;
  /** Shown as provenance on a retrieved passage. */
  label: string;
  /** Which page section a claim from this doc should cite. */
  anchor: string;
  content: string;
}

export const knowledgeDocs: KnowledgeDoc[] = [
  { id: 'overview', label: 'Overview', anchor: '#about', content: overview },
  { id: 'highlights', label: 'Highlights', anchor: '#experience', content: highlights },
  { id: 'engagements', label: 'Engagements', anchor: '#experience', content: engagements },
  { id: 'technical', label: 'Technical depth', anchor: '#skills', content: technicalDepth },
  { id: 'leadership', label: 'Leadership', anchor: '#experience', content: leadership },
  { id: 'career', label: 'Career narrative', anchor: '#experience', content: careerNarrative },
  { id: 'faq', label: 'Recruiter FAQ', anchor: '#contact', content: recruiterFaq },
  { id: 'outreach', label: 'Outreach', anchor: '#about', content: outreach },
];

/** The curated highlights list, in file order, for the get_highlights tool. */
export function highlightSections(): Array<{ title: string; body: string }> {
  return splitSections(highlights)
    .filter((s) => s.heading && s.depth === 2)
    .map((s) => ({ title: s.heading, body: s.body }));
}

export interface Section {
  heading: string;
  depth: number;
  body: string;
}

/**
 * Split markdown on `##` / `###` headings.
 *
 * Deliberately strips anything inside an HTML comment first, so the `<!-- TODO -->`
 * markers that stand in for unwritten sections never reach the model. An
 * unwritten section becomes an empty body and is dropped, which is the correct
 * failure: the assistant finds nothing and says so, rather than reading an
 * instruction to its author as if it were a fact about him.
 */
export function splitSections(md: string): Section[] {
  const cleaned = md.replace(/<!--[\s\S]*?-->/g, '');
  const out: Section[] = [];
  let heading = '';
  let depth = 0;
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join(' ').replace(/\s+/g, ' ').trim();
    if (heading && body) out.push({ heading, depth, body });
    buf = [];
  };

  for (const raw of cleaned.split('\n')) {
    const line = raw.trim();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      depth = h[1].length;
      heading = h[2].replace(/[*_`]/g, '').trim();
      continue;
    }
    if (!line || line === '---' || /^\|/.test(line)) continue;
    buf.push(
      line
        .replace(/^[-*]\s+/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`/g, ''),
    );
  }
  flush();
  return out;
}

/**
 * Long sections are windowed at sentence boundaries. A passage that straddles
 * two topics matches neither well, and an over-long one wastes input tokens on
 * every turn it is retrieved.
 */
export function windowed(text: string, maxChars = 700): string[] {
  if (text.length <= maxChars) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && (cur + ' ' + s).length > maxChars) {
      out.push(cur);
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) out.push(cur);
  return out;
}
