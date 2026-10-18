import {
  ApplyGuardrailCommand,
  BedrockRuntimeClient,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({});

const GUARDRAIL_ID = process.env.GUARDRAIL_ID!;
const GUARDRAIL_VERSION = process.env.GUARDRAIL_VERSION!;

export interface GuardrailOutcome {
  blocked: boolean;
  /** Bedrock's own blockedInputMessaging / blockedOutputsMessaging. */
  message?: string;
  /** Which policies fired, for structured logs. Never shown to the user. */
  policies: string[];
  contentUnits: number;
  topicUnits: number;
}

/**
 * Explicit guardrail evaluation.
 *
 * Why not inline `guardrailConfig` on Converse: AWS documents that with tool
 * use, an inline guardrail does NOT evaluate tool results, tool definitions, or
 * the model's own generated tool arguments. So it would give *incomplete*
 * coverage while re-scanning the system prompt and the whole growing history on
 * every hop of the agent loop — up to 8 chargeable evaluations per user turn
 * instead of 2, at ~4x the cost, for strictly worse protection.
 *
 * Applying it here instead means we know exactly what is scanned, and the input
 * check runs *before* any model tokens are spent, so abusive traffic costs one
 * text unit and nothing else.
 *
 * The trade-off, recorded honestly: the guardrail is not structurally
 * unskippable. The IAM pattern that makes it so (Deny bedrock:InvokeModel
 * unless bedrock:GuardrailIdentifier matches) requires inline guardrailConfig
 * on every call, which is the cost we're avoiding. Mitigated by there being a
 * single code path through this Lambda, plus a test asserting it is called.
 */
export async function applyGuardrail(
  text: string,
  source: 'INPUT' | 'OUTPUT',
): Promise<GuardrailOutcome> {
  if (!text.trim()) {
    return { blocked: false, policies: [], contentUnits: 0, topicUnits: 0 };
  }

  const res = await client.send(
    new ApplyGuardrailCommand({
      guardrailIdentifier: GUARDRAIL_ID,
      guardrailVersion: GUARDRAIL_VERSION,
      source,
      content: [{ text: { text } }],
    }),
  );

  const policies: string[] = [];
  for (const a of res.assessments ?? []) {
    for (const f of a.contentPolicy?.filters ?? []) {
      if (f.action === 'BLOCKED') policies.push(`content:${f.type}`);
    }
    for (const t of a.topicPolicy?.topics ?? []) {
      if (t.action === 'BLOCKED') policies.push(`topic:${t.name}`);
    }
    for (const w of a.wordPolicy?.customWords ?? []) {
      if (w.action === 'BLOCKED') policies.push('word:custom');
    }
    for (const w of a.wordPolicy?.managedWordLists ?? []) {
      if (w.action === 'BLOCKED') policies.push(`word:${w.type}`);
    }
    for (const p of a.sensitiveInformationPolicy?.piiEntities ?? []) {
      if (p.action === 'BLOCKED') policies.push(`pii:${p.type}`);
    }
  }

  return {
    blocked: res.action === 'GUARDRAIL_INTERVENED',
    // Bedrock returns the configured blocked messaging in `outputs`.
    message: res.outputs?.[0]?.text,
    policies,
    // Not `res.usage ?? {}` — that widens to `{}` and loses the field types.
    contentUnits: res.usage?.contentPolicyUnits ?? 0,
    topicUnits: res.usage?.topicPolicyUnits ?? 0,
  };
}
