/** One title held at a company, for entries that span a promotion path. */
export interface JobRole {
  title: string;
  startDate: string;
  endDate: string;
  responsibilities: string[];
}

export interface Job {
  id: string;
  company: string;
  /** Headline title. For multi-role entries this is the most recent one. */
  title: string;
  location: string;
  /** Tenure at the company overall, not the current title. */
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
  /**
   * Set exactly one of `roles` or `responsibilities`.
   * `roles` (newest first) renders a promotion path inside a single card —
   * one company block instead of one card per title.
   */
  roles?: JobRole[];
  responsibilities?: string[];
}

export const jobs: Job[] = [
  // AllCloud is ONE card holding the full promotion path, rather than one card
  // per title — it reads as growth at a single company instead of three stints.
  // `title` mirrors roles[0]; `startDate`/`endDate` span the whole tenure.
  //
  // SCHEDULED: on 1 Oct 2026, prepend this role and set the current entry's
  // endDate to "October 2026". Remember to update `title` above it too:
  //
  //   {
  //     title: "Sr. Cloud Solutions Architect / Team Lead",
  //     startDate: "October 2026",
  //     endDate: "Present",
  //     responsibilities: [ /* delivery-side bullets */ ],
  //   },
  {
    id: "allcloud",
    company: "AllCloud",
    title: "Sr. Pre-Sales Solutions Architect / Team Lead",
    location: "Remote, based in San Antonio, TX",
    startDate: "May 2024",
    endDate: "Present",
    website: "https://allcloud.io",
    logo: "/images/companies/allcloud.webp",
    roles: [
      {
        title: "Sr. Pre-Sales Solutions Architect / Team Lead",
        startDate: "July 2026",
        endDate: "Present",
        responsibilities: [
          "Lead a pre-sales solutions architecture team, owning technical qualification standards, reference architecture quality, and engagement scoping ahead of handoff to delivery. Mentor solutions architects on discovery technique, sizing, and executive communication.",
          "Partner with practice and sales leadership on staffing, resource allocation, and pipeline review; contribute to hiring and onboarding, including authoring the pre-sales solutions architect interview guide.",
          "One of three practice team leads; guide three solutions architects and own a $4M annual booking quota, attained ~125% (~$5M) in FY2026.",
          "Built and lead an internal AI tooling library of 13 skills spanning the full engagement lifecycle, from SOW review and architecture design guides through MAP readouts, licensing assessments, Jira task generation, and change orders. Authored 9 net-new and contributed ~90% of commits and ~21,000 lines in three weeks.",
          "Lead AllCloud North America's AWS One OLA (Optimization and Licensing Assessment) partner certification: completed the Microsoft enablement track, produced the full deliverable set against an AWS-set ~600-server scenario, and submitted for AWS approval.",
          "Audited ~100 customer engagements for pipeline hygiene, surfacing that ~10% carried no CRM record and roughly half no supporting documentation.",
        ],
      },
      {
        title: "Sr. Pre-Sales Solutions Architect",
        startDate: "July 2025",
        endDate: "July 2026",
        responsibilities: [
          "Led technical discovery, requirements analysis, and reference architecture design across the AWS portfolio. Authored statements of work, level-of-effort estimates, TCO models, and technical proposals, and presented architecture and cost narratives to customer executives.",
          "Partnered with account executives on technical qualification, scoping, and close. Built proofs of concept to de-risk technical decisions before customers committed budget, and registered and managed AWS partner funding programs.",
          "Technical solutions architect on ~150 opportunities, closing ~70 at ~$10.5M in services revenue and influencing ~$23M in total pipeline.",
          "Carried the highest technical request volume of 37 solution architects globally, roughly 145 requests and ~55% more than the next-highest, sustained at ~10 opportunities per month over 15 months.",
          "~62% win rate by count, ~80% by value, roughly 10 points above the solutions architect team average. Median ~40 days from opportunity creation to close.",
          "Registered ~$1.2M across 16 AWS MAP programs (Assess and Mobilize).",
          "Produced ~30 level-of-effort and estimate packages in four months, ~10 named SOWs and proposals, and 5 proofs of concept, all five closed won.",
          "Quantified that ~340 of ~590 person-hours (~58%) of pre-sales effort on non-converting deals was artifact production, then helped build and tune the AI assistant that now automates it.",
          "Established AllCloud's first standardized pre-sales artifact set: handover document template, discovery questionnaire, SOW input structure, and an estimation workbook used 12+ times.",
        ],
      },
      {
        title: "Sr. Cloud Solutions Architect",
        startDate: "May 2024",
        endDate: "July 2025",
        responsibilities: [
          "Owned end-to-end AWS delivery for customer engagements: assessment, architecture design, landing zone build, migration execution, and operational handoff. Ran discovery and design workshops, authored architecture design guides, and presented final readouts to customer stakeholders.",
          "Designed and deployed AWS infrastructure across compute, networking, storage, identity, and security. Implemented infrastructure as code in AWS CDK, CloudFormation, and Terraform, and hardened environments against the AWS Well-Architected Framework.",
          "Delivered 17 AWS engagements across 11 industries covering landing zones, MAP migrations, modernization, security posture, and cost optimization. Ran up to 5 concurrently, typically 3 to 6 months, the largest spanning 14 months and 4+ workstreams.",
          "Assessed a global mining enterprise's Azure estate for AWS migration: ~320 VMs across 8 regions, ~30 subscriptions, ~400 TB allocated storage, and ~200 GB per day of log ingestion under 24-month retention.",
          "Architected a multi-tenant SaaS platform of 7 products and ~65 microservices on EKS, one dedicated AWS account per tenant, replacing in-cluster PostgreSQL, MongoDB, Redis, and RabbitMQ with managed AWS services and implementing US federal M-21-31 logging controls.",
          "Deployed Landing Zone Accelerator across 6 engagements; delivered Azure-to-AWS, Rackspace-to-AWS, and on-premises-to-AWS migrations.",
          "Authored or co-authored architecture design guides for 9 engagements, plus the SaaS design guide template reused on 4+ engagements since.",
          "4 delivery engagements converted into follow-on or expansion work.",
        ],
      },
    ],
  },
  {
    id: "vivsoft",
    company: "Vivsoft Technologies",
    title: "Sr. Solutions Architect",
    location: "Remote, based in San Antonio, TX",
    // Overlaps AllCloud (May–Dec 2024) on purpose — both roles were held
    // concurrently. Dates match LinkedIn and employment records; truncating
    // would contradict a background check.
    startDate: "September 2023",
    endDate: "December 2024",
    website: "https://vivsoft.io",
    logo: "/images/companies/vivsoft.webp",
    logoBg: "#0f172a", // dark slate; Vivsoft's wordmark is white-on-transparent
    responsibilities: [
      "Led cloud architecture for DoD and federal programs, designing secure, multi-tenant systems against Impact Level 4 / 5 accreditation requirements and DISA SRG controls.",
      "Drove end-to-end migrations for mission-critical applications, including blue/green deployments that preserved uptime across cutover windows.",
      "Served as customer-facing architecture lead on cross-functional program teams, aligning cloud adoption with program-office requirements and security authorities.",
      "Translated cloud-adoption ROI for customer executives across security-posture improvements, operational cost, and scalability headroom, driving executive buy-in on modernization roadmaps.",
    ],
  },
  {
    id: "innovative-solutions",
    company: "Innovative Solutions",
    title: "Sr. Solutions Architect",
    location: "Remote, based in San Antonio, TX",
    startDate: "May 2021",
    endDate: "September 2023",
    website: "https://innovativesol.com/",
    logo: "/images/companies/innovative-solutions.webp",
    // Titles here mirror LinkedIn exactly. The Mar 2023 step to Sr. is a real
    // promotion — flattening it to "Sr." throughout would hide the progression.
    roles: [
      {
        title: "Sr. Solutions Architect",
        startDate: "March 2023",
        endDate: "September 2023",
        responsibilities: [
          "Served as senior technical authority on customer engagements, reviewing architecture and scoping produced by the wider solutions architecture team.",
          "Fed customer pain points back to AWS service and partner teams, shaping roadmap where it touched Innovative's Managed Cloud Services offering.",
          "Authored internal patterns and runbooks reused by the SA community, and participated in AWS partner knowledge exchange.",
        ],
      },
      {
        title: "Solutions Architect",
        startDate: "January 2022",
        endDate: "March 2023",
        responsibilities: [
          "Moved into pre-sales, leading customer discovery and migration strategy across SMB and mid-market AWS accounts.",
          "Owned the technical narrative from first call through post-deploy handoff, keeping scoping honest against what delivery could actually build.",
        ],
      },
      {
        title: "Cloud Architect",
        startDate: "May 2021",
        endDate: "January 2022",
        responsibilities: [
          "Delivered AWS migration and infrastructure engagements for SMB and mid-market customers, from assessment through operational handoff.",
          "Designed repeatable migration patterns (assessment, landing zone, 6R application move, operational handoff) that the delivery team reused across engagements.",
          "Built AWS infrastructure across EC2, VPC, RDS, IAM, and WAF; automated provisioning in CloudFormation and Terraform.",
          "Stood up customer CI/CD on CodePipeline, CodeBuild, and CodeDeploy, replacing manual release processes with repeatable pipelines.",
        ],
      },
    ],
  },
  {
    id: "accenture",
    company: "Accenture Federal Services",
    title: "Cloud Migration Architect",
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
    logo: "/images/companies/aws.webp",
    responsibilities: [
      "Supported Windows-focused AWS workloads across 15+ services including EC2, VPC, ASG, SSM, Directory Services, CloudEndure, WorkSpaces, ECS, ELB, EBS, S3, RDS, and AWS Backup.",
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
    logo: "/images/companies/unique-digital.webp",
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
    title: "Windows Administrator II",
    location: "San Antonio, TX",
    startDate: "January 2015",
    endDate: "April 2017",
    website: "https://www.rackspace.com",
    logo: "/images/companies/rackspace.webp",
    roles: [
      {
        title: "Windows Administrator II",
        startDate: "January 2016",
        endDate: "April 2017",
        responsibilities: [
          "Owned Windows Server workload lifecycle as a 24×7 managed-hosting engineer, covering bare-metal and Hyper-V / VMware ESXi VM deployment, configuration, and remediation.",
          "Authored PowerShell automation that collapsed common admin tasks from hours to minutes.",
          "Engaged customers on phone, chat, and ticket portal for high-severity incidents, often leading customer-side troubleshooting calls.",
        ],
      },
      {
        title: "Windows Administrator I",
        startDate: "January 2015",
        endDate: "January 2016",
        responsibilities: [
          "Ran patching, MSSQL updates, and Windows service-pack cycles across the managed fleet against Rackspace and customer SLAs.",
          "Configured Windows Roles and Features (Active Directory, MSSQL, Exchange, IIS, Terminal Server, DNS) per customer requirements.",
          "Performed system and file backups and recovery against customer-defined RPO / RTO targets.",
        ],
      },
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
    logo: "/images/companies/rk-homes.webp",
    responsibilities: [
      "Owned IT for 200+ employees across main office, satellite sites, and remote staff, covering Windows Active Directory, Terminal Server, FreeNAS storage, a 46-handset RingCentral VoIP rollout, and MDM for 39 company Android / iOS phones.",
      "Designed and deployed a full network refresh during a two-suite office remodel: 81 new data drops, two 48-port PoE switches, one 24-port switch, three WAPs, and a T1-to-fiber upgrade with Time Warner.",
      "Rolled out real-time GPS fleet tracking on 32 company vehicles via Network Fleet, replacing manual timekeeping and improving billable accuracy.",
      "Built an internal employee directory and calendar portal on FreeNAS + OwnCloud, replacing paper-based contact management across sites.",
      "Standardized employee onboarding / offboarding across IT systems, closing the HIPAA gap from ad-hoc account management.",
      "Authored video and PDF training materials covering staff systems, reducing the repeat 101-level support volume.",
    ],
  },
];
