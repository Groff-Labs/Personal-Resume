"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  User,
  Users,
  Target,
  Sparkles,
  Briefcase,
  Library,
  Flame,
  Waves,
  BookOpen,
  Sun,
  X,
} from "lucide-react";
import {
  offTheClock,
  strengths as gallupStrengths,
  type AboutIcon,
  type StrengthIcon,
} from "@/lib/data/about";

const SHOW_FAMILY_PHOTO = true;

// The copy lives in `lib/data/about.ts` so the chat assistant can read it;
// `corpus.ts` imports data modules and cannot import React. Icons stay here,
// because the data module must not depend on lucide. These two maps are the
// seam: a new icon key needs an entry here or the build fails on the lookup.
const factIcons: Record<AboutIcon, typeof User> = {
  user: User,
  users: Users,
  sparkles: Sparkles,
  briefcase: Briefcase,
  target: Target,
};

const strengthIcons: Record<StrengthIcon, typeof Flame> = {
  library: Library,
  flame: Flame,
  waves: Waves,
  bookOpen: BookOpen,
  sun: Sun,
};

export default function AboutMe() {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Lock background scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  return (
    <section id="about" className="section-container bg-surface-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">About Me</h2>

        <div className="grid lg:grid-cols-2 gap-10 items-start max-w-5xl mx-auto">
          {/* Left: Bio + Stats */}
          <div className="space-y-6">
            {/* Left as JSX on purpose. This bio is already in the corpus via
                knowledge/00-overview.md ("the stated design bar is that a
                system has to run at 2am on a Sunday without waking anyone"), so
                moving it into a data module would add a second copy of text the
                assistant can already read, and cost the inline emphasis and
                arrows. Only the facts and strengths below were actually
                missing. */}
            <div className="text-ink-muted leading-relaxed space-y-4">
              <p>
                I&apos;m an AWS Sr. Solutions Architect at{" "}
                <span className="font-semibold text-ink">AllCloud</span>,
                helping customers land on AWS the right way; serverless-first,
                IaC everything, security by default.
              </p>
              <p>
                My background is ops (Rackspace Windows Admin{" "}
                <span aria-hidden>→</span> AWS Cloud Support Engineer{" "}
                <span aria-hidden>→</span> AWS Architect), which
                shapes how I think about what gets deployed: it has to run at 2
                a.m. on a Sunday without anyone waking up.
              </p>
            </div>

            <div className="card">
              <div className="flex items-start gap-4">
                {SHOW_FAMILY_PHOTO && (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="View family photo larger"
                    className="relative w-[120px] h-[120px] shrink-0 rounded-lg overflow-hidden border border-line hover:border-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Image
                      src="/images/profile/family.webp"
                      alt="Michael Groff with family"
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                )}
                <div className="flex-1">
                  <p className="eyebrow mb-3">Off the clock</p>
                  <ul className="space-y-2 text-sm">
                    {offTheClock.map((s) => {
                      const Icon = factIcons[s.icon];
                      return (
                        <li key={s.label} className="flex items-start gap-2.5 text-ink-muted">
                          <Icon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <span>{s.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right: CliftonStrengths */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <p className="eyebrow">Top 5 CliftonStrengths</p>
              <a
                href="/images/gallup/Michael-Groff-Signature-Themes.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:text-accent-light"
              >
                Signature Themes PDF
              </a>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {gallupStrengths.map((s, i) => {
                const Icon = strengthIcons[s.icon];
                return (
                <div
                  key={s.name}
                  className="card p-4 relative overflow-hidden border-t-2"
                  style={{ borderTopColor: s.color }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[11px] text-ink-subtle">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-ink ml-auto">
                      {s.name}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {s.summary}
                  </p>
                </div>
                );
              })}

              {/* 6th slot: callout card */}
              <div className="card p-4 border border-dashed border-line bg-surface-1 flex flex-col justify-center">
                <p className="text-xs text-ink-subtle leading-relaxed italic">
                  Gallup&apos;s{" "}
                  <a
                    href="https://www.gallupstrengthscenter.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-light not-italic"
                  >
                    CliftonStrengths
                  </a>{" "}
                  assessment has been a good lens for how I collaborate and
                  pick problems worth solving.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {SHOW_FAMILY_PHOTO && lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Family photo"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative cursor-default"
          >
            <Image
              src="/images/profile/family.webp"
              alt="Michael Groff with family"
              width={1200}
              height={900}
              sizes="(max-width: 640px) 90vw, min(90vw, 900px)"
              className="w-[min(90vw,900px)] max-h-[85vh] h-auto rounded-md shadow-2xl"
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
