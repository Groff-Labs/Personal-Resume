"use client";

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
} from "lucide-react";

const SHOW_FAMILY_PHOTO = true;

const stats = [
  { icon: User, label: "Native Texan from Bandera, TX" },
  { icon: Users, label: "Married to a Texas public school teacher" },
  { icon: Users, label: "Father of two daughters" },
  { icon: Sparkles, label: "Fur-father of three; two Huskies and one standard-issue cat" },
  { icon: Briefcase, label: "Based in San Antonio, TX" },
  { icon: Target, label: "Avid tech enthusiast" },
];

interface Strength {
  name: string;
  color: string;
  icon: typeof Flame;
  // One-sentence descriptions adapted from Gallup's published CliftonStrengths themes.
  summary: string;
}

const gallupStrengths: Strength[] = [
  {
    name: "Input",
    color: "#2563eb", // blue-600
    icon: Library,
    summary:
      "A need to collect and archive; information, ideas, artifacts, even relationships.",
  },
  {
    name: "Achiever",
    color: "#0891b2", // cyan-600
    icon: Flame,
    summary:
      "Work hard with great stamina; immense satisfaction from being busy and productive.",
  },
  {
    name: "Adaptability",
    color: "#0d9488", // teal-600
    icon: Waves,
    summary:
      "Prefer to go with the flow; take things as they come and discover the future one day at a time.",
  },
  {
    name: "Learner",
    color: "#7c3aed", // violet-600
    icon: BookOpen,
    summary:
      "Continuous desire to learn and improve; the process excites more than the outcome.",
  },
  {
    name: "Positivity",
    color: "#ea580c", // orange-600
    icon: Sun,
    summary:
      "Contagious enthusiasm; naturally upbeat, energizes others.",
  },
];

export default function AboutMe() {
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
            <div className="text-ink-muted leading-relaxed space-y-4">
              <p>
                I&apos;m an AWS Sr. Solutions Architect at{" "}
                <span className="font-semibold text-ink">AllCloud</span>,
                helping customers land on AWS the right way; serverless-first,
                IaC everything, security by default.
              </p>
              <p>
                My background is ops (Rackspace Windows admin{" "}
                <span aria-hidden>→</span> AWS Cloud Support Engineer), which
                shapes how I think about what gets deployed: it has to run at 2
                a.m. on a Sunday without anyone waking up.
              </p>
            </div>

            <div className="card">
              <div className="flex items-start gap-4">
                {SHOW_FAMILY_PHOTO && (
                  <div className="relative w-[120px] h-[120px] shrink-0 rounded-lg overflow-hidden border border-line">
                    <Image
                      src="/images/profile/family.jpg"
                      alt="Michael Groff with family"
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="eyebrow mb-3">Off the clock</p>
                  <ul className="space-y-2 text-sm">
                    {stats.map((s) => (
                      <li key={s.label} className="flex items-start gap-2.5 text-ink-muted">
                        <s.icon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <span>{s.label}</span>
                      </li>
                    ))}
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
              {gallupStrengths.map((s, i) => (
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
                      <s.icon className="w-4 h-4" />
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
              ))}

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
    </section>
  );
}
