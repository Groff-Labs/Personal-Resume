"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, Radio } from "lucide-react";
import { jobs } from "@/lib/data/jobs";
import { certifications } from "@/lib/data/certifications";

const FEATURED_AWS_CERT_IDS = ["aws-sa-pro", "aws-sa-associate", "aws-sysops"] as const;
const BADGE_SRC: Record<string, string> = {
  "aws-sa-pro": "/images/certifications/aws-sa-pro-credly.png",
  "aws-sa-associate": "/images/certifications/aws-sa-associate-credly.png",
  "aws-sysops": "/images/certifications/aws-sysops-credly.png",
};
const BADGE_SHORT: Record<string, string> = {
  "aws-sa-pro": "SA · Professional",
  "aws-sa-associate": "SA · Associate",
  "aws-sysops": "SysOps · Associate",
};

export default function Hero() {
  const current = jobs[0];
  const featured = FEATURED_AWS_CERT_IDS.map((id) =>
    certifications.find((c) => c.id === id),
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <section
      id="home"
      className="relative bg-surface-0 border-b border-line"
    >
      <div className="section-container grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-center pt-24 md:pt-28 lg:pt-32 lg:min-h-[80vh]">
        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 md:order-1"
        >
          <p className="eyebrow mb-5">AWS Solutions Architect · San Antonio, TX</p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ink leading-[1.05] mb-5">
            Michael Groff
          </h1>

          <p className="text-lg md:text-xl text-ink-muted max-w-xl mb-8 leading-relaxed">
            Building serverless, scalable, cost-optimized platforms on AWS for
            SMB to enterprise; serverless-first, IaC everything, security by
            default.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <a
              href="#experience"
              className="inline-flex items-center px-6 py-3 bg-accent text-white rounded-md font-medium hover:bg-accent-dark transition-colors"
            >
              View Experience
            </a>
            <a
              href="https://www.linkedin.com/in/michael-groff-8b367489"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-line text-ink rounded-md font-medium hover:border-accent hover:text-accent transition-colors"
            >
              Connect on LinkedIn
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Featured AWS cert badges */}
          <div className="flex flex-wrap items-center gap-5 mb-8">
            {featured.map((cert) => (
              <a
                key={cert.id}
                href={cert.credlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md p-1"
                title={cert.name}
              >
                <Image
                  src={BADGE_SRC[cert.id]}
                  alt={cert.name}
                  width={56}
                  height={56}
                  className="shrink-0 transition-transform group-hover:scale-105"
                />
                <div className="leading-tight">
                  <div className="font-mono text-[11px] tracking-wider uppercase text-ink-subtle">
                    AWS Certified
                  </div>
                  <div className="text-sm font-medium text-ink group-hover:text-accent transition-colors">
                    {BADGE_SHORT[cert.id]}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Current role strip */}
          <p className="text-sm text-ink-muted border-l-2 border-accent pl-4">
            Currently <span className="font-semibold text-ink">{current.title}</span> @{" "}
            <span className="font-semibold text-ink">{current.company}</span>
            <span className="mx-2 text-ink-subtle">·</span>
            <span>12+ yrs cloud &amp; hybrid infrastructure</span>
          </p>
        </motion.div>

        {/* Right column — headshot + open-to signal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="order-1 md:order-2 flex flex-col items-center md:items-end gap-4"
        >
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-full md:max-w-sm md:aspect-square">
            {/* Gradient ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent to-secondary p-[3px]">
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface-1">
                <Image
                  src="/images/profile/michael-groff.jpg"
                  alt="Michael Groff"
                  fill
                  priority
                  sizes="(max-width: 768px) 16rem, 24rem"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Open-to signal */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-accent/30 bg-accent/5 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <Radio className="w-3.5 h-3.5 text-accent" />
            <span className="text-ink-muted">
              Happy at <span className="font-semibold text-ink">AllCloud</span>;
              interesting conversations welcome.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
