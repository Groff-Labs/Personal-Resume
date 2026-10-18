# Engagements

Anonymised write-ups. One `##` section per engagement. The heading and first
sentence carry the distinctive terms, because that is what makes a section
retrievable.

Pattern that works: what the customer needed, what the constraint was, what was
actually built, what the outcome was. The constraint is the interesting part and
the part most write-ups omit.

Never name the customer. Watch for detail that re-identifies: industry plus
region plus headcount plus dates can be enough on its own. Say whether he
delivered or scoped each one, and keep that distinction if you edit.

## What the 17 AWS engagements are, and what was scoped instead

Michael delivered 17 AWS customer engagements at AllCloud between May 2024 and
July 2025, his delivery period before he moved into pre-sales. Most were AWS
Migration Acceleration Program (MAP) Assess or Mobilize engagements, landing
zones, or migrations. From July 2025 to October 2026 he worked in pre-sales and
scoped well over a hundred more opportunities, which are counted separately.
Each write-up below says whether he delivered the engagement or scoped it.

## Rackspace-to-AWS rehost migration with a new landing zone for a security software company

A security software company needed to leave its Rackspace-hosted environment
for AWS. Michael ran this engagement end to end: he did the discovery and wrote
the level-of-effort estimate during pre-sales, then delivered it. Having worked
at Rackspace earlier in his career, he knew the source platform from the inside.

The build was a Landing Zone Accelerator (LZA) foundation, then a rehost with
AWS Application Migration Service (MGN): replication agents on the source
servers, site-to-site VPN back to the old environment, single sign-on through
Azure AD Domain Services, a test migration, and a written cutover runbook.
Cutover and DNS cutover completed in January 2025, and AllCloud recognised the
cutover internally. The customer went on to sign a managed-services contract
with AllCloud.

<!-- GAP: the constraint (downtime window, contract end date, a system that
     couldn't move), and "what I'd do differently" if there is something. -->

## Multi-tenant EKS platform with an AWS account per tenant for a public-sector software vendor

A software vendor serving US public-sector customers ran its products on a
legacy container orchestrator and needed a managed, repeatable Kubernetes
platform on AWS.
Three constraints shaped the design. The architecture had to be deployable
unchanged to AWS GovCloud (US). The vendor was working to a government contract
deadline. And the vendor asked for the OMB M-21-31 logging controls to be in
place.


Michael was a hands-on architect on the CI/CD and infrastructure workstreams.
Each tenant got a dedicated AWS account, created through the Landing Zone
Accelerator's account configuration. Accounts cost nothing to create and give
the strongest isolation boundary AWS has. The platform was Amazon EKS with
Karpenter node pools. Istio ran in STRICT mTLS mode, with an Istio ingress
gateway behind a Network Load Balancer replacing the ALB ingress controller.
Argo CD ApplicationSets handled deployment, and the infrastructure was AWS CDK
v2 in Python. In-cluster PostgreSQL, MongoDB, Redis and RabbitMQ moved to
Amazon RDS, Amazon DocumentDB, Amazon ElastiCache and Amazon MQ. The worker
nodes were EC2 rather than Fargate, so the same design would run in GovCloud.

Not everything went smoothly. Enforcing strict mTLS broke log shipping through
Fluent Bit. RDS ran out of connection slots. One incident took down five
platform services at once. Michael triaged all five, found a root cause for
each and assigned the fixes to the engineers. The subtle one was Keycloak
reading stale secret values, because a deployment script overwrote secrets on
every run. The engagement was signed off and the customer went on to a second phase and a
managed-services contract.

<!-- GAP: "what I'd do differently". Candidate, only if it is genuinely your
     view: roll strict mTLS out namespace by namespace with observability
     checked first. -->

## Azure-to-AWS migration assessment for a global mining enterprise

A global mining enterprise wanted to know whether and how to move its Azure
estate to AWS: a few hundred virtual machines across multiple regions and
dozens of Azure subscriptions, with hundreds of terabytes of data. Michael was
the lead solutions architect on the MAP Assess.

The constraints came from the customer's security and compliance teams rather
than from the technology. All north-south and east-west traffic had to be
inspected. Data-sovereignty law applied in more than one jurisdiction.
Financial-controls auditing required restores to be validated every month. And
some records had to be archived for decades. The target design was an LZA
landing zone with an AWS Transit Gateway in each region and highly available
third-party firewall pairs behind Gateway Load Balancer, so every flow passed
through inspection without the firewalls becoming a single point of failure.
The 6R disposition was mainly rehost, using AWS Application Migration Service,
with AWS DMS and the Schema Conversion Tool for databases and Amazon FSx for
file shares.

The assessment led directly to a Mobilize engagement, which the customer
accepted as complete in August 2026. During Mobilize the customer chose
Databricks on AWS rather than the AWS-native lakehouse in the original scope,
and Michael wrote the change order that re-scoped the work.

<!-- GAP: "what I'd do differently". -->

## Landing Zone Accelerator without Control Tower, and shared-cluster EKS cost attribution, for an HR-tech SaaS company

An HR-tech SaaS company came to AllCloud through MAP. Michael led the
assessment workshops and then the Mobilize engagement. The Mobilize foundation
was a Landing Zone Accelerator deployment without AWS Control Tower: an
organizational unit (OU) strategy, preventive service control policies (SCPs),
and backup policies managed through LZA. Michael wrote AllCloud's internal "LZA
Config Settings Explained" guide during this engagement.

<!-- GAP: why LZA without Control Tower here. An interviewer will ask. -->

The interesting decision was about tenancy. The alternative on the table was a
separate EKS cluster, or a separate account, for each of the company's own
customers. Michael kept one shared production cluster across development,
staging and production accounts instead. The cluster ran far more than batch
Spark jobs, and isolating each customer would have meant a dedicated MongoDB
per customer, so per-customer clusters would have multiplied the bill without a
matching security requirement. What the customer actually needed to know was
what each of its customers cost, so he built proportional per-customer cost
attribution in CloudZero. For infrastructure as code, he ran an options session
covering CloudFormation, Terraform, CDK, CDK for Terraform, Pulumi and SST, and
the team chose AWS CDK in Python.

## Expanding a SaaS platform into two new Asia-Pacific AWS regions on an existing landing zone

This was Michael's first AllCloud engagement, in mid-2024: a software company
needed its AWS platform running in two new Asia-Pacific regions. He led the
infrastructure workstream. The work covered enabling the regions and
re-registering OUs so AWS Control Tower governed them, a Transit Gateway
deployed from CloudFormation, VPCs through AWS Service Catalog, extending AWS
Managed Microsoft AD, an AMI copy pipeline, resource-based policies for more
than ten services, and the EKS and WAF footprint.

The recorded constraint was that some legacy accounts sat outside both the
landing zone and Control Tower, so not every guardrail could be applied
uniformly. One decision saved real rework. The plan assumed the SCPs would have
to be rebuilt for the new regions. Michael found that updating the landing
zone's region list and removing the SCPs it didn't manage was enough. He also
wrote the region-deployment runbook, over 5,000 words and revised more than a
hundred times during the work.

The customer kept coming back to AllCloud. In 2026 Michael designed its move
from New Relic to a self-managed Grafana LGTM stack on EKS. AWS infrastructure
was in CDK and Grafana configuration in Terraform, Kubernetes upgrades were
blue/green, and an authenticated internet-facing ingest path removed the need
for a Transit Gateway.

## Steering a healthcare company from EKS to ECS on Fargate ahead of a HITRUST deadline

A healthcare services company moving to AWS from another cloud had to keep its
HITRUST certification, with a fixed audit date in March. Michael scoped the
engagement in pre-sales; he did not deliver it. Kubernetes was on the table.
His scoping notes said there was no real need for EKS and that it would add
complexity the team didn't need, and he asked whether ECS, or a rehost before
any replatform, would fit better.

The scoped design replatformed onto Amazon ECS on AWS Fargate with Amazon
Aurora, plus pilot-light disaster recovery. That gave the customer managed
containers without running a Kubernetes control plane while preparing for a
certification audit. The delivery team built it, and the customer signed off in
May 2026 that the migration to AWS was fully complete.
