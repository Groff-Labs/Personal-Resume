"use client";

import { motion } from "framer-motion";
import {
  Cloud,
  Boxes,
  Code2,
  Workflow,
  Crosshair,
  Wrench,
  Rocket,
  Activity,
  Server,
} from "lucide-react";
import { skillGroups } from "@/lib/data/skills";

const CATEGORY_ICON: Record<string, typeof Cloud> = {
  AWS: Cloud,
  "Infrastructure as Code": Boxes,
  Languages: Code2,
  "Patterns & Practices": Workflow,
  Specializations: Crosshair,
  "CI/CD & GitOps": Rocket,
  "Monitoring & Observability": Activity,
  "Configuration Management": Server,
  "Platforms & Tools": Wrench,
};

export default function Skills() {
  return (
    <section id="skills" className="section-container bg-surface-1">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="section-title">Skills &amp; Stack</h2>
        <p className="text-center text-ink-muted max-w-2xl mx-auto mb-12 -mt-6 text-sm">
          Things I use regularly enough to have opinions about. Recruiters can
          `⌘F` freely.
        </p>

        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {skillGroups.map((group, gIdx) => {
            const Icon = CATEGORY_ICON[group.category] ?? Wrench;
            return (
              <motion.div
                key={group.category}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: gIdx * 0.06 }}
                viewport={{ once: true }}
                className="card flex flex-col"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink leading-tight">
                      {group.category}
                    </h3>
                    <p className="text-xs text-ink-subtle leading-relaxed">
                      {group.summary}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center px-2 py-1 rounded-md border border-line bg-surface-0 font-mono text-[11px] text-ink-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-ink-subtle italic mt-10 max-w-2xl mx-auto">
          Depth varies; some are daily tools, others are things I&apos;ve
          shipped to production and can speak to with real opinions. Happy to
          go deep on any of them.
        </p>
      </motion.div>
    </section>
  );
}
