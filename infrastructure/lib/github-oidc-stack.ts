import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GitHubOidcStackProps extends cdk.StackProps {
  githubOrg: string;
  githubRepo: string;
  /** Prefix for the S3 buckets this role may write to. Set from cdk.json context. */
  resourcePrefix: string;
}

export class GitHubOidcStack extends cdk.Stack {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const { githubOrg, githubRepo, resourcePrefix } = props;

    // Use the native CloudFormation OIDC provider resource (AWS::IAM::OIDCProvider)
    // instead of CDK's L2 OpenIdConnectProvider, which spins up a Lambda-backed
    // custom resource. LZA's `NetworkPerimeter-SCP` carries a
    // `DenyLambdaWithoutVPC` statement — it denies lambda:CreateFunction when
    // `lambda:VpcIds` is null — and there is no VPC in this account, so any
    // custom-resource Lambda fails. (Earlier comments here said Lambda was
    // denied outright; it is specifically Lambda *outside a VPC*.) We don't
    // need the custom-resource niceties anyway since this is a one-shot create.
    const provider = new iam.CfnOIDCProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIdList: ['sts.amazonaws.com'],
      // GitHub's documented OIDC thumbprints. Since 2023 AWS validates GitHub
      // tokens against its own CA bundle and ignores these values, but they're
      // still required by the IAM API. Both are listed for resilience against
      // future GitHub-side cert rotation.
      thumbprintList: [
        '6938fd4d98bab03faadb97b34396831e3780aea1',
        '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
      ],
    });

    this.role = new iam.Role(this, 'GitHubActionsRole', {
      roleName: 'cv-website-github-actions',
      description: `Assumed by GitHub Actions in ${githubOrg}/${githubRepo} to deploy the CV website`,
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.FederatedPrincipal(
        provider.attrArn,
        {
          // Scoped to the deployment environments rather than `repo:org/repo:*`.
          // The wildcard would let any ref in the repo assume this role, which
          // matters more now that the repo is public and forked as a template.
          //
          // NOTE: every workflow that assumes this role sets `environment:` on
          // the job, so GitHub issues a subject of the form
          // `repo:ORG/REPO:environment:NAME` — NOT `...:ref:refs/heads/NAME`.
          // Listing branch refs here instead would lock out every deploy.
          // A new workflow needing AWS must set `environment:` to match.
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': [
              `repo:${githubOrg}/${githubRepo}:environment:production`,
              `repo:${githubOrg}/${githubRepo}:environment:dev`,
            ],
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

    // Landing Zone Accelerator network-perimeter SCP (NetworkPerimeter-SCP) denies
    // all API calls from principals whose source IP isn't in the org-wide
    // TrustedSourceIps list. GitHub Actions runners call AWS from GitHub-owned
    // IP ranges, so without an exemption every deploy would fail.
    // The SCP's DenyAccessFromUntrustedNetworks statement checks for either
    // LZA:EXC:NET=true (network perimeter only) or LZA:EXC:ALL=true (all LZA
    // perimeters). We opt for the tighter NET-only exemption.
    cdk.Tags.of(this.role).add('LZA:EXC:NET', 'true');

    this.role.addToPolicy(new iam.PolicyStatement({
      sid: 'AssumeCdkBootstrapRoles',
      actions: ['sts:AssumeRole'],
      resources: [`arn:aws:iam::${this.account}:role/cdk-*`],
    }));

    this.role.addToPolicy(new iam.PolicyStatement({
      sid: 'ReadCdkBootstrapVersion',
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:*:${this.account}:parameter/cdk-bootstrap/*`],
    }));

    // The site workflow queries our CFN stack outputs (bucket name + dist id)
    // at runtime. The infra workflow's `cdk diff` needs the same read access.
    this.role.addToPolicy(new iam.PolicyStatement({
      sid: 'ReadCfnStackOutputs',
      actions: [
        'cloudformation:DescribeStacks',
        'cloudformation:DescribeStackEvents',
        'cloudformation:GetTemplate',
        'cloudformation:ListStacks',
      ],
      resources: [
        `arn:aws:cloudformation:*:${this.account}:stack/CvWebsite-*/*`,
        `arn:aws:cloudformation:*:${this.account}:stack/CDKToolkit/*`,
      ],
    }));

    this.role.addToPolicy(new iam.PolicyStatement({
      sid: 'SyncWebsiteBucket',
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:ListBucket',
        's3:GetBucketLocation',
      ],
      resources: [
        `arn:aws:s3:::${resourcePrefix}-*`,
        `arn:aws:s3:::${resourcePrefix}-*/*`,
      ],
    }));

    this.role.addToPolicy(new iam.PolicyStatement({
      sid: 'InvalidateCloudFront',
      actions: [
        'cloudfront:CreateInvalidation',
        'cloudfront:GetInvalidation',
        'cloudfront:GetDistribution',
        'cloudfront:ListDistributions',
      ],
      resources: ['*'],
    }));

    new cdk.CfnOutput(this, 'GitHubActionsRoleArn', {
      value: this.role.roleArn,
      description: 'Paste this into the AWS_ROLE_ARN GitHub repo secret',
      exportName: 'GitHubActionsRoleArn',
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: provider.attrArn,
      description: 'GitHub OIDC provider ARN',
    });
  }
}
