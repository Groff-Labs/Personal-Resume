"use client";

import { motion } from "framer-motion";
import { Quote, Linkedin } from "lucide-react";
import { showTestimonials, testimonials } from "@/lib/data/testimonials";

export default function Testimonials() {
  if (!showTestimonials || testimonials.length === 0) return null;

  return (
    <section id="praise" className="section-container bg-surface-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="text-center mb-10">
          <p className="eyebrow mb-3">Praise</p>
          <h2 className="text-2xl md:text-3xl font-bold text-ink">
            From people I&apos;ve worked with
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="card relative"
            >
              <Quote className="w-6 h-6 text-accent/30 absolute top-5 right-5" />
              <p className="text-ink-muted leading-relaxed italic pr-10">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="flex items-center gap-3 mt-5 pt-4 border-t border-line">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold">
                  {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm truncate">
                    {t.name}
                  </div>
                  <div className="text-xs text-ink-subtle truncate">
                    {t.role}
                    {t.context ? ` · ${t.context}` : ""}
                  </div>
                </div>
                {t.linkedInUrl && (
                  <a
                    href={t.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-subtle hover:text-accent transition-colors"
                    aria-label={`LinkedIn profile of ${t.name}`}
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
              </footer>
            </motion.blockquote>
          ))}
        </div>

        <p className="text-center text-xs text-ink-subtle italic mt-8 max-w-xl mx-auto">
          More recommendations on my{" "}
          <a
            href="https://www.linkedin.com/in/michael-groff-8b367489"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-light"
          >
            LinkedIn profile
          </a>
          .
        </p>
      </motion.div>
    </section>
  );
}
