/**
 * `limits.ts` had no tests at all, which is the wrong place for a coverage gap:
 * it holds the IP hashing, the rate limiter and the spend cap, so it is the
 * only thing standing between this feature and a surprise bill.
 *
 * The DynamoDB paths are not covered here (they would need a client mock, and
 * this project has no AWS SDK mocking dependency). What is covered is the pure
 * arithmetic and the hashing, which is where a silent error does the damage: a
 * wrong rate is invisible until the bill arrives, and the reconciliation
 * against a real bill only verified the constants, not the function that
 * multiplies them.
 */
import { PRICES, estimateMicroUsd, hashIp } from '../lambda/chat/limits';

describe('estimateMicroUsd', () => {
  it('reproduces a real logged turn to the cent-millionth', () => {
    /*
     * Taken from a prod log line on 18 Oct 2026: 4,653 in / 111 out, 2 hops.
     * Unit counts measured from live ApplyGuardrail calls: content 1 on INPUT
     * plus 1 on OUTPUT, topic 1 on INPUT and 0 on OUTPUT (denied topics are
     * input-only), PII 1 and 1.
     */
    const got = estimateMicroUsd({
      inputTokens: 4653,
      outputTokens: 111,
      guardrailContentUnits: 2,
      guardrailTopicUnits: 1,
      guardrailPiiUnits: 2,
    });
    expect(Math.round(got)).toBe(956);
  });

  it('is zero for a turn that spent nothing', () => {
    expect(
      estimateMicroUsd({
        inputTokens: 0,
        outputTokens: 0,
        guardrailContentUnits: 0,
        guardrailTopicUnits: 0,
        guardrailPiiUnits: 0,
      }),
    ).toBe(0);
  });

  it('charges a guardrail-blocked turn for units and no tokens', () => {
    // Input-first guardrailing means abusive traffic costs one text unit per
    // policy and zero model tokens. Verified in production as in=0 out=0.
    const blocked = estimateMicroUsd({
      inputTokens: 0,
      outputTokens: 0,
      guardrailContentUnits: 1,
      guardrailTopicUnits: 1,
      guardrailPiiUnits: 1,
    });
    // 0.15 + 0.15 + 0.10 per 1000 units = 0.40 microUSD per unit each.
    expect(Math.round(blocked)).toBe(400);
  });

  it('is linear in every term, so no term can be silently dropped', () => {
    /*
     * This is the regression guard that matters. The PII term was missing
     * entirely for weeks and nothing caught it, because every test used the
     * same shape. Doubling each input in turn and checking the delta proves
     * each one is actually wired to the result.
     */
    const base = {
      inputTokens: 1000,
      outputTokens: 1000,
      guardrailContentUnits: 1,
      guardrailTopicUnits: 1,
      guardrailPiiUnits: 1,
    };
    const baseline = estimateMicroUsd(base);

    for (const key of Object.keys(base) as Array<keyof typeof base>) {
      const doubled = estimateMicroUsd({ ...base, [key]: base[key] * 2 });
      expect({ key, moved: doubled > baseline }).toEqual({ key, moved: true });
    }
  });

  it('prices output tokens above input tokens', () => {
    const inputOnly = estimateMicroUsd({
      inputTokens: 1_000_000,
      outputTokens: 0,
      guardrailContentUnits: 0,
      guardrailTopicUnits: 0,
      guardrailPiiUnits: 0,
    });
    const outputOnly = estimateMicroUsd({
      inputTokens: 0,
      outputTokens: 1_000_000,
      guardrailContentUnits: 0,
      guardrailTopicUnits: 0,
      guardrailPiiUnits: 0,
    });
    expect(outputOnly).toBeGreaterThan(inputOnly);
    // 1M tokens at $0.06 and $0.24 => 60,000 and 240,000 microUSD.
    expect(Math.round(inputOnly)).toBe(60_000);
    expect(Math.round(outputOnly)).toBe(240_000);
  });

  it('says guardrails cost more than the model on a typical turn', () => {
    // The reason guardrails are applied twice per turn rather than per hop.
    // If this ever inverts, the two-call design is no longer the cheap option.
    const typical = { inputTokens: 4000, outputTokens: 120 };
    const modelOnly = estimateMicroUsd({
      ...typical,
      guardrailContentUnits: 0,
      guardrailTopicUnits: 0,
      guardrailPiiUnits: 0,
    });
    const guardrailOnly = estimateMicroUsd({
      inputTokens: 0,
      outputTokens: 0,
      guardrailContentUnits: 2,
      guardrailTopicUnits: 1,
      guardrailPiiUnits: 2,
    });
    expect(guardrailOnly).toBeGreaterThan(modelOnly);
  });
});

describe('PRICES', () => {
  it('matches the rates confirmed against a real Cost Explorer bill', () => {
    // Verified 19 Oct 2026 per SKU, not from the pricing page:
    //   NovaLite-input-tokens                              $0.06/1M
    //   NovaLite-output-tokens                             $0.24/1M
    //   Guardrail-ContentPolicyUnitsConsumed               $0.15/1K
    //   Guardrail-TopicPolicyUnitsConsumed                 $0.15/1K
    //   Guardrail-SensitiveInformationPolicyPaidUnits      $0.10/1K
    expect(PRICES).toEqual({
      novaLiteInputPerMillion: 0.06,
      novaLiteOutputPerMillion: 0.24,
      guardrailContentPerThousandUnits: 0.15,
      guardrailTopicPerThousandUnits: 0.15,
      guardrailPiiPerThousandUnits: 0.1,
    });
  });

  it('has no zero or negative rate', () => {
    // A zeroed rate would silently make the daily cap unreachable, which is
    // the failure mode with no symptom until the bill arrives.
    for (const [k, v] of Object.entries(PRICES)) {
      expect({ k, positive: v > 0 }).toEqual({ k, positive: true });
    }
  });
});

describe('hashIp', () => {
  const ip = '203.0.113.7';

  it('never returns anything containing the address', () => {
    // The whole point: raw visitor IPs are never stored. This site has no
    // privacy policy, so the hash is the control.
    const h = hashIp(ip);
    expect(h).not.toContain(ip);
    expect(h).not.toContain('203');
    expect(h).not.toContain('113');
  });

  it('is hex and fixed width, so a key cannot collide by truncation', () => {
    expect(hashIp(ip)).toMatch(/^[0-9a-f]{16}$/);
    expect(hashIp('2001:db8::1')).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is stable for the same address and different for others', () => {
    expect(hashIp(ip)).toBe(hashIp(ip));
    expect(hashIp(ip)).not.toBe(hashIp('203.0.113.8'));
    // IPv6 must not collapse into the same bucket as IPv4.
    expect(hashIp('2001:db8::1')).not.toBe(hashIp('2001:db8::2'));
  });

  it('handles an empty or malformed address without throwing', () => {
    // CloudFront always supplies cloudfront-viewer-address, but a malformed
    // one must not take the function down; it is parsed upstream.
    expect(() => hashIp('')).not.toThrow();
    expect(hashIp('')).toMatch(/^[0-9a-f]{16}$/);
    expect(() => hashIp('not an ip at all')).not.toThrow();
  });
});
