export interface Certification {
  id: string;
  name: string;
  vendor: string;
  // proctored = exam-based cert (e.g. AWS SA Pro, Security+)
  // partner   = partner-program accreditation (e.g. VMware VSP, Red Hat sales)
  // training  = AWS Partner / AWS Knowledge training badge (completion, not exam)
  // other     = anything else (ICAgile, one-offs)
  type: "proctored" | "partner" | "training" | "other";
  issueDate: string;
  credlyUrl?: string;
  pdfUrl?: string;
  badgeImage?: string;
}

export const certifications: Certification[] = [
  // AWS Certifications (proctored)
  {
    id: "aws-sa-pro",
    name: "AWS Certified Solutions Architect – Professional",
    vendor: "Amazon Web Services (AWS)",
    type: "proctored",
    issueDate: "2022-01-07",
    credlyUrl: "https://www.credly.com/badges/256db1dd-b4e8-4a65-b2f8-125b36404850/public_url",
    badgeImage: "/images/certifications/aws-sa-pro.png",
  },
  {
    id: "aws-sa-associate",
    name: "AWS Certified Solutions Architect – Associate",
    vendor: "Amazon Web Services (AWS)",
    type: "proctored",
    issueDate: "2021-04-09",
    credlyUrl: "https://www.credly.com/badges/b8718d03-4596-4d8d-9b78-a5ae71a41be8/public_url",
    badgeImage: "/images/certifications/aws-sa-associate.png",
  },
  {
    id: "aws-sysops",
    name: "AWS Certified SysOps Administrator – Associate",
    vendor: "Amazon Web Services (AWS)",
    type: "proctored",
    issueDate: "2023-04-28",
    credlyUrl: "https://www.credly.com/badges/b7202153-940c-4379-bbcd-a08fecec6c04/public_url",
    badgeImage: "/images/certifications/aws-sysops.png",
  },

  // CompTIA
  {
    id: "comptia-security",
    name: "CompTIA Security+ ce Certification",
    vendor: "CompTIA",
    type: "proctored",
    issueDate: "2024-03-28",
    credlyUrl: "https://www.credly.com/badges/c04094f2-3033-4713-9fe2-2933009cff21/public_url",
    badgeImage: "/images/certifications/comptia-security.png",
  },

  // Dell EMC
  {
    id: "dell-poweredge-associate",
    name: "Associate – PowerEdge Version 1.0",
    vendor: "Dell EMC",
    type: "proctored",
    issueDate: "2018-08-16",
    credlyUrl: "https://www.credly.com/badges/d47d60c2-b59d-4711-9b9a-483e9ce95d87/public_url",
  },
  {
    id: "dell-poweredge-specialist",
    name: "Specialist – Implementation Engineer, PowerEdge Version 1.0",
    vendor: "Dell EMC",
    type: "proctored",
    issueDate: "2018-08-16",
    credlyUrl: "https://www.credly.com/badges/371ac0f9-7124-4b62-b393-ddae42de6d05/public_url",
  },

  // ICAgile
  {
    id: "icagile-icp",
    name: "ICP – ICAgile Certified Professional",
    vendor: "ICAgile",
    type: "other",
    issueDate: "2020-08",
    pdfUrl: "/legacy/wp-content/uploads/2020/08/ICP-ICAgile-Certified-Professional.pdf",
  },

  // Microsoft
  {
    id: "ms-mta",
    name: "Microsoft Technology Associate – Networking Fundamentals",
    vendor: "Microsoft",
    type: "proctored",
    issueDate: "2014-11-10",
    credlyUrl: "https://www.credly.com/badges/ae7c0094-92d6-43ab-85b5-303cba1cc680/public_url",
  },
  {
    id: "ms-excel",
    name: "Microsoft Excel 2003",
    vendor: "Microsoft",
    type: "proctored",
    issueDate: "2010",
  },
  {
    id: "ms-word",
    name: "Microsoft Word 2003",
    vendor: "Microsoft",
    type: "proctored",
    issueDate: "2010",
  },

  // Red Hat
  {
    id: "redhat-ansible",
    name: "Red Hat Sales Engineer Specialist – Automation",
    vendor: "Red Hat",
    type: "partner",
    issueDate: "2019-04",
    pdfUrl: "/legacy/wp-content/uploads/2019/04/RHEL-Ansible-Accredidation.pdf",
  },

  // VMware
  {
    id: "vmware-bc",
    name: "VSP – BC (Business Continuity) 5.8",
    vendor: "VMware",
    type: "partner",
    issueDate: "2018",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VSP-BC-5.8.pdf",
  },
  {
    id: "vmware-hci",
    name: "VSP – HCI (Hyper-converged Infrastructure) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VSP-HCI-2017.pdf",
  },
  {
    id: "vmware-ma",
    name: "VSP – MA (Management Automation) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VSP-MA-2017.pdf",
  },
  {
    id: "vmware-mo",
    name: "VSP – MO (Management Operations) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VSP-MO-2017.pdf",
  },
  {
    id: "vmware-nv",
    name: "VSP – NV (Network Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VSP-NV-2017.pdf",
  },
  {
    id: "vmware-sv",
    name: "VSP – SV (Server Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VSP-SV-2017.pdf",
  },
  {
    id: "vmware-vtsp-bc",
    name: "VTSP – BC (Business Continuity) 5.8",
    vendor: "VMware",
    type: "partner",
    issueDate: "2018",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VTSP-BC-5.8.pdf",
  },
  {
    id: "vmware-vtsp-hci",
    name: "VTSP – HCI (Hyper-converged Infrastructure) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VTSP-HCI-2017.pdf",
  },
  {
    id: "vmware-vtsp-nv",
    name: "VTSP – NV (Network Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VTSP-NV-2017.pdf",
  },
  {
    id: "vmware-vtsp-sv",
    name: "VTSP – SV (Server Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "/legacy/wp-content/uploads/2018/08/VTSP-SV-2017.pdf",
  },

  // AWS Partner / AWS Knowledge training badges — completion-based, shown in
  // their own compact grid rather than on the timeline. Ordered chronologically
  // so the resume grid reads newest-first when sorted.
  {
    id: "aws-partner-agentic-ai-sales",
    name: "AWS Partner: Agentic AI – Sales",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2026-01-06",
    credlyUrl: "https://www.credly.com/badges/f6e87b66-8c7e-4f65-a4b8-e332968f1d71/public_url",
    badgeImage: "/images/certifications/training/aws-partner-agentic-ai-sales.png",
  },
  {
    id: "aws-knowledge-serverless",
    name: "AWS Knowledge: Serverless",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-07-19",
    credlyUrl: "https://www.credly.com/badges/0853d8b9-9a07-467d-a539-f7442db0913d/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-serverless.png",
  },
  {
    id: "aws-partner-genai-essentials",
    name: "AWS Partner: Generative AI Essentials",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-07-19",
    credlyUrl: "https://www.credly.com/badges/c59e8f39-8a58-4b74-9133-aa51a0ecdc14/public_url",
    badgeImage: "/images/certifications/training/aws-partner-genai-essentials.png",
  },
  {
    id: "aws-knowledge-storage-core",
    name: "AWS Knowledge: Storage Core",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-16",
    credlyUrl: "https://www.credly.com/badges/2734254c-94a6-4d81-9451-6906506b8aa4/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-storage-core.png",
  },
  {
    id: "aws-knowledge-storage-technologist",
    name: "AWS Knowledge: Storage Technologist",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-16",
    credlyUrl: "https://www.credly.com/badges/3988608b-40f3-43ca-9021-57da7f34af8b/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-storage-technologist.png",
  },
  {
    id: "aws-partner-govcloud-essentials",
    name: "AWS Partner: AWS GovCloud (US) Essentials",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-16",
    credlyUrl: "https://www.credly.com/badges/13670aa9-af28-4486-a061-6ae7c3243746/public_url",
    badgeImage: "/images/certifications/training/aws-partner-govcloud-essentials.png",
  },
  {
    id: "aws-partner-cloud-economics",
    name: "AWS Partner: Cloud Economics Essentials",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-16",
    credlyUrl: "https://www.credly.com/badges/eb7708c6-558e-4ef7-87c8-966098ef6eaa/public_url",
    badgeImage: "/images/certifications/training/aws-partner-cloud-economics.png",
  },
  {
    id: "aws-partner-migration-sales",
    name: "AWS Partner: Migration Sales Essentials",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-16",
    credlyUrl: "https://www.credly.com/badges/df60367c-ad55-48d0-9471-fe19df45b584/public_url",
    badgeImage: "/images/certifications/training/aws-partner-migration-sales.png",
  },
  {
    id: "aws-partner-sales-accreditation",
    name: "AWS Partner: Sales Accreditation",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-16",
    credlyUrl: "https://www.credly.com/badges/f5cbb91e-3915-453e-8b40-e9670b58c75a/public_url",
    badgeImage: "/images/certifications/training/aws-partner-sales-accreditation.png",
  },
  {
    id: "aws-partner-technical-accredited",
    name: "AWS Partner: Technical Accredited",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-16",
    credlyUrl: "https://www.credly.com/badges/dacb5b02-a91e-480c-9b80-cfbf7b1b3530/public_url",
    badgeImage: "/images/certifications/training/aws-partner-technical-accredited.png",
  },
  {
    id: "aws-knowledge-architecting-retired",
    name: "AWS Knowledge: Architecting (Retired)",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-14",
    credlyUrl: "https://www.credly.com/badges/12192076-f38e-4d0c-874a-aa9af48fdd9c/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-architecting-retired.png",
  },
  {
    id: "aws-knowledge-block-storage",
    name: "AWS Knowledge: Block Storage",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-14",
    credlyUrl: "https://www.credly.com/badges/5e101138-08b1-400a-87af-ce92f19b0fab/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-block-storage.png",
  },
  {
    id: "aws-knowledge-data-protection-dr",
    name: "AWS Knowledge: Data Protection & Disaster Recovery",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-14",
    credlyUrl: "https://www.credly.com/badges/c506d517-008b-4355-aa3b-009e50ef91c6/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-data-protection-dr.png",
  },
  {
    id: "aws-knowledge-file-storage",
    name: "AWS Knowledge: File Storage",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-14",
    credlyUrl: "https://www.credly.com/badges/3f7dbcfa-5f05-4f9e-bbdb-aa19f16c4ac7/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-file-storage.png",
  },
  {
    id: "aws-knowledge-object-storage",
    name: "AWS Knowledge: Object Storage",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-14",
    credlyUrl: "https://www.credly.com/badges/95abf37a-0af1-4f71-9ef2-9357b126e2b7/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-object-storage.png",
  },
  {
    id: "aws-knowledge-data-migration",
    name: "AWS Knowledge: Data Migration",
    vendor: "Amazon Web Services (AWS)",
    type: "training",
    issueDate: "2023-02-13",
    credlyUrl: "https://www.credly.com/badges/57488f8b-4bd6-4e45-abf4-a1a72a0efb7d/public_url",
    badgeImage: "/images/certifications/training/aws-knowledge-data-migration.png",
  },
];

// Group certifications by vendor
export const certificationsByVendor = certifications.reduce((acc, cert) => {
  if (!acc[cert.vendor]) {
    acc[cert.vendor] = [];
  }
  acc[cert.vendor].push(cert);
  return acc;
}, {} as Record<string, Certification[]>);

// Get unique vendors in order of importance
export const vendors = [
  "Amazon Web Services (AWS)",
  "CompTIA",
  "Dell EMC",
  "ICAgile",
  "Microsoft",
  "Red Hat",
  "VMware",
];
