import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CvWebsiteStack } from '../lib/cv-website-stack';

/**
 * Synth-time guards for the things that fail *silently* in this stack.
 *
 * These exist because the failure modes are invisible until production breaks:
 * an origin reordering strips OAC and the whole site becomes /404.html, and a
 * Lambda-backed custom resource is denied by an LZA SCP at deploy time rather
 * than at synth time.
 */
function synth(stage = 'dev', overrides: Record<string, string> = {}): Template {
  // Load the real cdk.json context. `new cdk.App()` in a unit test gets none of
  // the ~90 feature flags (the CLI passes them via CDK_CONTEXT_JSON), so without
  // this the test would synth a different stack than the one that deploys.
  const context = JSON.parse(
    readFileSync(join(__dirname, '..', 'cdk.json'), 'utf8'),
  ).context as Record<string, unknown>;

  const app = new cdk.App({ context });
  const stack = new CvWebsiteStack(app, `CvWebsite-${stage}`, {
    env: { account: '111111111111', region: 'us-east-1' },
    stage,
    domainName: stage === 'prod' ? 'example.com' : `${stage}.example.com`,
    resourcePrefix: 'test-prefix',
    ...overrides,
  });
  return Template.fromStack(stack);
}

describe('CvWebsiteStack', () => {
  const template = synth();

  it('keeps OriginAccessControl on the S3 origin regardless of origin order', () => {
    // The OAC used to be wired with
    //   addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', ...)
    // CDK orders Origins by bind order, so adding a third origin could shift the
    // bucket off index 0 and silently strip its OAC. This asserts by identity,
    // not by position.
    const dist = Object.values(
      template.findResources('AWS::CloudFront::Distribution'),
    )[0] as { Properties: { DistributionConfig: { Origins: Record<string, unknown>[] } } };

    const origins = dist.Properties.DistributionConfig.Origins;
    const s3Origin = origins.find((o) => 'S3OriginConfig' in o);

    expect(s3Origin).toBeDefined();
    expect(s3Origin!.OriginAccessControlId).toBeDefined();
  });

  it('creates no Lambda-backed custom resources', () => {
    // LZA's NetworkPerimeter-SCP DenyLambdaWithoutVPC blocks lambda:CreateFunction
    // when lambda:VpcIds is null, and this account has no VPC. Constructs like
    // autoDeleteObjects / BucketDeployment / logRetention fail at deploy, not synth.
    const customResources = Object.entries(template.toJSON().Resources as Record<
      string,
      { Type: string }
    >).filter(([, r]) => r.Type.startsWith('Custom::'));

    expect(customResources.map(([id]) => id)).toEqual([]);
  });

  it('grants the website bucket exactly one read path', () => {
    // Before the OAC migration this carried two Allow s3:GetObject statements:
    // a legacy OAI grant (Principal.CanonicalUser) that nothing used, plus the
    // OAC grant. Two read paths where one is needed is one too many.
    const policies = template.findResources('AWS::S3::BucketPolicy');
    const websitePolicy = Object.values(policies).find((p) =>
      JSON.stringify(p).includes('WebsiteBucket'),
    ) as { Properties: { PolicyDocument: { Statement: { Principal?: unknown }[] } } };

    const reads = websitePolicy.Properties.PolicyDocument.Statement.filter((s) =>
      JSON.stringify(s).includes('s3:GetObject'),
    );

    expect(reads).toHaveLength(1);
    expect(JSON.stringify(reads[0].Principal)).toContain('cloudfront.amazonaws.com');
    expect(JSON.stringify(reads[0].Principal)).not.toContain('CanonicalUser');
  });

  it('creates no legacy CloudFrontOriginAccessIdentity', () => {
    expect(
      Object.keys(template.findResources('AWS::CloudFront::CloudFrontOriginAccessIdentity')),
    ).toEqual([]);
  });

  it('preserves the existing OAC name so the resource is not replaced', () => {
    template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
      OriginAccessControlConfig: {
        Name: 'cv-website-oac-dev',
        OriginAccessControlOriginType: 's3',
        SigningBehavior: 'always',
        SigningProtocol: 'sigv4',
      },
    });
  });

  it('attaches the trailing-slash rewrite to the default behaviour only', () => {
    const dist = Object.values(
      template.findResources('AWS::CloudFront::Distribution'),
    )[0] as {
      Properties: {
        DistributionConfig: {
          DefaultCacheBehavior: Record<string, unknown>;
          CacheBehaviors?: Record<string, unknown>[];
        };
      };
    };
    const dc = dist.Properties.DistributionConfig;

    expect(dc.DefaultCacheBehavior.FunctionAssociations).toBeDefined();
    for (const b of dc.CacheBehaviors ?? []) {
      expect(b.FunctionAssociations).toBeUndefined();
    }
  });

  it('keeps the prod bucket on RETAIN', () => {
    const prod = synth('prod');
    const buckets = prod.findResources('AWS::S3::Bucket');
    const website = Object.entries(buckets).find(([id]) => id.startsWith('WebsiteBucket'));
    expect(website?.[1].DeletionPolicy).toBe('Retain');
  });
});

describe('ChatApi (chat enabled)', () => {
  const template = synth('dev', { chatModelId: 'amazon.nova-lite-v1:0' });

  it('names the function to match the SCP NotResource carve-out', () => {
    // network-perimeter.json exempts arn:aws:lambda:*:*:function:cv-chat-*
    // from DenyLambdaWithoutVPC. Rename this and the deploy is denied.
    const fns = Object.values(template.findResources('AWS::Lambda::Function')) as Array<{
      Properties: { FunctionName?: string; VpcConfig?: unknown };
    }>;
    expect(fns).toHaveLength(1);
    expect(fns[0].Properties.FunctionName).toMatch(/^cv-chat-/);
    // Must run OUTSIDE a VPC: that is the whole point of the carve-out.
    expect(fns[0].Properties.VpcConfig).toBeUndefined();
  });

  it('tags the table, log group and role with LZA:EXC:NET', () => {
    // The Root-attached RCP DenyResourceAccessFromUntrustedNetworks covers
    // dynamodb:* and logs:* and only exempts resources carrying this tag -- a
    // RESOURCE tag, so tagging the role alone is not enough. Without these the
    // first UpdateItem throws AccessDeniedException at runtime, not at deploy.
    //
    // They must also be present from the FIRST deploy: DenyUnauthorizedLZATagModification
    // denies dynamodb:TagResource / iam:TagRole for LZA:* keys, so adding the
    // tag in a later stack update would itself be denied.
    for (const type of ['AWS::DynamoDB::Table', 'AWS::Logs::LogGroup', 'AWS::IAM::Role']) {
      const resources = Object.entries(template.findResources(type));
      expect(resources.length).toBeGreaterThan(0);
      for (const [id, r] of resources) {
        const tags = ((r as { Properties: { Tags?: { Key: string; Value: string }[] } })
          .Properties.Tags ?? []);
        const found = tags.find((t) => t.Key === 'LZA:EXC:NET');
        expect(found?.Value).toBe('true');
        expect(id).toBeTruthy();
      }
    }
  });

  it('keeps the function URL unreachable without a CloudFront signature', () => {
    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'AWS_IAM',
      InvokeMode: 'RESPONSE_STREAM',
    });
  });

  it('forwards the viewer IP and the OAC payload hash, and nothing else', () => {
    const policies = Object.values(
      template.findResources('AWS::CloudFront::OriginRequestPolicy'),
    ) as Array<{ Properties: { OriginRequestPolicyConfig: Record<string, never> } }>;

    const chatPolicy = policies
      .map((p) => p.Properties.OriginRequestPolicyConfig as unknown as {
        Name: string;
        HeadersConfig: { Headers: string[] };
        CookiesConfig: { CookieBehavior: string };
      })
      .find((c) => c.Name.includes('chat'));

    expect(chatPolicy).toBeDefined();
    const headers = chatPolicy!.HeadersConfig.Headers.map((h) => h.toLowerCase());
    // The only client IP CloudFront will not let a viewer forge.
    expect(headers).toContain('cloudfront-viewer-address');
    // Authorization would collide with the OAC signature.
    expect(headers).not.toContain('authorization');
    // x-amz-content-sha256 must NOT be listed. CloudFront rejects it at deploy
    // time ("that is not allowed") because it manages the header itself when
    // signing to a Lambda OAC origin. The viewer still sends it; naming it here
    // fails the stack. This assertion exists because an earlier version did
    // name it and the deploy rolled back.
    expect(headers).not.toContain('x-amz-content-sha256');
    expect(chatPolicy!.CookiesConfig.CookieBehavior).toBe('none');
  });

  it('disables edge compression on the chat behaviour so streaming works', () => {
    const dist = Object.values(
      template.findResources('AWS::CloudFront::Distribution'),
    )[0] as { Properties: { DistributionConfig: { CacheBehaviors: Record<string, unknown>[] } } };

    const chat = dist.Properties.DistributionConfig.CacheBehaviors.find(
      (b) => b.PathPattern === '/api/chat',
    );
    expect(chat).toBeDefined();
    expect(chat!.Compress).toBe(false);
  });

  it('still keeps OAC on the S3 origin with a third origin present', () => {
    // This is the regression the Step 1 refactor was for: three origins now.
    const dist = Object.values(
      template.findResources('AWS::CloudFront::Distribution'),
    )[0] as { Properties: { DistributionConfig: { Origins: Record<string, unknown>[] } } };

    const origins = dist.Properties.DistributionConfig.Origins;
    expect(origins.length).toBe(3);
    const s3Origin = origins.find((o) => 'S3OriginConfig' in o);
    expect(s3Origin?.OriginAccessControlId).toBeDefined();
  });

  it('never points the Lambda at the DRAFT guardrail version', () => {
    // A CFN-created guardrail is DRAFT, and inference against DRAFT throws
    // ValidationException while an update is in flight.
    const fns = Object.values(template.findResources('AWS::Lambda::Function')) as Array<{
      Properties: { Environment: { Variables: Record<string, unknown> } };
    }>;
    const vars = fns[0].Properties.Environment.Variables;
    expect(vars.GUARDRAIL_VERSION).not.toBe('DRAFT');
    expect(vars.MODEL_ID).toBe('amazon.nova-lite-v1:0');
  });

  it('blocks secrets both ways but only anonymises contact details on input', () => {
    // Filtering EMAIL on OUTPUT would redact the contact handoff, which is the
    // one answer this assistant exists to give.
    const guardrails = Object.values(template.findResources('AWS::Bedrock::Guardrail')) as Array<{
      Properties: {
        SensitiveInformationPolicyConfig: {
          PiiEntitiesConfig: Array<{ Type: string; Action: string; OutputEnabled?: boolean }>;
        };
      };
    }>;
    const pii = guardrails[0].Properties.SensitiveInformationPolicyConfig.PiiEntitiesConfig;

    const email = pii.find((e) => e.Type === 'EMAIL');
    expect(email?.Action).toBe('ANONYMIZE');
    expect(email?.OutputEnabled).toBe(false);

    const ssn = pii.find((e) => e.Type === 'US_SOCIAL_SECURITY_NUMBER');
    expect(ssn?.Action).toBe('BLOCK');
    expect(ssn?.OutputEnabled).toBeUndefined();
  });

  it('scopes bedrock permissions to Nova and the stack\'s own guardrails', () => {
    const policies = Object.values(template.findResources('AWS::IAM::Policy')) as Array<{
      Properties: { PolicyDocument: { Statement: Array<Record<string, unknown>> } };
    }>;
    const statements = policies.flatMap((p) => p.Properties.PolicyDocument.Statement);
    const invoke = statements.find((s) => s.Sid === 'InvokeNovaOnly');

    expect(invoke).toBeDefined();
    const resources = JSON.stringify(invoke!.Resource);
    expect(resources).toContain('amazon.nova-');
    // No blanket foundation-model access.
    expect(resources).not.toContain('foundation-model/*');
  });
});

describe('ChatApi (chat disabled)', () => {
  // A fork without the SCP carve-out must still be able to deploy the site.
  const template = synth('dev', { chatModelId: '' });

  it('creates no chat resources at all', () => {
    expect(Object.keys(template.findResources('AWS::Lambda::Function'))).toEqual([]);
    expect(Object.keys(template.findResources('AWS::DynamoDB::Table'))).toEqual([]);
    expect(Object.keys(template.findResources('AWS::Bedrock::Guardrail'))).toEqual([]);
  });

  it('leaves the distribution with its original two behaviours', () => {
    const dist = Object.values(
      template.findResources('AWS::CloudFront::Distribution'),
    )[0] as { Properties: { DistributionConfig: { CacheBehaviors: Record<string, unknown>[] } } };
    const patterns = dist.Properties.DistributionConfig.CacheBehaviors.map((b) => b.PathPattern);
    expect(patterns).toEqual(['/js/*', '/api/event']);
  });
});
