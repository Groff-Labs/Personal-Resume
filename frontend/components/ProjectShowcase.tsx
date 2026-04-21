"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Github, ExternalLink, Archive } from "lucide-react";

const COMPARISON = [
  {
    aspect: "Monthly cost",
    wp: "BlueHost unlimited plan (shared across ~30 sites)",
    aws: "Pennies per month (this site alone; actual numbers pending a few weeks of traffic)",
  },
  { aspect: "First-load time", wp: "3 to 4 s", aws: "< 1 s" },
  {
    aspect: "Security posture",
    wp: "Theme + plugin patch treadmill",
    aws: "Zero server; signed OAC; managed TLS",
  },
  { aspect: "Update workflow", wp: "FTP or wp-admin clickops", aws: "git push; Actions handles the rest" },
  { aspect: "Infra definition", wp: "None (clickops)", aws: "AWS CDK in TypeScript" },
];

const TRADEOFFS = [
  "CloudFlare for DNS instead of Route 53; keeps this project single-account and lets me skip cross-account delegation. Trade-off: ACM validation needs a manual CNAME.",
  "No WAF; saves ~$5/mo and a portfolio site doesn't warrant managed-rules cost.",
  "OAC, not OAI; AWS's 2023+ recommended pattern for signed S3-origin access.",
  "Static export, not SSR; zero servers and no per-request logic. Fits a resume, not a SaaS.",
];

function ArchitectureDiagram() {
  return (
    <div className="relative w-full aspect-[1500/810] bg-white rounded-md overflow-hidden">
      <Image
        src="/images/diagrams/cv_infra_diagram.png"
        alt="Architecture diagram: Git push to GitHub triggers GitHub Actions, which assumes an IAM OIDC role to deploy infrastructure (CloudFront, ACM, OAC, S3) via CDK and sync site content to S3. Site visitors reach the site via CloudFlare (CNAME) → CloudFront (TLS via ACM) → OAC → S3."
        fill
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="object-contain"
        priority={false}
      />
    </div>
  );
}

export default function ProjectShowcase() {
  return (
    <section id="project" className="section-container bg-surface-1">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto"
      >
        <div className="text-center mb-12">
          <p className="eyebrow mb-3">About this site</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink mb-4">
            WordPress → Next.js on AWS
          </h2>
          <p className="text-lg text-ink-muted max-w-2xl mx-auto">
            The previous version of this site was a 2015-era WordPress install on
            The7 theme. This rewrite is its opposite: no server, no plugins, no
            database. Infrastructure is code. Deploys are a <code className="font-mono text-sm">git push</code>.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="card mb-10">
          <ArchitectureDiagram />
        </div>

        {/* Comparison table */}
        <div className="card overflow-hidden p-0 mb-8">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-ink-muted">
                  Aspect
                </th>
                <th className="px-5 py-3 text-left font-semibold text-ink-muted">
                  WordPress (old)
                </th>
                <th className="px-5 py-3 text-left font-semibold text-accent">
                  Next.js + AWS (new)
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.aspect} className={i % 2 === 0 ? "" : "bg-surface-1"}>
                  <td className="px-5 py-3 font-medium text-ink">{row.aspect}</td>
                  <td className="px-5 py-3 text-ink-muted">{row.wp}</td>
                  <td className="px-5 py-3 text-ink">{row.aws}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trade-offs */}
        <div className="card mb-8">
          <h3 className="font-semibold text-ink mb-4">Design trade-offs</h3>
          <ul className="space-y-3 text-sm text-ink-muted">
            {TRADEOFFS.map((line) => (
              <li key={line} className="flex gap-3 leading-relaxed">
                <span className="text-accent shrink-0 select-none">▸</span>
                <span className="italic">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://github.com/Groff-Labs/Personal-Resume"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-surface-0 rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            <Github className="w-4 h-4" />
            View source on GitHub
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
          <a
            href="/legacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-line text-ink rounded-md font-medium hover:border-accent hover:text-accent transition-colors"
          >
            <Archive className="w-4 h-4" />
            View the 2015 WordPress archive
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
        <p className="text-center text-xs text-ink-subtle italic mt-4 max-w-xl mx-auto">
          The original site is preserved as a read-only static snapshot at
          <code className="font-mono text-[11px] mx-1">/legacy/</code>
          for posterity; same domain, same bucket, no WordPress runtime involved.
        </p>
      </motion.div>
    </section>
  );
}
