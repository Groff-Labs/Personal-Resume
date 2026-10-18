# Engagements

Anonymised write-ups. One `##` section per engagement. The heading and first
sentence carry the distinctive terms, because that is what makes a section
retrievable.

Pattern that works: what the customer needed, what the constraint was, what was
actually built, what the outcome was. The constraint is the interesting part and
the part most write-ups omit.

Never name the customer. Watch for detail that re-identifies: industry plus
region plus headcount plus dates can be enough on its own.

## Azure-to-AWS assessment for a global mining enterprise

~320 VMs across 8 regions, ~30 subscriptions, ~400 TB of allocated storage, and
~200 GB per day of log ingestion under a 24-month retention requirement.

<!-- TODO: what made it hard? What did the assessment conclude? What did the
     customer do next? -->

## Multi-tenant SaaS platform on EKS

Seven products, ~65 microservices, one dedicated AWS account per tenant.
Replaced in-cluster PostgreSQL, MongoDB, Redis and RabbitMQ with managed AWS
services. Implemented US federal M-21-31 logging controls.

<!-- TODO: why account-per-tenant rather than namespace isolation? What broke or
     nearly broke? What would you do differently now? -->

## Landing Zone Accelerator deployments

Deployed across 6 engagements, with Control Tower, AWS Organizations, IAM
Identity Center and Service Control Policies.

<!-- TODO: pick the two most interesting. What was customer-specific? What SCP
     or guardrail decision would you defend in an interview? -->

<!-- TODO: add the remaining engagements worth telling. You delivered 17; the
     five or six with a real story are what matter, not all 17. -->
