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
const ispExclusionAsns: string[] = app.node.tryGetContext('ispExclusionAsns') || [];

const env = {
  account: app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT || '421219980479',
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
  ispExclusionAsns,
  tags: {
    ...commonTags,
    Stage: stage,
  },
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
