# Technical depth

For "tell me about a hard problem" and "how have you actually used X". One
`##` per technology or problem, named with the specific term — `Transit
Gateway`, `Karpenter`, `M-21-31`, `6R`, not "networking".

This is the file that distinguishes someone who has used a service from someone
who has operated it. Favour the thing that went wrong and what you changed.

## Landing Zone Accelerator and Service Control Policies

Michael has deployed or scoped AWS Landing Zone Accelerator on several customer
engagements at AllCloud, including AllCloud's first migration of a customer
from its older landing zone to LZA. The subsections below cover what went
wrong, the patterns he now recommends, and the case where he advised against
LZA. Outside work he also runs his own
AWS Organization on a data-perimeter LZA configuration he wrote and maintains:
five Service Control Policies, two Resource Control Policies, an EC2
declarative policy, tag and backup policies, and about 120 automated tests
across the network, identity, resource, kill-switch and tag-governance
perimeters. This website is a workload inside it, so it deploys under the same
guardrails as everything else. The configuration repository is private; this
site's repository is public.

### A data-perimeter SCP whose Deny never fired

On a regulated financial-services customer, the same engagement that moved it
from AllCloud's older landing zone to LZA, Michael found a data-perimeter SCP
whose `StringEquals` principal-tag condition meant the Deny never fired. He
removed the condition, checked the corrected policy against AWS and internal
guidance, and confirmed with AWS Support that the SCP was what was blocking the
customer's pipeline. Other limits he plans around are the SCP size and
character limits, which force policies to be consolidated, and the fact that
SCPs cannot restrict an organization's management account.

### Brownfield organizations: a new management account and a Legacy OU

Because SCPs cannot restrict the management account, his recommendation for an
existing AWS organization is not to promote the customer's current account to
management account. Instead he creates a new management account used only for
billing and access control. Existing accounts move into a Legacy OU under
detective controls only, so production workloads are not disrupted, while
preventive SCPs apply to the new OUs from day one. He rates deploying LZA into
an existing organization at roughly 6–7 out of 10 for risk, compared with a new
organization.

### His LZA baseline, and reading the config rather than the console

His current LZA baseline is native LZA plus SCPs, resource control policies
(RCPs), VPC endpoint policies, and Amazon EventBridge rules that re-enable a
control if someone disables it outside the pipeline. He installs in two passes:
defaults first, then the customised configuration. And he reads the LZA
configuration rather than the console, after being caught out by a console
reading on one review: "anyone can understand your whole environment by reading
the config instead of clicking through the console."

### When not to use Landing Zone Accelerator: Control Tower for a five-person team

LZA is not always the answer. For a small document-imaging SaaS company with a
five-person operations team and no container experience, Michael recommended
AWS Control Tower alone and wrote down why: LZA was more governance machinery
than a five-person team should be asked to operate. The plan he wrote was
Crawl/Walk/Run. It starts with the landing zone and ends with Fargate per
tenant and Amazon Aurora once the team has the skills to run it.

### Narrowing an SCP instead of lifting it

His standing rule with Service Control Policies is to narrow a statement rather
than remove it. When this site's chat assistant needed one Lambda function in
an account with no VPC, the org's `DenyLambdaWithoutVPC` control blocked it.
Satisfying the control would have meant a NAT Gateway (~$32/month) or a Bedrock
PrivateLink endpoint, either of which cost more than the feature's entire
monthly budget and bought nothing: the function only calls the Bedrock API and
never egresses to the internet. He changed `Resource: "*"` to a `NotResource`
that exempts functions named `cv-chat-*` and nothing else. He chose a name
scope over a role scope deliberately. CDK deploys through CloudFormation's
execution role, so exempting that role would have let any CDK stack in any
account create VPC-less functions. The residual risk, that someone who can
already create functions could pick that name, is written into the commit.

### Splitting a blanket glue:* deny

The same narrowing approach applied to Glue. A kill-switch SCP denied `glue:*`
outright, which also blocked the free Glue Data Catalog that Athena needs. He
replaced it with `DenyGlueBillableCompute`, which keeps Glue jobs, crawlers,
triggers and dev endpoints denied while allowing the Data Catalog.

### The 5,120-byte SCP size limit

The SCP character limit is the first constraint that hits a growing guardrail
set. His `InfrastructureProtection` SCP reached 5,307 characters after LZA's
parameter substitution, over the 5,120 limit, and LZA failed on the
`ConstraintViolationException`. The fix was to move the LZA self-protection
statements into a separate `LzaComponentProtection` SCP. That policy attaches
to the sub-OUs rather than Root, because Root was already at the five-policy
direct-attachment limit. He now tracks the post-substitution size of every
policy alongside its statement count.

### A remediation Lambda that fought itself

An `RCPRevertProtection` function re-attaches the data-perimeter Resource
Control Policy if anyone detaches it. It exempted callers whose role started
with `AWSAccelerator`, but its own role did not match. Every revert it made
fired its own EventBridge rule and was treated as a new violation, which
produced an attach/detach loop of roughly 25,000 invocations a day. The loop
saturated the Organizations API, hung LZA's Prepare stage and left the RCP
intermittently detached. The fix was a self-trigger guard at the top of the
handler, placed before any Organizations call, plus reserved concurrency to cap
the blast radius. He deliberately kept the guard in code rather than in the
EventBridge pattern: an "anything-but" filter on the session issuer would also
have dropped events from IAM users and root, silently narrowing what the
control covers.

### Bedrock cross-region inference versus a region-deny SCP

Several Bedrock models are served only through cross-region inference
profiles, which route requests to regions outside an org's enabled set and
trip a standard region-deny SCP. Following AWS's documented pattern, he
exempted only `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`
from the region deny. A second statement re-denies them unless the inference
profile ARN is a `us.*` profile. Using exact action names rather than
`bedrock:Invoke*` keeps agents, flows and batch jobs region-locked, and
`global.*` profiles stay blocked as a data-residency decision.

## Multi-account AWS foundations

His own organization follows the standard OU split: a Security OU with Log
Archive and Audit accounts, an Infrastructure OU with Network and Shared Services accounts, and a
Workloads OU with a production and non-production account per application. It
replicates all 23 mandatory Control Tower controls as SCPs without running
Control Tower itself, and maps the strongly recommended and elective controls
against the same policies.

### Customer foundations: Identity Center federation and Transit Gateway networking

His customer foundation work covers AWS Organizations OU design, Control Tower
region governance, AWS Security Hub baselines and centralised networking. The
identity side is IAM Identity Center federated to whatever the customer already
runs: Azure AD Domain Services, Microsoft Entra ID over SAML, and Okta
migrations. His
default network design is central ingress and egress VPCs on an AWS Transit
Gateway, with subnets shared to workload accounts through AWS RAM. He has
argued against an SD-WAN mesh over the internet when the Transit Gateway on the
AWS backbone does the same job: the mesh in question would have needed dozens
of VPN tunnels for four sites.

### Perimeter exceptions as protected tags

Every data-perimeter exception in his design is an IAM tag in a protected
`LZA:*` namespace, for example `LZA:EXC:NET` to bypass the network perimeter
or `LZA:EXC:RES=S3` for one service's resource perimeter. Only principals
tagged `LZA:ADMIN` can set them, and any tag change raises a CloudWatch alarm,
so every exception is explicit and auditable. IAM Identity Center roles cannot
carry tags, so the break-glass permission set is exempted by ARN instead. It
has a four-hour session, requires MFA, and every assumption alarms. A
graduated kill switch (`LZA:KILL` with complete, read-only, network and data
levels) can lock down any role by tag.

### Hub-and-spoke networking, and turning it off

The reference design centralises egress through AWS Network Firewall in a Core
VPC, connects every VPC through a Transit Gateway, and serves AWS APIs through
centralised VPC endpoints, so no API call routes over the internet. One
Network Firewall detail caught him: with `drop_strict` ordering, TCP SYN
packets were dropped before the TLS SNI could be read, so the domain
allow-list matched no HTTPS traffic at all. `drop_established` lets the
handshake complete so the ClientHello can be inspected. For a personal
organization the hub cost far more than the workloads it protected. He
decommissioned the Transit Gateway, firewall and NAT Gateways but kept the
configuration in place behind re-enablement markers, which keeps the design a
reference rather than a running bill.

### GitHub OIDC deploy roles pinned to immutable repository IDs

His deploy roles trust GitHub Actions through OIDC, and he tightened them
twice. A wildcard repository trust meant any newly created repository matching
the pattern could deploy to production as admin, so production trust was
pinned to three named repositories. Renaming those repositories then switched
GitHub to its immutable subject format, which embeds the numeric repository
ID. He pinned trust by that ID, which also stops a deleted and recreated
same-name repository from inheriting the role. Separately, in the network account the
admin deploy role no longer trusts pull-request runs. Pull requests get a
read-only role that can only run `cdk diff`.

## Migrations: the 6R framework in practice

Michael's consistent position is that a fixed-timeline modernization can't be
committed to before anyone knows what is being modernized. In his own words:
"we cannot sign up for a Modernization with a set timeline until we know what
we'll be modernizing." When a customer asked for a modernization rather than a
rehost, he scoped a three-week modernization assessment that ended in a formal
decision gate, with rehost as the default if the assessment didn't justify
more. When a previous partner's lift-and-shift pricing for another customer
fell apart, he moved the deal to modernizing a single application, refused to
put a ballpark figure in writing, and wrote a discovery questionnaire of
several hundred questions instead. He has also gone the other way, steering a
customer from EKS to ECS on Fargate ahead of a HITRUST audit because the
simpler target met the need.

### Rescuing a PostgreSQL migration done with AWS DMS alone

He has also rescued a failed database migration. A previous partner had moved
PostgreSQL with AWS DMS alone, which carries tables and primary keys but not
secondary indexes and other schema objects. His plan ran the AWS Schema
Conversion Tool first, then DMS with change data capture.

## Kubernetes and EKS

### EKS multi-tenancy: account-per-tenant, namespace-per-tenant, or a shared cluster

Michael has made the EKS tenancy decision in each direction and can say why
each time. Account-per-tenant, on the federal software vendor's platform, is
right when tenants need a hard boundary: accounts are free, and the boundary is
the strongest AWS offers. A shared cluster with per-tenant cost attribution, on
the HR-tech platform, is right when isolating each tenant would multiply
data-store and cluster costs without a matching security requirement. In
another case he recommended moving a customer from a full EKS cluster per
customer to one multi-tenant cluster with managed data services. Tenant
identity would come from the signed token once and be enforced by PostgreSQL
row-level security under the ORM, rather than by passing the raw token down to
the database.

When a customer chose namespace-per-tenant for cost, his assessment made the
in-cluster controls the isolation layer and listed them as go-live
prerequisites rather than hardening for later: Istio STRICT mTLS, Kubernetes
NetworkPolicies and Pod Security Admission. He also resists running two
orchestration engines. When a team on EKS proposed adding ECS for one workload,
he argued to keep it on EKS.

Two further reasons he weighs account-per-tenant: whether the design has to be
portable to another AWS partition such as GovCloud, and whether each tenant needs
its own compliance evidence. Both push toward an account boundary, because the
account is the unit AWS reports against.

### Self-managed Kubernetes on bare metal

Outside work he runs an upstream kubeadm cluster on Raspberry Pis, bootstrapped
by Ansible and then handed to ArgoCD. The split is deliberate. Ansible owns the
irreducible minimum that must exist before GitOps can run: kubeadm, the Calico
CNI and ArgoCD itself. ArgoCD owns everything after that through an
app-of-apps: MetalLB, Istio, Kubernetes Gateway API ingress, cert-manager with
Let's Encrypt DNS-01, and the workloads. Running his own control plane taught
him the things EKS hides. A kube-vip static-pod virtual IP deadlocked at
`kubeadm init`, because it needed the API server to win leader election before
the API server's VIP existed. He replaced it with keepalived and HAProxy run as
host services. He also measured etcd on microSD cards at `fdatasync` times of
10 seconds and more, which left the control plane degraded until etcd moved to
SSD.

### HTTP/2 connection coalescing across Istio gateways

Several Istio gateways sharing one wildcard certificate produced 404s. Browsers reuse a single HTTP/2 connection for any hostname the
certificate covers, so a request for one service could arrive at another
service's gateway. He moved to the native Gateway API pattern: one shared
Gateway with a per-application `HTTPRoute`. That removed the coalescing problem
and a hand-managed Helm chart along with it.

## Infrastructure as code: CDK, CloudFormation, Terraform

Michael came from Terraform and has used AWS CDK heavily since joining
AllCloud. His working rule is that the right tool is the one the customer's
team can maintain after AllCloud leaves. If the customer already runs
Terraform, he reuses it. For a team that isn't ready for a general-purpose
programming language in its infrastructure, Terraform beats CDK. For AWS-only
platforms built by engineers who write code, CDK (Python or TypeScript) gives
real abstractions over CloudFormation, which it synthesises to anyway.
Terraform is the more portable choice, and it matters on Azure migrations:
Terraform ports cleanly to AWS, while Bicep and ARM templates have to be
rewritten.

### Mixing IaC tools, and the gates in front of them

He mixes tools when the boundary is clear. On one observability platform, AWS
infrastructure was in CDK and Grafana's own configuration was in Terraform,
because Terraform has the provider for it. He treats a customer's "raw
CloudFormation only" policy as a schedule risk to raise at scoping, because it
rules out the abstractions that save time. His pipelines gate on tflint or
cfn-lint, Trivy, gitleaks and Semgrep before a plan is applied. In his own
projects he uses CDK in TypeScript for application infrastructure, Landing Zone
Accelerator's YAML configuration for organization guardrails, and Ansible for
bare-metal hosts, and his public Cognito disaster-recovery demo ships the same
stack in both Terraform and CDK.

### CDK under strict service control policies

One CDK lesson comes from running it under strict guardrails. Several CDK
convenience constructs, such as `autoDeleteObjects` and `BucketDeployment`, are
backed by Lambda custom resources, so an SCP that denies Lambda outside a VPC
breaks them in an account with no VPC. And because CDK deploys through
CloudFormation's execution role, an SCP exemption scoped to that role reaches
every CDK stack in the account, which is why he scopes exemptions by resource
name instead.

## M-21-31 federal logging controls mapped to AWS services

On the federal software vendor's EKS platform, Michael mapped the OMB M-21-31
logging requirements to AWS mechanisms. AWS CloudTrail was organisation-wide
through Control Tower, deployed by the Landing Zone Accelerator. Amazon EKS
control-plane logging and the CloudWatch Observability add-on covered the
cluster. Amazon Route 53 Resolver query logging was set to 365-day retention,
and VPC Flow Logs covered network traffic. The work was a control-by-control
mapping that the customer could evidence, not a new logging product.

## IL4 and IL5 environments, DISA SRG and AWS GovCloud

Michael has designed DoD Impact Level 4 and Impact Level 5 environments twice:
at Accenture Federal Services from 2019, and later at Vivsoft. Both were built
and accredited to IL5. In total he has spent more than four years working
exclusively in AWS GovCloud (US), and he held Secret at Accenture and an interim
Top Secret at Vivsoft.

He cannot publish the control-by-control detail. The customers, the systems and
the specific DISA Cloud Computing SRG implementations are not his to describe,
and a plausible-sounding reconstruction would be worse than saying nothing. What
is fair to take from it: he has worked to IL4 and IL5 accreditation inside the
GovCloud partition for years, has designed against the SRG rather than read
about it, and knows which AWS services are and are not available in that
partition — which is the constraint that actually shapes a GovCloud design.

If you want the specifics, ask him directly; what he can say in a conversation
under NDA is more than he can put on a public page.

## A mistake: deleting production Transit Gateway routes

Michael tells this one himself. Cleaning up a Transit Gateway route table, he
deleted routes labelled "TESTING" that were carrying production traffic. He had
written down exactly what he was deleting before he deleted it, so he restored
them within minutes: the impact was under ten minutes of degraded routing, and
it was recoverable precisely because he had recorded the exact state before
changing it. The label was wrong, not the process. What was missing was a second
pair of eyes before touching a production route table.

Two things he took from it. Write down the exact state before you change it,
because that record is what turns a bad change into a short one. And measure
twice, cut once, applied to infrastructure: validate the change yourself, have
one person check it, then a second, then get both of them to agree out loud that
the risk is acceptable before anything is executed. Nothing that touches
production happens in a silo. A five-minute confirmation costs nothing against
being wrong about which routes carry live traffic, and that asymmetry is the
whole argument.

A change-review process was introduced for that customer afterwards. The
specifics are not publishable; it was a conventional contractor change-control
arrangement rather than anything novel.

## Public reference implementations

Two small public repositories demonstrate specific AWS patterns end to end.
`cognito-dr-demo` shows multi-region failover for Amazon Cognito with Google
federation: user pools in us-east-1 and us-west-2, deployable in Terraform or
CDK. It shows that the Google identity stays the same while the Cognito `sub`
differs per region, which is the detail a Cognito DR design has to plan for.
`aws-waf-challenge` uses Terraform to show the AWS WAF Challenge action
without the integration SDK. It runs CloudFront in front of an ALB that only
accepts CloudFront's managed prefix list and a secret origin header, with the
Challenge rule silently verifying browsers before traffic reaches the origin.

## This site as a worked example

michaelgroff.info is a static Next.js export on S3 and CloudFront, deployed by
CDK through GitHub OIDC, running under the same Landing Zone Accelerator
guardrails as production workloads. The chat assistant answering this question
is an agentic Bedrock loop in Lambda with tool use, Bedrock Guardrails on input
and output, and per-IP plus daily spend caps in DynamoDB. The repository is
public.

### The technology behind this site, and every AWS service hosting it

The short answer. This site is hosted on AWS. The AWS services that host it, and
the technology stack behind it, are: Amazon S3, Amazon CloudFront with Origin
Access Control and a CloudFront Function, AWS
Certificate Manager, AWS Lambda, Amazon DynamoDB, Amazon Bedrock, Amazon
CloudWatch Logs, AWS IAM and AWS Systems Manager Parameter Store. No server, no
container, no database, no VPC. Infrastructure is AWS CDK in TypeScript,
deployed by GitHub Actions through an IAM OIDC role. DNS is CloudFlare rather
than Route 53, deliberately.

The tech stack on the front end is Next.js, exported as static HTML with no
server rendering, styled with Tailwind. The chat assistant's model is Amazon
Nova Lite, served through Amazon Bedrock, with Bedrock Guardrails screening
input and output. Retrieval is IDF-weighted keyword search over this corpus
inside the Lambda, not a vector store and not a Bedrock Knowledge Base.

That list is taken from the synthesized CloudFormation template rather than from
memory. The hosting stack, and what each part of the stack does, front to back:

- **Amazon S3** holds the built static site. Two buckets: one for the site, one
  for CloudFront access logs. No public access; the bucket policy admits only
  CloudFront.
- **Amazon CloudFront** is the CDN and the only way in. It terminates TLS, serves
  the static export, and routes `/api/chat` to the assistant and `/js/*` plus
  `/api/event` to the analytics proxy.
- **Origin Access Control** signs CloudFront's requests to both S3 and the
  Lambda function URL, so neither origin is reachable directly. OAC rather than
  the legacy OAI.
- **AWS Certificate Manager** issues the TLS certificate, validated by DNS.
- **CloudFront Functions** rewrites directory URLs to `index.html` at the edge,
  which a static export needs and which costs a fraction of Lambda@Edge.
- **AWS Lambda** runs the chat assistant on ARM64, Node 22, with a function URL
  in response-streaming mode. It is the only compute in the system.
- **Amazon DynamoDB** holds the per-IP rate-limit counters and the daily spend
  budget, on-demand and TTL'd.
- **Amazon Bedrock** serves the model (Amazon Nova Lite) and the guardrail that
  screens both input and output.
- **CloudWatch Logs** takes the Lambda's structured logs, with an explicit log
  group and retention rather than a generated one.
- **AWS IAM** provides the execution role and the GitHub OIDC role; there are no
  long-lived access keys anywhere in the system.
- **AWS Systems Manager Parameter Store** holds the distribution id so the
  deploy workflow can invalidate the cache without hardcoding it.

Everything is static or serverless, which is the point: the whole thing idles at
effectively zero and the site costs cents a month. The repository is public, so
the entire stack is readable rather than described.

### What building it under real guardrails surfaced

The account's Lambda concurrency quota is 10, and AWS requires at least 10 to
stay unreserved. So the planned reserved-concurrency limit could never deploy,
and the quota itself became the flood cap. That decision and its condition are
recorded in code: if the quota is ever raised, an explicit reservation must be
added or the limit silently disappears. The model sometimes returned only its
reasoning as raw `<thinking>` markup. That is fixed server-side rather than by
prompt alone: the markup is stripped, the model is re-asked with tools withheld
if nothing remains, and a fixed fallback is the last resort. Measured on the
dev stage, a conversation costs under a tenth of a cent. The guardrail blocks
compensation questions and prompt injection before any model tokens are spent.

### Measuring an idea, then removing it

He built a pipeline to identify which companies visit the site, using Glue and
Athena over the CloudFront access logs joined to an IP-to-organization
database, and deployed it to production. It resolved about 94% of IPv4 visitors
to an organization, and nearly all of those were hosting providers and scanners rather
than employers, because real people browse from residential and mobile
addresses that carry no employer signal. Three noise filters failed, since
modern scanners render pages fully. He removed the pipeline in the same
session and wrote down why, so nobody rebuilds it. Visitor analytics now runs
on Plausible, proxied first-party through CloudFront. That proxy surfaced its
own silent failure: the site-specific script tracks nothing unless a config
object exists before it loads.

## Shared-table multi-tenancy with PostgreSQL row-level security

He designs, builds and operates a tenant-isolated SaaS platform as a long-running
side project: a Bun and Hono API with Drizzle on Aurora PostgreSQL Serverless v2,
on ECS Fargate behind CloudFront, with CDK infrastructure deployed into separate
development and production accounts in his own Landing Zone Accelerator
organization. It sits at the opposite end of the tenancy spectrum from the
account-per-tenant EKS platform he architected at work: tenants share tables and
are separated by PostgreSQL row-level security. Choosing between those two models
is a cost and compliance decision rather than a matter of taste, and having built
both is why he can argue either side.

### Row-level security that is silently off, and how to catch it

This is the failure mode he now checks for on any shared-table design, because
he hit it himself. Tenant isolation was built as two layers: an explicit
`tenant_id` filter on every query, and PostgreSQL row-level security
(`FORCE ROW LEVEL SECURITY`) as the backstop. The backstop was not actually
working: the API connected as the database master user, which owns the tables,
and PostgreSQL exempts a table owner from its own RLS policies unless forced.
A boot-time probe showed it could read rows with no tenant context set, while
the same code running as a plain non-owner role, which is all CI had ever
exercised, saw none. The fix was a dedicated runtime role that owns nothing and cannot
bypass RLS, created and verified by the API at every boot. In strict mode the
boot fails closed if that role can read any row without a tenant context, and
the ECS deployment circuit breaker keeps the previous tasks serving. A CI test
fails any new tenant table that ships without a policy. He rolled it out in
four reversible stages, proving each against the boot log before moving on.

The generalisable lesson, and the reason he raises it on shared-table reviews:
an isolation control that is only ever exercised in CI, under a different
database role than production uses, is not a control that has been tested. A
query that forgets its tenant filter should return nothing, and something has
to prove that at boot rather than assume it.

## Building with AI coding agents

He builds with AI coding agents as a matter of course, mainly Claude Code, and
this site's public commit history shows it: commits carry AI co-author
trailers. His view is that working without them is now the slower and less
thorough way to engineer. The discipline is in how the output is checked.
Model output is treated as probabilistic and verified deterministically: tests
and policy checks before merge, changes proven on a dev stage before
promotion, and failure handling written in code rather than trusted to a
prompt. This site's chat assistant follows the same rule: it strips stray
reasoning markup server-side, falls back to a fixed answer, and blocks
compensation questions with Bedrock Guardrails rather than by instruction
alone. He packages the workflow he uses into a private Claude Code plugin set
that runs a feature from requirements interview through spec, spec review,
tickets, implementation, independent review and release. At work he built
most of the AI tooling library his pre-sales team runs on.
