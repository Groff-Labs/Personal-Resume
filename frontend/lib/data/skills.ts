// Skills & tech matrix — sourced from actual responsibilities in jobs.ts.
// Edit freely; every chip should map to something you've shipped or are actively using.

export interface SkillGroup {
  category: string;
  // Short descriptor under the category title.
  summary: string;
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    category: "AWS",
    summary: "Primary cloud. Daily driver.",
    items: [
      "Lambda",
      "API Gateway",
      "S3",
      "CloudFront",
      "DynamoDB",
      "EventBridge",
      "SQS / SNS",
      "Step Functions",
      "CloudWatch",
      "Cost Explorer",
      "Trusted Advisor",
      "IAM",
      "Route 53",
      "ACM",
      "WAF",
      "VPC",
      "EC2",
      "ECS / Fargate",
    ],
  },
  {
    category: "Infrastructure as Code",
    summary: "Everything deployable via pull request.",
    items: ["AWS CDK (TypeScript)", "SST", "Pulumi", "Terraform", "CloudFormation"],
  },
  {
    category: "Languages",
    summary: "Write, review, and refactor comfortably.",
    items: ["TypeScript", "Python", "Bash", "PowerShell"],
  },
  {
    category: "Patterns & Practices",
    summary: "How I like to build.",
    items: [
      "Serverless-first",
      "Event-driven",
      "API design",
      "Streaming",
      "Microservices",
      "Blue/green deploys",
      "CI/CD automation",
      "GitOps",
      "Well-Architected Framework",
      "Disaster Recovery",
      "Cost optimization",
    ],
  },
  {
    category: "Specializations",
    summary: "Industries and focus areas I've spent real time in.",
    items: [
      "On Prem -> Cloud migrations",
      "Cloud-> Cloud migrations",
      "Platform / app modernization",
      "Greenfield cloud deployments",
      "Hybrid: AWS, Azure, on-prem",
      "DoD / Federal (IL4, FedRAMP)",
      "Generative AI integration",
      "Security posture reviews",
    ],
  },
  {
    category: "CI/CD & GitOps",
    summary: "Pipelines that ship; declarative delivery into Kubernetes.",
    items: [
      "GitHub Actions",
      "GitLab CI",
      "CircleCI",
      "ArgoCD",
      "FluxCD",
      "Helm",
      "Kustomize",
    ],
  },
  {
    category: "Monitoring & Observability",
    summary: "Knowing what production is doing right now.",
    items: ["CloudWatch", "Datadog", "New Relic", "Prometheus", "Grafana"],
  },
  {
    category: "Configuration Management",
    summary: "Server-side state, agent-driven.",
    items: ["Ansible", "Chef", "Puppet"],
  },
  {
    category: "Platforms & Tools",
    summary: "OS, virtualization, and adjacent tools I reach for often.",
    items: [
      "Linux",
      "Windows Server",
      "VMware",
      "Hyper-V",
      "KVM",
      "Docker",
      "Kubernetes",
      "Git / GitHub",
      "CloudFlare",
    ],
  },
];
