"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, Archive, X } from "lucide-react";
import { Github } from "@/components/BrandIcons";
import {
  archiveNoteParts,
  architecture,
  comparison,
  sourceUrl,
  summaryParts,
  tradeoffs,
} from "@/lib/data/project";

// Content lives in `lib/data/project.ts` so the chat assistant can read it:
// `corpus.ts` imports data modules and cannot import React, so while these were
// consts in this file the whole section was invisible to the assistant. "How is
// this site built" and "why no WAF" had nothing to retrieve, which is the worst
// possible gap in the one section whose purpose is demonstrating the work.
const COMPARISON = comparison;
const TRADEOFFS = tradeoffs;
const DIAGRAM_ALT = architecture;

function ArchitectureDiagram({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Enlarge architecture diagram"
      className="relative w-full aspect-[1500/810] bg-white rounded-md overflow-hidden block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Image
        src="/images/diagrams/cv_infra_diagram.png"
        alt={DIAGRAM_ALT}
        fill
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="object-contain"
        priority={false}
      />
    </button>
  );
}

export default function ProjectShowcase() {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

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
            {summaryParts.lead}
            <code className="font-mono text-sm">{summaryParts.code}</code>
            {summaryParts.tail}
          </p>
        </div>

        {/* Architecture diagram (click to enlarge) */}
        <div className="card mb-10">
          <ArchitectureDiagram onOpen={() => setLightboxOpen(true)} />
        </div>

        {/* Comparison table */}
        <div className="card overflow-hidden p-0 mb-8">
          {/*
            This scroll wrapper is load-bearing, and the obvious simplification
            breaks it. The card keeps `overflow-hidden` so the table's square
            corners do not poke through its rounded ones; that clips rather than
            scrolls, so at 320px the table measured 329px inside a 286px card
            with no scrollable ancestor, and the "Next.js + AWS (new)" column —
            the entire point of a before/after comparison — was cut off by 26px
            and unreachable. Moving `overflow-x-auto` up onto the card instead
            of using this wrapper re-breaks the corners.

            `tabIndex={0}` because a scroll container is not keyboard-reachable
            without it, which would leave the clipped column unreachable for
            anyone not using a touchscreen or a trackpad.
          */}
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="WordPress and Next.js on AWS compared, scrolls horizontally on narrow screens"
            tabIndex={0}
          >
            <table className="w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  {/* Tighter cells below md so the table more often fits with
                      no scrolling at all, and the Aspect labels stay on one
                      line while the two comparison columns wrap. */}
                  <th className="px-3 py-3 md:px-5 text-left font-semibold text-ink-muted whitespace-nowrap">
                    Aspect
                  </th>
                  <th className="px-3 py-3 md:px-5 text-left font-semibold text-ink-muted">
                    WordPress (old)
                  </th>
                  <th className="px-3 py-3 md:px-5 text-left font-semibold text-accent">
                    Next.js + AWS (new)
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.aspect} className={i % 2 === 0 ? "" : "bg-surface-1"}>
                    <td className="px-3 py-3 md:px-5 font-medium text-ink whitespace-nowrap">
                      {row.aspect}
                    </td>
                    <td className="px-3 py-3 md:px-5 text-ink-muted">{row.wp}</td>
                    <td className="px-3 py-3 md:px-5 text-ink">{row.aws}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            href={sourceUrl}
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
          {archiveNoteParts.lead}
          <code className="font-mono text-[11px] mx-1">{archiveNoteParts.code}</code>
          {archiveNoteParts.tail}
        </p>
      </motion.div>

      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Architecture diagram"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative cursor-default"
          >
            <Image
              src="/images/diagrams/cv_infra_diagram.png"
              alt={DIAGRAM_ALT}
              width={1500}
              height={810}
              sizes="95vw"
              className="w-[min(95vw,1500px)] max-h-[90vh] h-auto rounded-md shadow-2xl bg-white"
              priority
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-surface-0 text-ink shadow-lg flex items-center justify-center hover:bg-surface-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
