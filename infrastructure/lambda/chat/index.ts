import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
} from '@aws-sdk/client-bedrock-runtime';

import { type Citation } from './corpus';
import { applyGuardrail } from './guardrail';
import { checkJdLimit, checkLimits, estimateMicroUsd, hashIp, recordSpend } from './limits';
import { systemPrompt } from './prompt';
import { MAX_JD_CHARS, converseTools, runTool } from './tools';
import { encodeEvent, type ChatEvent, type ChatRequest, type ChatRequestMessage } from './types';

const bedrock = new BedrockRuntimeClient({});

const MODEL_ID = process.env.MODEL_ID!;
const MAX_HOPS = 4;
const MAX_HISTORY_TURNS = 6;
const MAX_USER_CHARS = 500;
const MAX_BODY_BYTES = 16 * 1024;

const FALLBACK_BLOCKED =
  "I can only answer questions about Michael's CV. For anything else, email him directly.";

/** awslambda is injected by the runtime for RESPONSE_STREAM functions. */
declare const awslambda: {
  streamifyResponse(
    fn: (event: LambdaUrlEvent, stream: ResponseStream) => Promise<void>,
  ): unknown;
  HttpResponseStream: {
    from(stream: ResponseStream, meta: { statusCode: number; headers: Record<string, string> }): ResponseStream;
  };
};

interface ResponseStream {
  write(chunk: Uint8Array | string): void;
  end(): void;
}

interface LambdaUrlEvent {
  requestContext?: { http?: { method?: string } };
  headers?: Record<string, string | undefined>;
  body?: string;
  isBase64Encoded?: boolean;
}

/* ------------------------------------------------------------------ *
 * Request parsing
 * ------------------------------------------------------------------ */

/**
 * All HTTP-shape handling lives here. If the Function URL + OAC route ever has
 * to be swapped for API Gateway (the documented fallback), this and the
 * responder are the only places that change.
 */
function parseRequest(event: LambdaUrlEvent):
  | { ok: true; req: ChatRequest; ip: string }
  | { ok: false; message: string } {
  if ((event.requestContext?.http?.method ?? 'POST').toUpperCase() !== 'POST') {
    return { ok: false, message: 'Method not allowed.' };
  }

  const raw = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : (event.body ?? '');

  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return { ok: false, message: 'Request too large.' };
  }

  // CloudFront generates CloudFront-Viewer-Address itself and overwrites any
  // viewer-supplied value, so it cannot be spoofed. Value is "ip:port"; split
  // on the LAST colon so IPv6 survives. X-Forwarded-For is the fallback, and we
  // take the LAST entry because CloudFront appends the real viewer IP — a
  // viewer who sends their own XFF only pollutes the earlier entries.
  const headers = event.headers ?? {};
  const viewerAddress = headers['cloudfront-viewer-address'] ?? headers['CloudFront-Viewer-Address'];
  let ip = '';
  if (viewerAddress) {
    ip = viewerAddress.slice(0, viewerAddress.lastIndexOf(':')) || viewerAddress;
  } else {
    const xff = headers['x-forwarded-for'] ?? headers['X-Forwarded-For'];
    if (xff) ip = xff.split(',').pop()!.trim();
  }
  // No IP means no rate limiting, and an unlimited path is worse than no feature.
  if (!ip) return { ok: false, message: 'Could not determine client address.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'Body must be JSON.' };
  }

  const body = parsed as Partial<ChatRequest>;
  if (typeof body.conversationId !== 'string' || !Array.isArray(body.messages)) {
    return { ok: false, message: 'Expected { conversationId, messages }.' };
  }

  const messages: ChatRequestMessage[] = body.messages
    .filter((m): m is ChatRequestMessage =>
      !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_USER_CHARS) }))
    .slice(-(MAX_HISTORY_TURNS * 2));

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return { ok: false, message: 'Last message must be from the user.' };
  }

  return {
    ok: true,
    ip,
    req: {
      conversationId: body.conversationId.slice(0, 64),
      messages,
      jobDescription:
        typeof body.jobDescription === 'string'
          ? body.jobDescription.slice(0, MAX_JD_CHARS)
          : undefined,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */

async function handle(event: LambdaUrlEvent, stream: ResponseStream): Promise<void> {
  const send = (e: ChatEvent) => stream.write(encodeEvent(e));
  const log = (fields: Record<string, unknown>) =>
    console.log(JSON.stringify({ at: 'chat', ...fields }));

  const parsed = parseRequest(event);
  if (!parsed.ok) {
    send({ type: 'error', code: 'bad_request', message: parsed.message });
    stream.end();
    return;
  }

  const { req, ip } = parsed;
  const ipHash = hashIp(ip);

  // Rate limit and budget before anything is spent.
  const verdict = await checkLimits(ipHash);
  if (!verdict.ok) {
    log({ outcome: verdict.code, ipHash });
    send(
      verdict.code === 'rate_limited'
        ? {
            type: 'error',
            code: 'rate_limited',
            message:
              'A few too many questions from your network just now. Try again in a minute.',
            retryAfter: verdict.retryAfter,
          }
        : {
            type: 'error',
            code: 'budget_exhausted',
            message:
              'This assistant has hit its daily budget — it runs on a hobby allowance. The full resume is at /resume.pdf.',
          },
    );
    stream.end();
    return;
  }

  const userText = req.messages[req.messages.length - 1].content;

  let jobDescription = req.jobDescription;
  if (jobDescription && jobDescription.trim().length >= 40) {
    // The JD is the biggest input the endpoint takes, so it gets its own cap.
    if (!(await checkJdLimit(ipHash))) {
      jobDescription = undefined;
      send({
        type: 'status',
        message: "Job-description matching is limited per day; answering from the CV instead.",
      });
    }
  }

  let guardrailContentUnits = 0;
  let guardrailTopicUnits = 0;

  send({ type: 'status', message: 'Checking your question' });

  const inputCheck = await applyGuardrail(
    jobDescription ? `${userText}\n\n${jobDescription}` : userText,
    'INPUT',
  );
  guardrailContentUnits += inputCheck.contentUnits;
  guardrailTopicUnits += inputCheck.topicUnits;

  if (inputCheck.blocked) {
    log({ outcome: 'guardrail_blocked', source: 'INPUT', policies: inputCheck.policies });
    send({
      type: 'error',
      code: 'guardrail_blocked',
      message: inputCheck.message ?? FALLBACK_BLOCKED,
    });
    // Charged one text unit, zero model tokens.
    await recordSpend(
      estimateMicroUsd({
        inputTokens: 0,
        outputTokens: 0,
        guardrailContentUnits,
        guardrailTopicUnits,
      }),
    );
    send({ type: 'done', hops: 0, usage: { inputTokens: 0, outputTokens: 0, microUsd: 0 } });
    stream.end();
    return;
  }

  /* ---------------- the agent loop ---------------- */

  const messages: Message[] = req.messages.map((m) => ({
    role: m.role,
    content: [{ text: m.content }],
  }));

  const toolConfig = { tools: converseTools };
  const citations: Citation[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let answer = '';
  let hops = 0;

  for (hops = 1; hops <= MAX_HOPS; hops++) {
    const res = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: systemPrompt() }],
        messages,
        // On the final allowed hop drop the tools, forcing prose instead of
        // another tool request we have no budget to service.
        ...(hops < MAX_HOPS ? { toolConfig } : {}),
        inferenceConfig: { maxTokens: 500, temperature: 0.2, topP: 0.9 },
      }),
    );

    inputTokens += res.usage?.inputTokens ?? 0;
    outputTokens += res.usage?.outputTokens ?? 0;

    const blocks = res.output?.message?.content ?? [];
    for (const b of blocks) {
      if (b.text) answer += b.text;
    }

    if (res.stopReason !== 'tool_use') break;

    messages.push({ role: 'assistant', content: blocks });

    const toolResults: ContentBlock[] = [];
    for (const b of blocks) {
      if (!b.toolUse) continue;
      const name = b.toolUse.name ?? '';
      const input = (b.toolUse.input ?? {}) as Record<string, unknown>;

      send({ type: 'tool_call', id: b.toolUse.toolUseId!, name, input });

      const started = Date.now();
      const result = runTool(name, input, { jobDescription });
      const ms = Date.now() - started;

      for (const c of result.citations) {
        if (!citations.some((x) => x.anchor === c.anchor)) citations.push(c);
      }

      send({
        type: 'tool_result',
        id: b.toolUse.toolUseId!,
        name,
        summary: result.summary,
        citations: result.citations,
        ms,
      });

      toolResults.push({
        toolResult: {
          toolUseId: b.toolUse.toolUseId!,
          content: [{ json: result.data }],
        },
      });
    }

    if (toolResults.length === 0) break;
    messages.push({ role: 'user', content: toolResults });
    answer = '';
  }

  /* ---------------- output guardrail ---------------- */

  const outputCheck = await applyGuardrail(answer, 'OUTPUT');
  guardrailContentUnits += outputCheck.contentUnits;
  guardrailTopicUnits += outputCheck.topicUnits;

  if (outputCheck.blocked) {
    log({ outcome: 'guardrail_blocked', source: 'OUTPUT', policies: outputCheck.policies });
    answer = outputCheck.message ?? FALLBACK_BLOCKED;
    citations.length = 0;
  }

  send({ type: 'delta', text: answer });
  if (citations.length > 0) send({ type: 'citations', citations });

  const microUsd = estimateMicroUsd({
    inputTokens,
    outputTokens,
    guardrailContentUnits,
    guardrailTopicUnits,
  });
  await recordSpend(microUsd);

  log({
    outcome: 'ok',
    hops,
    inputTokens,
    outputTokens,
    microUsd: Math.round(microUsd),
    toolsUsed: citations.map((c) => c.anchor),
  });

  send({ type: 'done', hops, usage: { inputTokens, outputTokens, microUsd } });
  stream.end();
}

export const handler = awslambda.streamifyResponse(
  async (event: LambdaUrlEvent, stream: ResponseStream) => {
    const wrapped = awslambda.HttpResponseStream.from(stream, {
      statusCode: 200,
      headers: {
        // NDJSON, and never a 403/404: `errorResponses` on the distribution is
        // distribution-wide and would rewrite those to the site's /404.html.
        'content-type': 'application/x-ndjson',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });

    try {
      await handle(event, wrapped);
    } catch (err) {
      console.error(
        JSON.stringify({
          at: 'chat',
          outcome: 'internal_error',
          error: (err as Error).message,
          name: (err as Error).name,
        }),
      );
      // Generic copy: never leak an AWS error code or stack to a public page.
      wrapped.write(
        encodeEvent({
          type: 'error',
          code: 'internal',
          message: 'Something went wrong on my side. The full resume is at /resume.pdf.',
        }),
      );
      wrapped.end();
    }
  },
);
