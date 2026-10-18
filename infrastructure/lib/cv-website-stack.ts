import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface CvWebsiteStackProps extends cdk.StackProps {
  stage: string;
  domainName: string;
  /** Prefix for globally-unique S3 bucket names. Set from cdk.json context. */
  resourcePrefix: string;
}

export class CvWebsiteStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly logBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: CvWebsiteStackProps) {
    super(scope, id, props);

    const { stage, domainName, resourcePrefix } = props;

    // S3 Bucket for static website hosting.
    // Note: we deliberately do NOT use `autoDeleteObjects: true` because that
    // construct spins up a Lambda-backed custom resource. LZA's
    // `NetworkPerimeter-SCP` has a `DenyLambdaWithoutVPC` statement (denies
    // lambda:CreateFunction when `lambda:VpcIds` is null) and this account has
    // no VPC, so that Lambda can't be created. Note it is Lambda *outside a
    // VPC* that's denied, not Lambda outright. If we ever need to destroy this
    // stack, empty the bucket first via `aws s3 rm s3://<resourcePrefix>-<stage> --recursive`.
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${resourcePrefix}-${stage}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // Origin Access Control (OAC) for CloudFront.
    //
    // This stays an L1 `CfnOriginAccessControl` purely so the existing resource
    // (and its name) survives: it predates `S3BucketOrigin.withOriginAccessControl`,
    // and letting the L2 mint a fresh one would replace it. The L2 origin below
    // imports it by id instead, which is what removed the index-based property
    // overrides this file used to carry. See the comment on `defaultBehavior`.
    const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: `cv-website-oac-${stage}`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    const importedS3Oac = cloudfront.S3OriginAccessControl.fromOriginAccessControlId(
      this,
      'ImportedS3Oac',
      oac.attrId,
    );

    // ACM Certificate for CloudFront (must be in us-east-1)
    // Note: This assumes the certificate is already created or will be validated via DNS
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      validation: acm.CertificateValidation.fromDns(),
    });

    // CloudFront Response Headers Policy for security
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      comment: 'Security headers for CV website',
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: true,
        },
      },
    });

    // CloudFront Cache Policy for optimal static site performance
    const cachePolicy = new cloudfront.CachePolicy(this, 'CachePolicy', {
      cachePolicyName: `cv-website-cache-${stage}`,
      comment: 'Cache policy for static CV website',
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // CloudFront Function: resolve directory-style URIs to index.html so that
    //   /legacy/            → /legacy/index.html
    //   /legacy/home-2/     → /legacy/home-2/index.html
    // Static-site convention; no pipeline / infra cost beyond ~submicrosecond
    // per request.
    const rewriteFunction = new cloudfront.Function(this, 'RewriteTrailingSlash', {
      functionName: `cv-website-rewrite-${stage}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var req = event.request;
          var uri = req.uri;
          if (uri.endsWith('/')) {
            req.uri = uri + 'index.html';
          }
          return req;
        }
      `),
    });

    // Plausible Analytics, proxied first-party. Two reasons this goes through
    // CloudFront rather than loading plausible.io directly from the page:
    //   1. `plausible.io` sits on common blocklists; a first-party path does not,
    //      so proxying is what actually recovers the blocked measurements.
    //   2. Plausible needs the real visitor IP in `X-Forwarded-For` or its bot
    //      filter drops the event *silently* (no error, no data). CloudFront
    //      appends the viewer IP to that header on every custom-origin request,
    //      so this works without extra configuration -- but don't "optimise" it
    //      away.
    // Proxying also makes the event POST same-origin, so there's no CORS
    // preflight at all.
    //
    // Neither `/js/*` nor `/api/event` exists in the site's own output (Next
    // emits its chunks under `/_next/static/`), so there's no path collision.
    // The `/js/*` pattern is a wildcard because Plausible issues a *per-site*
    // script filename (`/js/pa-XXXXX.js`) rather than a fixed `script.js`.
    //
    // DEBUGGING TRAP: `errorResponses` below is distribution-wide, so a 404
    // from plausible.io (e.g. a mistyped script filename) comes back as this
    // site's `/404.html`. If `curl -I https://<domain>/js/pa-XXXXX.js` returns
    // HTML, the filename is wrong -- CloudFront is not broken.
    const plausibleOrigin = new origins.HttpOrigin('plausible.io', {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    // `User-Agent` is required (Plausible derives the visitor id from its raw
    // value) and `Content-Type` has to survive (the script POSTs JSON).
    // Cookies and query strings are deliberately dropped: Plausible is
    // cookieless and has no use for either, and this is a third-party origin.
    const plausibleEventOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      'PlausibleEventOriginRequestPolicy',
      {
        originRequestPolicyName: `cv-website-plausible-event-${stage}`,
        comment: 'Forward only what the Plausible events API needs',
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          'User-Agent',
          'Content-Type',
        ),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
      },
    );

    // Access logs. Hoisted out of the Distribution props (where it used to be
    // constructed inline) so it can be referenced and exported. The construct
    // id stays 'LogBucket' — renaming it would replace the bucket.
    //
    // The expiry rule is prefix-scoped rather than bucket-wide, so anything
    // else stored here later isn't silently deleted by the log retention.
    this.logBucket = new s3.Bucket(this, 'LogBucket', {
      bucketName: `${resourcePrefix}-logs-${stage}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED, // CloudFront log delivery requires ACLs
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: 'expire-cloudfront-logs',
          prefix: 'cloudfront-logs/',
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `CV Website - ${stage}`,
      domainNames: [domainName],
      certificate: certificate,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe for lower cost
      enableLogging: true,
      logBucket: this.logBucket,
      logFilePrefix: 'cloudfront-logs/',
      defaultBehavior: {
        // `S3BucketOrigin.withOriginAccessControl` wires OAC natively and adds
        // the bucket policy itself. This replaced a pair of
        // `addPropertyOverride('DistributionConfig.Origins.0....')` calls, which
        // were a live footgun: CDK orders `Origins` by bind order, so adding a
        // third origin could shift the S3 bucket off index 0 and silently strip
        // its OAC — turning the entire site into `/404.html`. Index-by-position
        // is now index-by-construct, and a jest assertion guards it.
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket, {
          originAccessControl: importedS3Oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cachePolicy,
        responseHeadersPolicy: responseHeadersPolicy,
        compress: true,
        functionAssociations: [
          {
            function: rewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      // Note: the rewriteFunction above is attached to defaultBehavior only,
      // so these proxy behaviours deliberately don't inherit it.
      additionalBehaviors: {
        '/js/*': {
          origin: plausibleOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          // Plausible serves the script with its own cache headers; let
          // CloudFront honour them rather than the site's 1-day default.
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
        },
        '/api/event': {
          origin: plausibleOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          // POST is the whole point; GET/HEAD alone would silently 403 events.
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: plausibleEventOriginRequestPolicy,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // NOTE: the OAC property overrides and the manual `s3:GetObject` bucket
    // policy that used to live here are gone. `S3BucketOrigin.withOriginAccessControl`
    // above does both, and keeping a hand-written copy of the bucket policy
    // alongside the generated one would leave two equivalent statements to drift
    // apart forever.

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: this.websiteBucket.bucketName,
      description: 'S3 Bucket for website content',
      exportName: `${stage}-WebsiteBucket`,
    });

    new cdk.CfnOutput(this, 'LogBucketName', {
      value: this.logBucket.bucketName,
      description: 'CloudFront access-log bucket',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${stage}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${domainName}`,
      description: 'Website URL',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'ACM Certificate ARN',
    });

    new cdk.CfnOutput(this, 'CloudFlareSetupInstructions', {
      value: `Add CNAME in CloudFlare: ${domainName} -> ${this.distribution.distributionDomainName} (DNS only, no proxy). For ACM validation, run: aws acm describe-certificate --certificate-arn <arn> and add the returned ResourceRecord CNAME to CloudFlare (also DNS only).`,
      description: 'Manual DNS steps for CloudFlare',
    });
  }
}
