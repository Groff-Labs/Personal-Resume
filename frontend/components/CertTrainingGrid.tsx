"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { certifications } from "@/lib/data/certifications";

// YYYY or YYYY-MM → "Mon YYYY" / "YYYY"
function formatIssueDate(issueDate: string): string {
  const [y, m] = issueDate.split("-");
  if (!m) return y;
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", {
    month: "short",
  });
  return `${label} ${y}`;
}

export default function CertTrainingGrid() {
  const training = certifications
    .filter((c) => c.type === "training")
    .slice()
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  if (training.length === 0) return null;

  return (
    <div>
      <p className="eyebrow text-center mb-2">
        Training &amp; micro-credentials
      </p>
      <p className="text-center text-xs text-ink-subtle mb-6 max-w-xl mx-auto">
        AWS Partner and AWS Knowledge badges. Completion-based, not proctored —
        included for completeness.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {training.map((cert, i) => (
          <motion.a
            key={cert.id}
            href={cert.credlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: (i % 6) * 0.04 }}
            viewport={{ once: true }}
            className="group flex items-start gap-3 p-3 rounded-md border border-line bg-surface-1 hover:border-accent hover:bg-surface-0 transition-colors"
          >
            {cert.badgeImage ? (
              <div className="relative w-11 h-11 shrink-0">
                <Image
                  src={cert.badgeImage}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-contain"
                />
              </div>
            ) : (
              <span
                aria-hidden
                className="mt-1 w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: "#FF9900" }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink leading-snug group-hover:text-accent transition-colors">
                {cert.name}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-subtle">
                <span className="font-mono">{formatIssueDate(cert.issueDate)}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 text-accent opacity-80 group-hover:opacity-100">
                  Verify <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
