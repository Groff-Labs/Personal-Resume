<!--
Source-of-truth resume. Edit this file, then regenerate resume.pdf:

    pandoc resume.md \
      -o frontend/public/resume.pdf \
      --pdf-engine=xelatex \
      -V geometry:margin=0.75in \
      -V fontsize=10pt \
      -V mainfont="Helvetica" \
      -V monofont="Menlo"

Or, without LaTeX, go through Chrome (prints crisper than wkhtmltopdf):

    pandoc resume.md -o resume.html --standalone --metadata title="Michael Groff — Resume"
    open -a "Google Chrome" resume.html   # then File → Print → Save as PDF

Commit the regenerated resume.pdf alongside edits to this file.
-->

# Michael Groff

**AWS Sr. Solutions Architect** · San Antonio, TX
[michaelgroff.info](https://michaelgroff.info) · [LinkedIn](https://www.linkedin.com/in/michael-groff-8b367489) · [GitHub](https://github.com/mgroff2)

---

## Summary

AWS Sr. Solutions Architect with 12+ years across cloud and hybrid infrastructure. Serverless-first, IaC everything, security by default. Career arc runs Rackspace Windows Admin → AWS Cloud Support Engineer → AWS Architect, which shapes how I design for production: it has to run at 2 a.m. on a Sunday without anyone waking up.

---

## Experience

### Sr. Solutions Architect — AllCloud
*May 2024 – Present · Remote (San Antonio, TX)*

- Architect AWS platforms for customers from startups to enterprise, defaulting to serverless (Lambda, API Gateway, EventBridge, SQS/SNS, DynamoDB, Step Functions) when the workload allows.
- Lead pre-sales discovery, reference-architecture design, and executive presentations that translate business outcomes into buildable cloud systems and help close engagements.
- Own end-to-end cloud migrations — assessment through blue/green cutover — using CI/CD pipelines and CloudFormation / Terraform to shorten downtime windows.
- Integrate generative-AI services (Bedrock, SageMaker) into customer workflows for document processing, decision automation, and predictive analytics.
- Run cost-optimization engagements across CloudWatch, Trusted Advisor, Cost Explorer, and third-party tools; surface right-sizing, Savings Plans, and anomaly remediation.
- Harden customer environments against AWS Well-Architected Framework pillars, emphasizing IAM boundaries, VPC segmentation, and GuardDuty / WAF posture.
- Mentor customer engineering teams on cloud-native patterns and IaC so they own the platform after engagement end.

### Solutions Architect — Vivsoft Technologies
*September 2022 – December 2024 · Herndon, VA*

- Led cloud architecture for DoD and federal programs, designing secure, multi-tenant systems against IL4 / IL5 accreditation requirements and DISA SRG controls.
- Drove end-to-end migrations for mission-critical applications, including blue/green deployments that preserved uptime across cutover windows.
- Served as customer-facing architecture lead on cross-functional program teams, aligning cloud adoption with program-office requirements and security authorities.
- Translated cloud-adoption ROI for customer executives — security posture, operational cost, scalability headroom — driving buy-in on modernization roadmaps.

### Sr. Solutions Architect / Cloud Architect — Innovative Solutions
*May 2021 – September 2022 · West Henrietta, NY*

- Led customer discovery and migration strategy across SMB and mid-market AWS accounts, owning the technical narrative from first call through post-deploy handoff.
- Designed repeatable migration patterns (assessment → landing zone → 6R application move → operational handoff) that the delivery team reused across engagements.
- Built AWS infrastructure across EC2, VPC, RDS, IAM, and WAF; automated provisioning in CloudFormation and Terraform.
- Stood up customer CI/CD on CodePipeline, CodeBuild, and CodeDeploy, replacing manual release processes with repeatable pipelines.
- Fed customer pain points back to AWS service and partner teams, shaping roadmap where it touched Innovative's Managed Cloud Services offering.

### Cloud Tech Architect Delivery Specialist — Accenture Federal Services
*December 2019 – May 2021 · San Antonio, TX*

- Designed cross-cloud architectures for federal customers on Azure and AWS, spanning IaaS, PaaS, and SaaS layers.
- Built network and application topology: VPC / VNet, subnets, load balancers, EC2 / VMs, RDS, Azure SQL, Elastic Beanstalk, and App Service Environment.
- Created reusable on-prem-to-cloud migration plans for mission-critical applications under Agile delivery.
- Produced Azure-vs-AWS cost comparisons that informed CSP selection for new workloads.
- Held an Active Security Clearance (type available upon request).

### Cloud Support Engineer — AWS (Amazon Web Services)
*May 2019 – December 2019 · Dallas, TX*

- Supported Windows-focused AWS workloads across 15+ services — EC2, VPC, ASG, SSM, Directory Services, CloudEndure, WorkSpaces, ECS, ELB, EBS, S3, RDS, AWS Backup.
- Resolved customer incidents spanning Windows systems, Active Directory, MSSQL, Exchange, IIS, Terminal Server, and remote-access issues.
- Led customer HA / DR engagements for hybrid workloads moving from on-prem to AWS.
- Partnered with AWS service and documentation teams to drive fixes and improvements informed by real customer incidents.
- Automated repetitive customer operations using AWS CLI, AWS Tools for PowerShell, and Lambda.

### Solutions Architect / Solutions Engineer — Unique Digital (UDI)
*April 2017 – May 2019 · San Antonio, TX*

- Architected on-prem and hybrid IT solutions built on Dell EMC and partner technologies, sized against customers' 3 / 5 / 7-year capacity and budget plans.
- Served as pre-sales technical lead supporting outside sales across customers in multiple verticals.
- Ran vendor discovery and technical qualification to shape multi-year IT strategies and partner-tech selection.
- Partnered with product management to tune the solution catalog against shifting customer demand and partner priorities.

### Windows Administrator I & II — Rackspace
*January 2015 – April 2017 · San Antonio, TX*

- Owned Windows Server workload lifecycle — bare-metal and Hyper-V / VMware ESXi VM deployment, configuration, and remediation — as a 24×7 managed-hosting engineer.
- Ran patching, MSSQL updates, and Windows service-pack cycles across the managed fleet against Rackspace and customer SLAs.
- Configured Windows Roles and Features (Active Directory, MSSQL, Exchange, IIS, Terminal Server, DNS) per customer requirements.
- Authored PowerShell automation that collapsed common admin tasks from hours to minutes.
- Engaged customers on phone, chat, and ticket portal for high-severity incidents, often leading customer-side troubleshooting calls.

### IT / Network Administrator — R & K Specialized Homes
*July 2013 – January 2015 · San Antonio, TX*

- Owned IT for 200+ employees across main office, satellite sites, and remote staff — Windows AD, Terminal Server, FreeNAS, a 46-handset RingCentral VoIP rollout, and MDM for 39 company Android / iOS phones.
- Designed and deployed a full network refresh during a two-suite office remodel: 81 data drops, two 48-port PoE switches, one 24-port switch, three WAPs, and a T1-to-fiber upgrade with Time Warner.
- Rolled out real-time GPS fleet tracking on 32 company vehicles via Network Fleet, replacing manual timekeeping and improving billable accuracy.
- Built an internal employee directory and calendar portal on FreeNAS + OwnCloud, replacing paper-based contact management across sites.
- Authored video and PDF training materials covering staff systems, reducing repeat 101-level support volume.

---

## Education

**Bachelor of Arts** — Texas State University, San Marcos, TX
*School of Journalism & Mass Communication*

- Dean's List honoree
- Active in intramural sports and student organizations
- University Star (student paper) contributor

---

## Certifications

**Amazon Web Services**
- AWS Certified Solutions Architect – Professional (2022)
- AWS Certified Solutions Architect – Associate (2021)
- AWS Certified SysOps Administrator – Associate (2023)
- 16 AWS Partner / AWS Knowledge training badges (2023–2026), including Agentic AI, Generative AI Essentials, Serverless, Storage Core/Technologist, and GovCloud Essentials

**CompTIA**
- Security+ ce (2024)

**ICAgile**
- ICP – ICAgile Certified Professional (2020)

**Red Hat**
- Sales Engineer Specialist – Automation / Ansible (2019)

**Dell EMC · VMware · Microsoft**
- Dell EMC PowerEdge Associate + Implementation Engineer Specialist (2018)
- VMware VSP / VTSP partner accreditations across BC, HCI, MA, MO, NV, SV (2017–2018)
- Microsoft Technology Associate – Networking Fundamentals (2017)

*Live badges and verification links at [michaelgroff.info](https://michaelgroff.info).*

---

## Skills

- **AWS:** Lambda · API Gateway · S3 · CloudFront · DynamoDB · EventBridge · SQS/SNS · Step Functions · ECS/Fargate · EC2 · VPC · IAM · Route 53 · ACM · WAF · CloudWatch · Cost Explorer
- **Infrastructure as Code:** AWS CDK (TypeScript) · SST · Pulumi · Terraform · CloudFormation
- **Languages:** TypeScript · Python · Bash · PowerShell
- **CI/CD & GitOps:** GitHub Actions · GitLab CI · CircleCI · ArgoCD · FluxCD · Helm · Kustomize
- **Patterns:** Serverless-first · Event-driven · Microservices · Blue/green deploys · Well-Architected · Cost optimization · DR
- **Platforms:** Linux · Windows Server · VMware · Hyper-V · KVM · Docker · Kubernetes · CloudFlare
- **Observability:** CloudWatch · Datadog · New Relic · Prometheus · Grafana
- **Config Mgmt:** Ansible · Chef · Puppet
- **Specializations:** On-prem → cloud migrations · Platform modernization · Greenfield AWS · Hybrid (AWS + Azure + on-prem) · DoD/Federal (IL4, FedRAMP) · Generative AI integration

---

*References and letters of recommendation available upon request.*
