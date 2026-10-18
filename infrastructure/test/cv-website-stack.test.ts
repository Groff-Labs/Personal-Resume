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
function synth(stage = 'dev'): Template {
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
