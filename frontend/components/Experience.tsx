"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, MapPin } from "lucide-react";
import { jobs } from "@/lib/data/jobs";

// Extract start year from strings like "May 2024" or "Present"
function startYear(date: string): string {
  const m = date.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : date;
}

export default function Experience() {
  const [expandedJob, setExpandedJob] = useState<string>("allcloud");

  return (
    <section id="experience" className="section-container bg-surface-1">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">Experience</h2>

        {/* Timeline rail container */}
        <div className="max-w-4xl mx-auto relative pl-[72px] md:pl-[96px]">
          {/* Vertical rail */}
          <div
            aria-hidden
            className="absolute left-[60px] md:left-[80px] top-3 bottom-3 w-px bg-line"
          />

          <div className="space-y-4">
            {jobs.map((job, index) => {
              const isOpen = expandedJob === job.id;
              const year = startYear(job.startDate);
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* Year label in the gutter */}
                  <span
                    aria-hidden
                    className={`absolute -left-[72px] md:-left-[96px] top-[18px] w-[48px] md:w-[64px] text-right font-mono text-xs tracking-wider ${
                      isOpen ? "text-accent font-semibold" : "text-ink-subtle"
                    }`}
                  >
                    {year}
                  </span>

                  {/* Rail dot */}
                  <span
                    aria-hidden
                    className={`absolute -left-[17px] md:-left-[21px] top-5 w-3 h-3 rounded-full border-2 border-surface-1 transition-colors ${
                      isOpen ? "bg-accent" : "bg-line"
                    }`}
                  />

                  <div className="card p-0 overflow-hidden">
                    {/* Collapsed header (always visible) */}
                    <button
                      type="button"
                      onClick={() => setExpandedJob(isOpen ? "" : job.id)}
                      className="w-full text-left flex items-center gap-4 p-5 group"
                      aria-expanded={isOpen}
                    >
                      {/* Logo */}
                      <div
                        className="relative w-10 h-10 shrink-0 rounded-md border border-line overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: job.logoBg ?? "#ffffff" }}
                      >
                        {job.logo && (
                          <Image
                            src={job.logo}
                            alt={`${job.company} logo`}
                            fill
                            sizes="40px"
                            className="object-contain p-1"
                          />
                        )}
                      </div>

                      {/* Meta — stacked on sm, inline on md+ */}
                      <div className="flex-1 min-w-0 md:grid md:grid-cols-[1.5fr_1.6fr_1fr] md:items-center md:gap-4">
                        <div className="font-semibold text-ink group-hover:text-accent transition-colors truncate">
                          {job.company}
                        </div>
                        <div className="text-sm text-accent md:truncate">
                          {job.title}
                        </div>
                        <div className="font-mono text-xs text-ink-subtle md:text-right">
                          {job.startDate} – {job.endDate}
                        </div>
                      </div>

                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-ink-subtle shrink-0"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </button>

                    {/* Expanded body */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden border-t border-line"
                        >
                          <div className="grid md:grid-cols-[minmax(0,1fr)_2fr] gap-6 md:gap-8 p-5 md:p-6">
                            {/* Left: meta */}
                            <div className="space-y-3 text-sm">
                              {job.logo && (
                                <div
                                  className="relative w-full aspect-[3/2] max-w-[180px] border border-line rounded-md overflow-hidden"
                                  style={{ backgroundColor: job.logoBg ?? "#ffffff" }}
                                >
                                  <Image
                                    src={job.logo}
                                    alt={`${job.company} logo`}
                                    fill
                                    sizes="180px"
                                    className="object-contain p-3"
                                  />
                                </div>
                              )}
                              {job.location && (
                                <div className="flex items-start gap-2 text-ink-muted">
                                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                  <span>{job.location}</span>
                                </div>
                              )}
                              {job.website && (
                                <a
                                  href={job.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-accent hover:text-accent-light break-all"
                                >
                                  {job.website.replace(/^https?:\/\//, "")}
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                </a>
                              )}
                              <div className="font-mono text-xs text-ink-subtle pt-2 border-t border-line">
                                {job.startDate} – {job.endDate}
                              </div>
                            </div>

                            {/* Right: responsibilities */}
                            <div>
                              <ul className="space-y-2.5">
                                {job.responsibilities.map((r, i) => (
                                  <li key={i} className="flex gap-3 text-ink-muted leading-relaxed">
                                    <span className="text-accent mt-1 shrink-0 select-none">
                                      ▸
                                    </span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer strip */}
        <div className="text-center max-w-3xl mx-auto mt-10 space-y-1 text-sm">
          <p className="text-ink-muted">
            See the{" "}
            <a
              href="/blog/"
              className="text-accent hover:text-accent-light font-medium"
            >
              blog archive
            </a>{" "}
            for technology write-ups from 2015–2020 (read-only).
          </p>
          <p className="text-ink-subtle text-xs">
            Letters of recommendation and contact information for all previous
            employers available upon request.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
