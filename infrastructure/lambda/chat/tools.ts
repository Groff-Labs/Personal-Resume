import type { Tool } from '@aws-sdk/client-bedrock-runtime';
import type { DocumentType } from '@smithy/types';
import { highlightSections } from './knowledge';
import {
  ANCHORS,
  MIN_COVERAGE,
  isBroadQuery,
  type Citation,
  certifications,
  contact,
  employerIds,
  strengths,
  findJob,
  inventory,
  rolesOf,
  searchPassages,
  skillGroups,
  activeHeroStatus,
  tokenize,
} from './corpus';

export const MAX_JD_CHARS = 6000;

export interface ToolResult {
  /**
   * Returned to the model. Typed as the SDK's recursive DocumentType because
   * that is what Converse's `toolResult.content[].json` accepts — `unknown` or
   * `Record<string, unknown>` both fail to assign.
   */
  data: DocumentType;
  /** Rendered as chips in the UI and required by the system prompt. */
  citations: Citation[];
  /** One line for the UI's tool trace. */
  summary: string;
}

/* ------------------------------------------------------------------ *
 * Schemas
 * ------------------------------------------------------------------ */

export const toolSpecs = [
  {
    name: 'get_highlights',
    description:
      "His most significant professional accomplishments, curated and ordered. USE THIS FIRST for broad or opening questions about his CAREER -- 'what has he done', 'what has he shipped', 'tell me about his experience', 'why should we hire him', 'is he any good' -- where keyword search cannot rank results because every passage mentions AWS. It returns career achievements ONLY: it knows nothing about him personally, nothing about this website, and nothing about any specific technology. For anything specific, including personal details, use search_experience instead. Never answer from this tool a question it does not cover.",
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 8, description: 'Default 5.' },
        },
      },
    },
  },
  {
    name: 'get_role',
    description:
      "Look up one employer from the CV: tenure, location, every title held there, and the responsibility bullets for each. Use for 'what did he do at X'.",
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          company: {
            type: 'string',
            enum: employerIds,
            description: 'Employer id from the CV.',
          },
        },
        required: ['company'],
      },
    },
  },
  {
    name: 'search_experience',
    description:
      "Keyword search across EVERYTHING on the site: responsibility bullets, skill groups, resume lines, the engagement write-ups, the About section (his hometown, where he lives, his pets, his interests, his Gallup CliftonStrengths) and how this website itself is built, including its architecture and design trade-offs. This is the default tool for any specific question. Use it whenever the question names a technology, a metric, an activity, a personal detail or this site. Returns ranked snippets with their source, or a note saying the CV does not cover it -- which is the answer, not a reason to guess.",
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords, not a sentence.' },
          limit: { type: 'integer', minimum: 1, maximum: 6 },
        },
        required: ['query'],
      },
    },
  },
  {
    name: 'list_certifications',
    description:
      'List certifications. Filter by vendor substring or by kind. proctored = exam-based, partner = partner-program accreditation, training = completion badge.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          vendor: { type: 'string' },
          kind: { type: 'string', enum: ['proctored', 'partner', 'training', 'other'] },
        },
      },
    },
  },
  {
    name: 'get_skills',
    description:
      'Read the skills matrix. With no arguments returns the categories and their summaries. With `item` answers whether one specific technology appears on the CV, and where.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          item: { type: 'string', description: 'A single technology, e.g. Terraform.' },
        },
      },
    },
  },
  {
    name: 'get_strengths',
    description:
      "His Gallup CliftonStrengths, complete and in rank order: the signature five and themes six through ten, each with a one-line summary. Use this for ANY question about his strengths, personality, working style or CliftonStrengths, including asking about one theme by name. Keyword search cannot answer this: the eleven strengths passages all score alike, so a search returns an arbitrary four of them and no complete list.",
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          top: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'How many to return, in rank order. Default 5, the signature five.',
          },
        },
      },
    },
  },
  {
    name: 'match_job_description',
    description:
      'Compare the job description the user pasted against the CV. The comparison is computed by code, not inferred: it returns exact matched terms with their evidence, the requirements with no match, and a coverage count. Call once, only when a job description was supplied.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          acknowledge: {
            type: 'string',
            description: "Always the literal string 'pasted'. The text is supplied out-of-band.",
          },
        },
        required: ['acknowledge'],
      },
    },
  },
  {
    name: 'get_availability_and_contact',
    description:
      'Current availability signal plus how to reach him. Use to close a conversation, and whenever the answer is not in the CV.',
    inputSchema: { json: { type: 'object', properties: {} } },
  },
] as const;

export type ToolName = (typeof toolSpecs)[number]['name'];

/**
 * Converse wants every entry wrapped: `{ toolSpec: { name, description,
 * inputSchema } }`, not the bare spec. Getting this wrong fails at runtime with
 *   "The value at toolConfig.tools.0 must set one of the following keys:
 *    toolSpec, systemTool, modelTool or cachePoint"
 * and an `as unknown as Tool[]` cast at the call site will happily hide it, so
 * the wrapping and the typing live together here instead.
 */
export const converseTools: Tool[] = toolSpecs.map((spec) => ({
  toolSpec: {
    name: spec.name,
    description: spec.description,
    inputSchema: { json: spec.inputSchema.json as DocumentType },
  },
}));

/* ------------------------------------------------------------------ *
 * Implementations
 * ------------------------------------------------------------------ */

function getHighlights(input: Record<string, unknown>): ToolResult {
  const raw = Number(input.limit ?? 5);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 8) : 5;
  const items = highlightSections().slice(0, limit);

  return {
    data: {
      note:
        'Curated and ordered, most significant first. Report these; do not rank or editorialise. ' +
        'SCOPE: these are highlights, not a career summary, and not exhaustive. All but the last are ' +
        'from AllCloud (May 2024 onward) and twelve-plus years precede them. Each entry states its own ' +
        'timeframe -- carry that into the answer, and say plainly that this is a selection.',
      count: items.length,
      highlights: items.map((h) => ({ headline: h.title, detail: h.body })),
    },
    citations: [{ anchor: ANCHORS.experience, label: 'Experience' }],
    summary: `${items.length} curated highlights`,
  };
}

function getRole(input: Record<string, unknown>): ToolResult {
  const company = String(input.company ?? '');
  const job = findJob(company);

  if (!job) {
    return {
      data: { found: false, note: `No employer matching "${company}" on the CV.`, employerIds },
      citations: [],
      summary: `no match for "${company}"`,
    };
  }

  const roles = rolesOf(job);
  return {
    data: {
      found: true,
      company: job.company,
      location: job.location,
      tenure: `${job.startDate} - ${job.endDate}`,
      roles: roles.map((r) => ({
        title: r.title,
        dates: `${r.startDate} - ${r.endDate}`,
        responsibilities: r.responsibilities,
      })),
    },
    citations: [{ anchor: ANCHORS.experience, label: `Experience -> ${job.company}` }],
    summary: `${job.company}: ${roles.length} title${roles.length === 1 ? '' : 's'}`,
  };
}

function searchExperience(input: Record<string, unknown>): ToolResult {
  const query = String(input.query ?? '');
  const rawLimit = Number(input.limit ?? 4);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 6) : 4;

  // A question with no distinctive term cannot be ranked by keyword search.
  // Say so and point at the curated list rather than returning a grab-bag.
  if (isBroadQuery(query)) {
    return {
      data: {
        matches: [],
        tooBroad: true,
        note: `"${query}" has no distinctive search term -- every passage mentions AWS. Call get_highlights instead.`,
      },
      citations: [],
      summary: `too broad: "${query}"`,
    };
  }

  const hits = searchPassages(query, limit);

  if (hits.length === 0) {
    return {
      data: { matches: [], note: `Nothing on the CV matches "${query}".` },
      citations: [],
      summary: `0 matches for "${query}"`,
    };
  }

  // One rare-but-incidental word can rescue an otherwise broad query and
  // produce a confident non-answer. Flag it rather than pretending.
  if (hits[0].coverage < MIN_COVERAGE) {
    return {
      data: {
        matches: hits.map((h) => ({ text: h.text, source: h.source })),
        lowConfidence: true,
        note: 'Weak keyword match; these may not answer the question. Call get_highlights as well, and say plainly if the CV does not cover it.',
      },
      citations: [],
      summary: `weak match for "${query}"`,
    };
  }

  const citations: Citation[] = [];
  for (const h of hits) {
    if (!citations.some((c) => c.anchor === h.anchor)) {
      citations.push({ anchor: h.anchor, label: h.source.split(' -> ')[0] });
    }
  }

  return {
    data: { matches: hits.map((h) => ({ text: h.text, source: h.source })) },
    citations,
    summary: `${hits.length} match${hits.length === 1 ? '' : 'es'} for "${query}"`,
  };
}

function listCertifications(input: Record<string, unknown>): ToolResult {
  const vendor = input.vendor ? String(input.vendor).toLowerCase() : undefined;
  const kind = input.kind ? String(input.kind) : undefined;

  let list = certifications;
  if (vendor) list = list.filter((c) => c.vendor.toLowerCase().includes(vendor));
  if (kind) list = list.filter((c) => c.type === kind);

  return {
    data: {
      count: list.length,
      certifications: list.map((c) => ({
        name: c.name,
        vendor: c.vendor,
        kind: c.type,
        // Earn year only. CLAUDE.md: deliberately no status or expiry labels.
        earned: c.issueDate.slice(0, 4),
      })),
    },
    citations: [{ anchor: ANCHORS.certifications, label: 'Certifications' }],
    summary: `${list.length} cert${list.length === 1 ? '' : 's'}${kind ? ` (${kind})` : ''}`,
  };
}

function getSkills(input: Record<string, unknown>): ToolResult {
  const item = input.item ? String(input.item).toLowerCase().trim() : undefined;
  const category = input.category ? String(input.category).toLowerCase() : undefined;

  if (item) {
    const hits = skillGroups
      .filter((g) => g.items.some((i) => i.toLowerCase().includes(item)))
      .map((g) => ({
        category: g.category,
        matched: g.items.filter((i) => i.toLowerCase().includes(item)),
      }));

    return {
      data:
        hits.length > 0
          ? { present: true, item, found: hits }
          : { present: false, item, note: `"${item}" does not appear in the skills matrix.` },
      citations: hits.length > 0 ? [{ anchor: ANCHORS.skills, label: 'Skills' }] : [],
      summary: hits.length > 0 ? `"${item}" found in ${hits.length}` : `"${item}" not listed`,
    };
  }

  const groups = category
    ? skillGroups.filter((g) => g.category.toLowerCase().includes(category))
    : skillGroups;

  return {
    data: {
      categories: groups.map((g) => ({
        category: g.category,
        summary: g.summary,
        items: g.items,
      })),
    },
    citations: [{ anchor: ANCHORS.skills, label: 'Skills' }],
    summary: `${groups.length} skill group${groups.length === 1 ? '' : 's'}`,
  };
}

/**
 * The JD matcher.
 *
 * The job description is NOT a tool argument — it arrives in the HTTP body and
 * is closed over here. Three reasons: model-generated arguments would cost
 * output tokens for 6 KB of text, the model could paraphrase or truncate it,
 * and inline guardrails do not evaluate tool arguments (so routing user text
 * through them would skip the input check).
 *
 * The matching itself is deterministic. The model narrates the result; it
 * cannot add a skill Michael doesn't have.
 */
/**
 * Complete and ordered, which is why it is a tool rather than a search.
 *
 * Found on dev, Oct 2026: asked for his top ten, the assistant answered
 * "Positivity, Input, Learner, and Achiever" -- four themes, out of order, six
 * missing. The eleven strengths passages all score coverage 1.00 with raw
 * scores within 4% of each other, so `search_experience` returned an arbitrary
 * four, and the one passage that does list all ten ranked last because the
 * length divisor penalises it. Relevance ranking cannot answer "list all of X";
 * that is what `list_certifications` and `get_skills` already exist for.
 */
function getStrengths(input: Record<string, unknown>): ToolResult {
  const rawTop = Number(input.top ?? 5);
  const top = Number.isFinite(rawTop) ? Math.min(Math.max(Math.trunc(rawTop), 1), 10) : 5;
  const picked = strengths.filter((st) => st.rank <= top);

  return {
    data: {
      assessment: 'Gallup CliftonStrengths',
      returned: picked.length,
      ofTotalAssessed: 34,
      // Stated rather than implied: "signature" means the top five, and six
      // through ten is a weaker claim that should not be reported as one.
      note:
        top > 5
          ? 'Ranks 1 to 5 are his signature themes; 6 to 10 are the rest of his top ten.'
          : 'These are his signature five themes.',
      strengths: picked.map((st) => ({
        rank: st.rank,
        name: st.name,
        band: st.rank <= 5 ? 'signature five' : 'top ten',
        summary: st.summary,
      })),
    },
    citations: [{ anchor: ANCHORS.about, label: 'About' }],
    summary: `${picked.length} strengths in rank order`,
  };
}

function matchJobDescription(jobDescription: string | undefined): ToolResult {
  if (!jobDescription || jobDescription.trim().length < 40) {
    return {
      data: {
        matched: [],
        missing: [],
        note: 'No job description was supplied. Ask the user to paste one into the job-description box.',
      },
      citations: [],
      summary: 'no job description supplied',
    };
  }

  const jd = jobDescription.slice(0, MAX_JD_CHARS).toLowerCase();
  const jdTokens = new Set(tokenize(jd));

  const matched: Array<{ term: string; evidence: string; anchor: string }> = [];
  for (const entry of inventory) {
    // Multi-word terms match as substrings; single words must match a whole
    // token so "go" doesn't match "governance".
    const hit = entry.term.includes(' ')
      ? jd.includes(entry.term)
      : jdTokens.has(entry.term);

    if (hit && !matched.some((m) => m.term === entry.display)) {
      matched.push({ term: entry.display, evidence: entry.source, anchor: entry.anchor });
    }
  }

  // Requirement-shaped lines with no inventory hit, so gaps are explicit rather
  // than silently omitted.
  const missing = jobDescription
    .slice(0, MAX_JD_CHARS)
    .split('\n')
    .map((l) => l.replace(/^[\s•*\-–]+/, '').trim())
    .filter((l) => l.length > 25 && l.length < 180)
    .filter((l) => {
      const lt = new Set(tokenize(l));
      return !matched.some((m) => {
        const mt = tokenize(m.term);
        return mt.length > 0 && mt.every((t) => lt.has(t));
      });
    })
    .slice(0, 8);

  const citations: Citation[] = [];
  for (const m of matched) {
    if (!citations.some((c) => c.anchor === m.anchor)) {
      citations.push({ anchor: m.anchor as Citation['anchor'], label: m.evidence.split(' -> ')[0] });
    }
  }

  return {
    data: {
      note: 'Computed by code against the CV data, not inferred. Report these verbatim; do not add terms.',
      matchedCount: matched.length,
      matched: matched.slice(0, 25),
      unmatchedRequirements: missing,
    },
    citations,
    summary: `${matched.length} matched, ${missing.length} unmatched`,
  };
}

function getAvailabilityAndContact(): ToolResult {
  const status = [activeHeroStatus.lead, activeHeroStatus.emphasis, activeHeroStatus.tail]
    .filter(Boolean)
    .join('')
    .trim();

  return {
    data: {
      availability: status,
      tone: activeHeroStatus.tone,
      email: contact.email,
      phone: contact.phone,
      linkedIn: contact.linkedIn,
      resumePdf: contact.resumePdf,
    },
    citations: [{ anchor: ANCHORS.contact, label: 'Contact' }],
    summary: 'availability + contact',
  };
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

export function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: { jobDescription?: string },
): ToolResult {
  switch (name) {
    case 'get_highlights':
      return getHighlights(input);
    case 'get_role':
      return getRole(input);
    case 'search_experience':
      return searchExperience(input);
    case 'list_certifications':
      return listCertifications(input);
    case 'get_skills':
      return getSkills(input);
    case 'get_strengths':
      return getStrengths(input);
    case 'match_job_description':
      return matchJobDescription(ctx.jobDescription);
    case 'get_availability_and_contact':
      return getAvailabilityAndContact();
    default:
      return {
        data: { error: `Unknown tool "${name}".` },
        citations: [],
        summary: `unknown tool ${name}`,
      };
  }
}
