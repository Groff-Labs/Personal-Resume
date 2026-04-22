"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Award, Users, Newspaper, HeartHandshake, MapPin } from "lucide-react";

// Texas State maroon + gold as a secondary accent for this section
const TXST_MAROON = "#501214";
const TXST_GOLD = "#AC9155";

const achievements = [
  {
    icon: Award,
    title: "Dean's List",
    description: "Recognition across multiple semesters.",
  },
  {
    icon: Users,
    title: "Intramural sports",
    description: "Football and softball through school.",
  },
  {
    icon: HeartHandshake,
    title: "Bobcat Build",
    description: "Student community service; Student Volunteer Connection.",
  },
  {
    icon: Newspaper,
    title: "The University Star",
    description: "Student journalist for the university newspaper.",
  },
];

export default function Education() {
  return (
    <section id="education" className="section-container bg-surface-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">Education</h2>

        <div className="max-w-5xl mx-auto">
          {/* Hero banner: campus photo + overlaid credential card */}
          <div className="relative rounded-xl overflow-hidden border border-line shadow-lg">
            <div className="relative aspect-[3/2] md:aspect-[16/5]">
              <Image
                src="/images/education/txstate-aerial.jpg"
                alt="Texas State University campus, aerial view"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
              {/* Brand gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(100deg, ${TXST_MAROON}EE 0%, ${TXST_MAROON}66 55%, transparent 100%)`,
                }}
              />
            </div>

            {/* Overlaid info */}
            <div className="absolute inset-0 flex items-center">
              <div className="px-6 md:px-10 max-w-xl">
                <div
                  className="inline-block font-mono text-[11px] tracking-[0.25em] uppercase mb-3"
                  style={{ color: TXST_GOLD }}
                >
                  Texas State University · San Marcos
                </div>
                <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3">
                  Bachelor of Arts
                </h3>
                <p className="text-sm md:text-base text-white/90 leading-relaxed">
                  School of Journalism &amp; Mass Communication
                </p>
                <p className="mt-4 text-xs md:text-sm italic text-white/80 max-w-md leading-relaxed">
                  A Journalism degree turned out to be training for writing
                  design docs that people actually read.
                </p>
              </div>
            </div>
          </div>

          {/* Credential strip + achievements */}
          <div className="grid md:grid-cols-4 gap-3 mt-6">
            {achievements.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                viewport={{ once: true }}
                className="card p-4"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center mb-3 bg-[#AC915524] dark:bg-[#AC91553d]">
                  <a.icon className="w-4 h-4 text-[#501214] dark:text-[#D4B678]" />
                </div>
                <h4 className="font-semibold text-ink text-sm mb-1">
                  {a.title}
                </h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {a.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Footer strip */}
          <div className="flex items-center justify-center gap-3 mt-8 text-sm">
            <MapPin className="w-4 h-4 text-[#501214] dark:text-[#D4B678]" />
            <span className="font-mono tracking-wider text-ink-muted">
              SAN MARCOS, TX
            </span>
            <span className="text-ink-subtle">·</span>
            <span className="font-semibold text-base text-[#501214] dark:text-[#D4B678]">
              Eat &apos;Em Up Cats
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
