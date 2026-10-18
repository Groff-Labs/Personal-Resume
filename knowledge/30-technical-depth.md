# Technical depth

For "tell me about a hard problem" and "how have you actually used X". One
`##` per technology or problem, named with the specific term — `Transit
Gateway`, `Karpenter`, `M-21-31`, `6R`, not "networking".

This is the file that distinguishes someone who has used a service from someone
who has operated it. Favour the thing that went wrong and what you changed.

## Landing Zone Accelerator and Service Control Policies

<!-- TODO: you have unusually good material here. This very repo runs under an
     LZA org whose SCPs blocked a Glue pipeline and Lambda outside a VPC, and
     you narrowed two SCPs rather than lifting them. That is a real,
     demonstrable governance story with a public commit history behind it. -->

## Multi-account AWS foundations

<!-- TODO -->

## Migrations: the 6R framework in practice

<!-- TODO: which R, how often, and when you talked a customer out of the one
     they wanted. -->

## Kubernetes and EKS

<!-- TODO -->

## Infrastructure as code: CDK, CloudFormation, Terraform

<!-- TODO: you have a defensible opinion on when each one is right. Worth
     writing, because interviewers ask it and most answers are generic. -->

## This site as a worked example

michaelgroff.info is a static Next.js export on S3 and CloudFront, deployed by
CDK through GitHub OIDC, running under the same Landing Zone Accelerator
guardrails as production workloads. The chat assistant answering this question
is an agentic Bedrock loop in Lambda with tool use, Bedrock Guardrails on input
and output, and per-IP plus daily spend caps in DynamoDB. The repository is
public.

<!-- TODO: optional, but this is the most verifiable thing in the whole corpus
     and a recruiter can click it. -->
