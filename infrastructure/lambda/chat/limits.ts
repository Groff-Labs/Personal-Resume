import { createHmac } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = process.env.COUNTERS_TABLE!;
const IP_SALT = process.env.IP_HASH_SALT ?? 'unsalted';

const BURST_PER_MIN = Number(process.env.IP_BURST_PER_MINUTE ?? '3');
const TURNS_PER_HOUR = Number(process.env.IP_TURNS_PER_HOUR ?? '8');
const JD_PER_DAY = Number(process.env.IP_JD_PER_DAY ?? '3');
const DAILY_USD_CAP = Number(process.env.DAILY_USD_CAP ?? '0.10');

/**
 * Pseudonymise the viewer IP. This is not anonymisation and shouldn't be sold
 * as such — it's a keyed hash, so the salt plus an IP still reproduces the key.
 * The real privacy property is the TTL: counters evaporate within hours, and a
 * raw IP is never written to the table or to logs. The site has no privacy
 * policy, so storing raw addresses would be the wrong default.
 */
export function hashIp(ip: string): string {
  return createHmac('sha256', IP_SALT).update(ip).digest('hex').slice(0, 16);
}

const utc = () => new Date();
const dayKey = (d = utc()) => d.toISOString().slice(0, 10);
const hourKey = (d = utc()) => d.toISOString().slice(0, 13).replace(/[-T]/g, '');
const minuteKey = (d = utc()) => Math.floor(d.getTime() / 60000);
const nowSec = () => Math.floor(Date.now() / 1000);

export type LimitVerdict =
  | { ok: true }
  | { ok: false; code: 'rate_limited'; retryAfter: number }
  | { ok: false; code: 'budget_exhausted' };

/**
 * One conditional UpdateItem per limit, no read-then-write, so the ceiling
 * cannot be raced by concurrent requests. A ConditionalCheckFailedException
 * *is* the rejection — it means the counter was already at the cap.
 */
async function bumpWithCeiling(
  pk: string,
  attr: string,
  ceiling: number,
  ttlSeconds: number,
): Promise<boolean> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { pk },
        UpdateExpression: `SET expiresAt = if_not_exists(expiresAt, :exp) ADD #c :one`,
        ConditionExpression: `attribute_not_exists(#c) OR #c < :max`,
        ExpressionAttributeNames: { '#c': attr },
        ExpressionAttributeValues: {
          ':one': 1,
          ':max': ceiling,
          ':exp': nowSec() + ttlSeconds,
        },
      }),
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return false;
    throw err;
  }
}

/** Called before any model tokens are spent. */
export async function checkLimits(ipHash: string): Promise<LimitVerdict> {
  // Global budget first: it's a single eventually-consistent read, and if the
  // day's budget is gone there's no point charging the per-IP counters.
  const budget = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { pk: `budget#${dayKey()}` },
      ProjectionExpression: 'microUsd',
    }),
  );
  const spentMicroUsd = Number(budget.Item?.microUsd ?? 0);
  if (spentMicroUsd >= DAILY_USD_CAP * 1_000_000) {
    return { ok: false, code: 'budget_exhausted' };
  }

  const burstOk = await bumpWithCeiling(
    `ip#${ipHash}#m#${minuteKey()}`,
    'turns',
    BURST_PER_MIN,
    300,
  );
  if (!burstOk) return { ok: false, code: 'rate_limited', retryAfter: 60 };

  const hourOk = await bumpWithCeiling(
    `ip#${ipHash}#h#${hourKey()}`,
    'turns',
    TURNS_PER_HOUR,
    7200,
  );
  if (!hourOk) return { ok: false, code: 'rate_limited', retryAfter: 900 };

  return { ok: true };
}

/**
 * The JD matcher gets its own, tighter daily allowance: a pasted job
 * description is the largest input the endpoint accepts and therefore the
 * cheapest way for someone to burn the budget.
 */
export async function checkJdLimit(ipHash: string): Promise<boolean> {
  return bumpWithCeiling(`jd#${ipHash}#${dayKey()}`, 'matches', JD_PER_DAY, 172800);
}

/**
 * Record spend after the fact.
 *
 * The pre-flight check is eventually consistent and runs before the spend, so
 * it can overshoot. The bound on the overshoot is concurrency, which is why the
 * function sets `reservedConcurrentExecutions` — at 5 in-flight turns the
 * worst case is a fraction of a cent.
 */
export async function recordSpend(microUsd: number): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `budget#${dayKey()}` },
      UpdateExpression:
        'SET expiresAt = if_not_exists(expiresAt, :exp) ADD microUsd :cost, turns :one',
      ExpressionAttributeValues: {
        ':cost': Math.max(0, Math.round(microUsd)),
        ':one': 1,
        ':exp': nowSec() + 259200,
      },
    }),
  );
}

/* ------------------------------------------------------------------ *
 * Pricing
 * ------------------------------------------------------------------ */

/**
 * us-east-1, pulled 2026-10-16. These drift, and the daily cap is only as
 * correct as they are, so reconcile against Cost Explorer periodically.
 *
 * Guardrails genuinely cost more than the model here: content filters and
 * denied topics are $0.15 per 1,000 text units each, versus Nova Lite at
 * $0.06/1M input tokens. That is why the guardrail is applied explicitly twice
 * per turn rather than inline on every Converse hop.
 */
export const PRICES = {
  novaLiteInputPerMillion: 0.06,
  novaLiteOutputPerMillion: 0.24,
  guardrailContentPerThousandUnits: 0.15,
  guardrailTopicPerThousandUnits: 0.15,
} as const;

export function estimateMicroUsd(args: {
  inputTokens: number;
  outputTokens: number;
  guardrailContentUnits: number;
  guardrailTopicUnits: number;
}): number {
  const usd =
    (args.inputTokens / 1_000_000) * PRICES.novaLiteInputPerMillion +
    (args.outputTokens / 1_000_000) * PRICES.novaLiteOutputPerMillion +
    (args.guardrailContentUnits / 1000) * PRICES.guardrailContentPerThousandUnits +
    (args.guardrailTopicUnits / 1000) * PRICES.guardrailTopicPerThousandUnits;
  return usd * 1_000_000;
}
