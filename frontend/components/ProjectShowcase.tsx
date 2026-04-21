"use client";

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

// Colors are hard-coded as hex but sampled from our tokens so the diagram reads in both themes.
const NODE_FILL = "rgb(var(--surface-0))";
const NODE_STROKE = "rgb(var(--line))";
const CONNECT_STROKE = "rgb(var(--ink-subtle))";

function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 900 470"
      className="w-full h-auto"
      role="img"
      aria-label="Architecture: User → CloudFlare DNS → CloudFront (OAC) → S3. GitHub Actions deploys via OIDC. ACM issues the TLS cert."
      fontFamily="var(--font-inter), system-ui, sans-serif"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={CONNECT_STROKE} />
        </marker>
      </defs>

      {/* ── User (left) */}
      <g>
        <circle cx="60" cy="230" r="28" fill="#0891b2" />
        <text x="60" y="236" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="600">
          👤
        </text>
        <text x="60" y="284" textAnchor="middle" fill="rgb(var(--ink))" fontSize="13" fontWeight="500">
          Visitor
        </text>
      </g>

      {/* ── CloudFlare DNS */}
      <g>
        <rect x="170" y="190" width="170" height="80" rx="8" fill={NODE_FILL} stroke="#f38020" strokeWidth="2" />
        <text x="255" y="216" textAnchor="middle" fill="rgb(var(--ink))" fontSize="14" fontWeight="700">
          CloudFlare
        </text>
        <text x="255" y="236" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="12">
          DNS · no proxy
        </text>
        <text x="255" y="254" textAnchor="middle" fill="rgb(var(--ink-subtle))" fontSize="11" fontFamily="var(--font-mono)">
          cv.michaelgroff.info
        </text>
      </g>

      {/* ── CloudFront */}
      <g>
        <rect x="400" y="190" width="170" height="80" rx="8" fill={NODE_FILL} stroke="#0891b2" strokeWidth="2" />
        <text x="485" y="216" textAnchor="middle" fill="rgb(var(--ink))" fontSize="14" fontWeight="700">
          CloudFront
        </text>
        <text x="485" y="236" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="12">
          edge CDN · OAC
        </text>
        <text x="485" y="254" textAnchor="middle" fill="rgb(var(--ink-subtle))" fontSize="11">
          redirect-to-https
        </text>
      </g>

      {/* ── S3 */}
      <g>
        <rect x="630" y="190" width="170" height="80" rx="8" fill={NODE_FILL} stroke="#0d9488" strokeWidth="2" />
        <text x="715" y="216" textAnchor="middle" fill="rgb(var(--ink))" fontSize="14" fontWeight="700">
          S3 (private)
        </text>
        <text x="715" y="236" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="12">
          static export
        </text>
        <text x="715" y="254" textAnchor="middle" fill="rgb(var(--ink-subtle))" fontSize="11" fontFamily="var(--font-mono)">
          cv-michaelgroff-dev
        </text>
      </g>

      {/* ── ACM (top) */}
      <g>
        <rect x="400" y="60" width="170" height="60" rx="8" fill={NODE_FILL} stroke={NODE_STROKE} strokeWidth="1" strokeDasharray="4 4" />
        <text x="485" y="86" textAnchor="middle" fill="rgb(var(--ink))" fontSize="13" fontWeight="600">
          ACM Certificate
        </text>
        <text x="485" y="104" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="11">
          DNS-validated · us-east-1
        </text>
      </g>

      {/* ── GitHub Actions (bottom) */}
      <g>
        <rect x="310" y="360" width="340" height="70" rx="8" fill={NODE_FILL} stroke={NODE_STROKE} strokeWidth="1" />
        <text x="480" y="388" textAnchor="middle" fill="rgb(var(--ink))" fontSize="13" fontWeight="600">
          GitHub Actions · OIDC · CDK
        </text>
        <text x="480" y="408" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="11">
          build · cdk deploy · s3 sync · invalidate
        </text>
      </g>

      {/* ── Connections */}
      {/* User → CloudFlare */}
      <line x1="92" y1="230" x2="168" y2="230" stroke={CONNECT_STROKE} strokeWidth="1.5" markerEnd="url(#arrow)" />
      <text x="130" y="220" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="10" fontFamily="var(--font-mono)">
        HTTPS
      </text>

      {/* CloudFlare → CloudFront (CNAME) */}
      <line x1="342" y1="230" x2="398" y2="230" stroke={CONNECT_STROKE} strokeWidth="1.5" markerEnd="url(#arrow)" />
      <text x="370" y="220" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="10" fontFamily="var(--font-mono)">
        CNAME
      </text>

      {/* CloudFront → S3 (signed origin via OAC) */}
      <line x1="572" y1="230" x2="628" y2="230" stroke={CONNECT_STROKE} strokeWidth="1.5" markerEnd="url(#arrow)" />
      <text x="600" y="220" textAnchor="middle" fill="rgb(var(--ink-muted))" fontSize="10" fontFamily="var(--font-mono)">
        SigV4
      </text>

      {/* ACM → CloudFront */}
      <line x1="485" y1="122" x2="485" y2="188" stroke={CONNECT_STROKE} strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrow)" />
      <text x="508" y="160" fill="rgb(var(--ink-muted))" fontSize="10" fontFamily="var(--font-mono)">
        TLS
      </text>

      {/* GH Actions → S3 (deploy content) */}
      <path d="M 650,395 C 730,395 760,340 715,272" fill="none" stroke={CONNECT_STROKE} strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrow)" />
      <text x="760" y="340" fill="rgb(var(--ink-muted))" fontSize="10" fontFamily="var(--font-mono)">
        sync
      </text>

      {/* GH Actions → CloudFront (invalidate) */}
      <path d="M 310,395 C 230,395 210,340 400,260" fill="none" stroke={CONNECT_STROKE} strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#arrow)" />
      <text x="218" y="340" fill="rgb(var(--ink-muted))" fontSize="10" fontFamily="var(--font-mono)">
        invalidate
      </text>
    </svg>
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
