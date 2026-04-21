export interface Certification {
  id: string;
  name: string;
  vendor: string;
  type: "proctored" | "partner" | "other";
  issueDate: string;
  credlyUrl?: string;
  pdfUrl?: string;
  badgeImage?: string;
}

export const certifications: Certification[] = [
  // AWS Certifications
  {
    id: "aws-sa-pro",
    name: "AWS Certified Solutions Architect – Professional",
    vendor: "Amazon Web Services (AWS)",
    type: "proctored",
    issueDate: "2023-04",
    credlyUrl: "https://www.credly.com/earner/earned/badge/256db1dd-b4e8-4a65-b2f8-125b36404850",
    badgeImage: "/images/certifications/aws-sa-pro.png",
  },
  {
    id: "aws-sa-associate",
    name: "AWS Certified Solutions Architect – Associate",
    vendor: "Amazon Web Services (AWS)",
    type: "proctored",
    issueDate: "2023-04",
    credlyUrl: "https://www.credly.com/badges/688b2432-1e30-4798-9257-4bf724f75b46/public_url",
    badgeImage: "/images/certifications/aws-sa-associate.png",
  },
  {
    id: "aws-sysops",
    name: "AWS Certified SysOps Administrator – Associate",
    vendor: "Amazon Web Services (AWS)",
    type: "proctored",
    issueDate: "2023-04",
    credlyUrl: "https://www.credly.com/badges/b7202153-940c-4379-bbcd-a08fecec6c04/public_url",
    badgeImage: "/images/certifications/aws-sysops.png",
  },

  // CompTIA
  {
    id: "comptia-security",
    name: "CompTIA Security+",
    vendor: "CompTIA",
    type: "proctored",
    issueDate: "2024-04",
    credlyUrl: "https://www.credly.com/badges/fe6998a4-6ade-48b7-afd8-44e2e127e447",
    badgeImage: "/images/certifications/comptia-security.png",
  },

  // Dell EMC
  {
    id: "dell-poweredge-associate",
    name: "Associate – PowerEdge Version 1.0",
    vendor: "Dell EMC",
    type: "proctored",
    issueDate: "2018-08",
    credlyUrl: "https://www.credly.com/earner/earned/badge/d47d60c2-b59d-4711-9b9a-483e9ce95d87",
  },
  {
    id: "dell-poweredge-specialist",
    name: "Specialist – Implementation Engineer, PowerEdge Version 1.0",
    vendor: "Dell EMC",
    type: "proctored",
    issueDate: "2018-08",
    credlyUrl: "https://www.credly.com/earner/earned/badge/371ac0f9-7124-4b62-b393-ddae42de6d05",
  },

  // ICAgile
  {
    id: "icagile-icp",
    name: "ICP – ICAgile Certified Professional",
    vendor: "ICAgile",
    type: "other",
    issueDate: "2020-08",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2020/08/ICP-ICAgile-Certified-Professional.pdf",
  },

  // Microsoft
  {
    id: "ms-mta",
    name: "Microsoft Technology Associate – Networking Fundamentals (98-366)",
    vendor: "Microsoft",
    type: "proctored",
    issueDate: "2017",
    credlyUrl: "https://www.youracclaim.com/badges/2e6dfa3c-d011-4903-9b6c-0b8a37228d8d",
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
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2019/04/RHEL-Ansible-Accredidation.pdf",
  },

  // VMware
  {
    id: "vmware-bc",
    name: "VSP – BC (Business Continuity) 5.8",
    vendor: "VMware",
    type: "partner",
    issueDate: "2018",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VSP-BC-5.8.pdf",
  },
  {
    id: "vmware-hci",
    name: "VSP – HCI (Hyper-converged Infrastructure) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VSP-HCI-2017.pdf",
  },
  {
    id: "vmware-ma",
    name: "VSP – MA (Management Automation) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VSP-MA-2017.pdf",
  },
  {
    id: "vmware-mo",
    name: "VSP – MO (Management Operations) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VSP-MO-2017.pdf",
  },
  {
    id: "vmware-nv",
    name: "VSP – NV (Network Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VSP-NV-2017.pdf",
  },
  {
    id: "vmware-sv",
    name: "VSP – SV (Server Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VSP-SV-2017.pdf",
  },
  {
    id: "vmware-vtsp-bc",
    name: "VTSP – BC (Business Continuity) 5.8",
    vendor: "VMware",
    type: "partner",
    issueDate: "2018",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VTSP-BC-5.8.pdf",
  },
  {
    id: "vmware-vtsp-hci",
    name: "VTSP – HCI (Hyper-converged Infrastructure) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VTSP-HCI-2017.pdf",
  },
  {
    id: "vmware-vtsp-nv",
    name: "VTSP – NV (Network Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VTSP-NV-2017.pdf",
  },
  {
    id: "vmware-vtsp-sv",
    name: "VTSP – SV (Server Virtualization) 2017",
    vendor: "VMware",
    type: "partner",
    issueDate: "2017",
    pdfUrl: "https://cv.michaelgroff.info/wp-content/uploads/2018/08/VTSP-SV-2017.pdf",
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
