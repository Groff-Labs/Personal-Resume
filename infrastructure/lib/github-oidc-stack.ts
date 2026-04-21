import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GitHubOidcStackProps extends cdk.StackProps {
  githubOrg: string;
  githubRepo: string;
}

export class GitHubOidcStack extends cdk.Stack {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const { githubOrg, githubRepo } = props;

    // Use the native CloudFormation OIDC provider resource (AWS::IAM::OIDCProvider)
    // instead of CDK's L2 OpenIdConnectProvider, which spins up a Lambda-backed
    // custom resource. The Lambda creation is blocked in this account by SCP
    // `p-e8vbo6ej`, and we don't need the custom-resource niceties since this
    // is a one-shot create.
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
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:*`,
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

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
        'arn:aws:s3:::cv-michaelgroff-*',
        'arn:aws:s3:::cv-michaelgroff-*/*',
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
