#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CvWebsiteStack } from '../lib/cv-website-stack';
import { GitHubOidcStack } from '../lib/github-oidc-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';
// Migrating from the cv.* subdomain to apex. Distribution aliases become:
//   prod → michaelgroff.info
//   dev  → dev.michaelgroff.info
// The apex (prod) flip still needs the WordPress blog's DNS to be moved off
// michaelgroff.info first; we do dev first to validate the cert + alias
// path end-to-end.
const rootDomain = app.node.tryGetContext('domainName') || 'michaelgroff.info';
const fullDomainName = stage === 'prod' ? rootDomain : `${stage}.${rootDomain}`;

// Fork config. Defaults live in cdk.json's context block — someone forking this
// repo edits that one file rather than hunting through the stacks. The `||`
// fallbacks here are only a safety net for a stripped cdk.json.
const resourcePrefix = app.node.tryGetContext('resourcePrefix') || 'cv-michaelgroff';
const githubOrg = app.node.tryGetContext('githubOrg') || 'Groff-Labs';
const githubRepo = app.node.tryGetContext('githubRepo') || 'Personal-Resume';

// The account id is deliberately NOT in cdk.json and has no fallback here.
// This is a public repo: an account id is not a credential, but it is the one
// handle that makes everything else in here targetable (support-desk
// impersonation, cross-account trust probing, bucket and ECR enumeration), and
// a forker has to replace it anyway, so publishing it buys nothing.
//
// Supply it per environment instead:
//   CI        `CDK_DEFAULT_ACCOUNT` from the `AWS_ACCOUNT_ID` GitHub variable
//   local     exported in your shell, or `-c account=…`
//   assumed   `CDK_DEFAULT_ACCOUNT` is set for you by `cdk` when credentials
//             resolve, so an `aws sso login` session needs nothing extra
//
// Throwing beats defaulting. A wrong-but-present id makes CDK synth a template
// aimed at someone else's account and only fails at deploy time, if at all.
const account = app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT;
if (!account) {
  throw new Error(
    'No AWS account id. Set CDK_DEFAULT_ACCOUNT (CI reads vars.AWS_ACCOUNT_ID) ' +
      'or pass -c account=<id>. It is intentionally absent from cdk.json because ' +
      'this repo is public.',
  );
}

const env = {
  account,
  region: 'us-east-1', // CloudFront requires us-east-1 for ACM certificates
};

const commonTags = {
  Project: 'CV Website',
  ManagedBy: 'CDK',
  Owner: 'Michael Groff',
};

new CvWebsiteStack(app, `CvWebsite-${stage}`, {
  env,
  stage,
  domainName: fullDomainName,
  resourcePrefix,
  tags: {
    ...commonTags,
    Stage: stage,
  },
  // Chat backend config. `chatModelId: ""` (or absent) disables the feature.
  chatModelId: app.node.tryGetContext('chatModelId') ?? '',
  chatDailyUsdCap: app.node.tryGetContext('chatDailyUsdCap') ?? '0.10',
  chatIpTurnsPerHour: app.node.tryGetContext('chatIpTurnsPerHour') ?? '8',
  chatIpBurstPerMinute: app.node.tryGetContext('chatIpBurstPerMinute') ?? '3',
  chatIpJdPerDay: app.node.tryGetContext('chatIpJdPerDay') ?? '3',
});

new GitHubOidcStack(app, 'CvWebsite-OIDC', {
  env,
  githubOrg,
  githubRepo,
  resourcePrefix,
  tags: {
    ...commonTags,
    Stage: 'shared',
  },
});

app.synth();
