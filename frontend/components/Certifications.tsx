"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { certifications } from "@/lib/data/certifications";
import CertTimeline from "./CertTimeline";

const FEATURED = [
  {
    id: "aws-sa-pro",
    badge: "/images/certifications/aws-sa-pro-credly.png",
    label: "Solutions Architect – Professional",
  },
  {
    id: "aws-sa-associate",
    badge: "/images/certifications/aws-sa-associate-credly.png",
    label: "Solutions Architect – Associate",
  },
  {
    id: "aws-sysops",
    badge: "/images/certifications/aws-sysops-credly.png",
    label: "SysOps Administrator – Associate",
  },
] as const;

export default function Certifications() {
  return (
    <section id="certifications" className="section-container bg-surface-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">Certifications</h2>

        <div className="max-w-6xl mx-auto">
          {/* Featured AWS row */}
          <div className="mb-16">
            <p className="eyebrow text-center mb-8">AWS · Proctored</p>
            <div className="grid md:grid-cols-3 gap-6">
              {FEATURED.map((f, i) => {
                const cert = certifications.find((c) => c.id === f.id);
                if (!cert) return null;
                return (
                  <motion.a
                    key={f.id}
                    href={cert.credlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    viewport={{ once: true }}
                    className="card flex flex-col items-center text-center group hover:border-accent transition-all"
                  >
                    <div className="relative w-32 h-32 mb-4">
                      <Image
                        src={f.badge}
                        alt={cert.name}
                        fill
                        sizes="128px"
                        className="object-contain transition-transform group-hover:scale-105"
                      />
                    </div>
                    <h3 className="font-semibold text-ink mb-1 leading-tight">
                      {f.label}
                    </h3>
                    <div className="font-mono text-xs text-ink-subtle mb-3">
                      Earned {cert.issueDate}
                    </div>
                    <div className="inline-flex items-center gap-1 text-sm text-accent group-hover:text-accent-light">
                      Verify on Credly
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Chronographic timeline */}
          <div>
            <p className="eyebrow text-center mb-8">
              Full history · filter by vendor
            </p>
            <CertTimeline />
          </div>

          {/* Full Credly profile link */}
          <div className="text-center mt-12">
            <a
              href="https://www.credly.com/users/michael-groff.1872e705/badges#credly"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-line text-ink rounded-md font-medium hover:border-accent hover:text-accent transition-colors"
            >
              See full Credly profile
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>

          <p className="text-sm text-ink-subtle italic text-center mt-6 max-w-2xl mx-auto">
            Spans Dell / VMware partner enablement in 2017 through current AWS
            proctored exams and AWS training badges. Click any dot to verify on
            Credly.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
