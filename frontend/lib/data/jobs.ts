export interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  website?: string;
  logo?: string;
  /**
   * Optional background color for the logo chip. Defaults to white.
   * Use a dark color when the logo file is light-on-transparent
   * (e.g. Vivsoft's all-white wordmark) and would be invisible on white.
   */
  logoBg?: string;
  responsibilities: string[];
}

export const jobs: Job[] = [
  {
    id: "allcloud",
    company: "AllCloud",
    title: "Sr. Solutions Architect",
    location: "Remote, based in San Antonio, TX",
    startDate: "May 2024",
    endDate: "Present",
    website: "https://allcloud.io",
    logo: "/images/companies/allcloud.png",
    responsibilities: [
      "Architect AWS platforms for customers ranging from startups to enterprise, defaulting to serverless (Lambda, API Gateway, EventBridge, SQS/SNS, DynamoDB, Step Functions) when the workload allows.",
      "Lead pre-sales discovery, reference-architecture design, and executive presentations that translate business outcomes into buildable cloud systems and help close the engagement.",
      "Own end-to-end cloud migrations — assessment through blue/green cutover — using CI/CD pipelines and CloudFormation / Terraform to shorten downtime windows.",
      "Integrate generative-AI services (Bedrock, SageMaker) into customer workflows for document processing, decision automation, and predictive analytics.",
      "Run cost-optimization engagements across CloudWatch, Trusted Advisor, Cost Explorer, and third-party tools; surface workload right-sizing, Savings Plans, and anomaly remediation.",
      "Harden customer environments against the AWS Well-Architected Framework, emphasizing IAM boundaries, VPC segmentation, and GuardDuty / WAF posture.",
      "Mentor customer engineering teams on cloud-native patterns and IaC so they own the platform after engagement end.",
    ],
  },
  {
    id: "vivsoft",
    company: "Vivsoft Technologies",
    title: "Solutions Architect",
    location: "Remote, based in San Antonio, TX",
    startDate: "September 2022",
    endDate: "December 2024",
    website: "https://vivsoft.io",
    logo: "/images/companies/vivsoft.webp",
    logoBg: "#0f172a", // dark slate; Vivsoft's wordmark is white-on-transparent
    responsibilities: [
      "Led cloud architecture for DoD and federal programs, designing secure, multi-tenant systems against Impact Level 4 / 5 accreditation requirements and DISA SRG controls.",
      "Drove end-to-end migrations for mission-critical applications, including blue/green deployments that preserved uptime across cutover windows.",
      "Served as customer-facing architecture lead on cross-functional program teams, aligning cloud adoption with program-office requirements and security authorities.",
      "Translated cloud-adoption ROI for customer executives — security-posture improvements, operational cost, scalability headroom — driving executive buy-in on modernization roadmaps.",
    ],
  },
  {
    id: "innovative-solutions",
    company: "Innovative Solutions",
    title: "Sr. Solutions Architect / Cloud Architect",
    location: "Remote, based in San Antonio, TX",
    startDate: "May 2021",
    endDate: "September 2022",
    website: "https://innovativesol.com/",
    logo: "/images/companies/innovative-solutions.png",
    responsibilities: [
      "Led customer discovery and migration strategy across SMB and mid-market AWS accounts, owning the technical narrative from first call through post-deploy handoff.",
      "Designed repeatable migration patterns (assessment → landing zone → 6R application move → operational handoff) that the delivery team reused across engagements.",
      "Built AWS infrastructure across EC2, VPC, RDS, IAM, and WAF; automated provisioning in CloudFormation and Terraform.",
      "Stood up customer CI/CD on CodePipeline, CodeBuild, and CodeDeploy, replacing manual release processes with repeatable pipelines.",
      "Fed customer pain points back to AWS service and partner teams, shaping roadmap where it touched Innovative's Managed Cloud Services offering.",
      "Authored internal patterns and runbooks reused by the SA community; participated in AWS partner knowledge exchange.",
    ],
  },
  {
    id: "accenture",
    company: "Accenture Federal Services",
    title: "Cloud Tech Architect Delivery Specialist",
    location: "Remote, based in San Antonio, TX",
    startDate: "December 2019",
    endDate: "May 2021",
    website: "https://www.accenture.com",
    logo: "/images/companies/accenture.png",
    responsibilities: [
      "Designed cross-cloud architectures for federal customers on both Azure and AWS, spanning IaaS, PaaS, and SaaS layers.",
      "Built network and application topology: VPC / VNet, subnets, load balancers, EC2 / VMs, RDS, Azure SQL, Elastic Beanstalk, and App Service Environment.",
      "Created reusable on-prem-to-cloud migration plans for mission-critical applications under Agile delivery.",
      "Produced Azure-vs-AWS cost comparisons that informed CSP selection for new workloads.",
      "Held an Active Security Clearance (type available upon request).",
    ],
  },
  {
    id: "aws",
    company: "AWS (Amazon Web Services, Inc.)",
    title: "Cloud Support Engineer",
    location: "Dallas, TX",
    startDate: "May 2019",
    endDate: "December 2019",
    website: "https://aws.amazon.com",
    logo: "/images/companies/aws.png",
    responsibilities: [
      "Supported Windows-focused AWS workloads across 15+ services — EC2, VPC, ASG, SSM, Directory Services, CloudEndure, WorkSpaces, ECS, ELB, EBS, S3, RDS, AWS Backup.",
      "Resolved customer incidents spanning Windows systems, Active Directory, MSSQL, Exchange, IIS, Terminal Server, and remote-access issues.",
      "Led customer HA / DR engagements for hybrid workloads moving from on-prem to AWS.",
      "Partnered with AWS service and documentation teams to drive fixes and improvements informed by real customer incidents.",
      "Automated repetitive customer operations using AWS CLI, AWS Tools for PowerShell, and Lambda.",
    ],
  },
  {
    id: "unique-digital",
    company: "Unique Digital (UDI)",
    title: "Solutions Architect / Solutions Engineer",
    location: "San Antonio, TX",
    startDate: "April 2017",
    endDate: "May 2019",
    website: "http://www.uniquedigital.com/",
    logo: "/images/companies/unique-digital.png",
    responsibilities: [
      "Architected on-prem and hybrid IT solutions built on Dell EMC and partner technologies, sized against customers' 3 / 5 / 7-year capacity and budget plans.",
      "Served as pre-sales technical lead supporting outside sales across customers in multiple verticals.",
      "Ran vendor discovery and technical qualification with customers to shape multi-year IT strategies and partner-tech selection.",
      "Partnered with product management to tune the solution catalog against shifting customer demand and partner priorities.",
    ],
  },
  {
    id: "rackspace",
    company: "Rackspace",
    title: "Windows Administrator I & II",
    location: "San Antonio, TX",
    startDate: "January 2015",
    endDate: "April 2017",
    website: "https://www.rackspace.com",
    logo: "/images/companies/rackspace.jpg",
    responsibilities: [
      "Owned Windows Server workload lifecycle — bare-metal and Hyper-V / VMware ESXi VM deployment, configuration, and remediation — as a 24×7 managed-hosting engineer.",
      "Ran patching, MSSQL updates, and Windows service-pack cycles across the managed fleet against Rackspace and customer SLAs.",
      "Configured Windows Roles and Features (Active Directory, MSSQL, Exchange, IIS, Terminal Server, DNS) per customer requirements.",
      "Performed system and file backups and recovery against customer-defined RPO / RTO targets.",
      "Authored PowerShell automation that collapsed common admin tasks from hours to minutes.",
      "Engaged customers on phone, chat, and ticket portal for high-severity incidents, often leading customer-side troubleshooting calls.",
    ],
  },
  {
    id: "rk-homes",
    company: "R & K Specialized Homes Inc.",
    title: "IT / Network Administrator",
    location: "San Antonio, TX",
    startDate: "July 2013",
    endDate: "January 2015",
    website: "http://www.rkhomes.net/",
    logo: "/images/companies/rk-homes.jpg",
    responsibilities: [
      "Owned IT for 200+ employees across main office, satellite sites, and remote staff — Windows Active Directory, Terminal Server, FreeNAS storage, a 46-handset RingCentral VoIP rollout, and MDM for 39 company Android / iOS phones.",
      "Designed and deployed a full network refresh during a two-suite office remodel: 81 new data drops, two 48-port PoE switches, one 24-port switch, three WAPs, and a T1-to-fiber upgrade with Time Warner.",
      "Rolled out real-time GPS fleet tracking on 32 company vehicles via Network Fleet, replacing manual timekeeping and improving billable accuracy.",
      "Built an internal employee directory and calendar portal on FreeNAS + OwnCloud, replacing paper-based contact management across sites.",
      "Standardized employee onboarding / offboarding across IT systems, closing the HIPAA gap from ad-hoc account management.",
      "Authored video and PDF training materials covering staff systems, reducing the repeat 101-level support volume.",
    ],
  },
];
