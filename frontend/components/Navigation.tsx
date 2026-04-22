"use client";

import { useState, useEffect } from "react";
import { Menu, X, Download } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "#home", label: "Home", sectionId: "home" },
  { href: "#about", label: "About", sectionId: "about" },
  { href: "#skills", label: "Skills", sectionId: "skills" },
  { href: "#experience", label: "Experience", sectionId: "experience" },
  { href: "#education", label: "Education", sectionId: "education" },
  { href: "#certifications", label: "Certs", sectionId: "certifications" },
  { href: "#project", label: "Project", sectionId: "project" },
];

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = navLinks
      .map((l) => document.getElementById(l.sectionId))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible section currently intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      {
        rootMargin: "-40% 0px -50% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-200 no-print ${
        isScrolled
          ? "bg-surface-0/90 backdrop-blur-sm border-b border-line shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Monogram */}
          <a
            href="#home"
            className="font-mono font-semibold text-lg tracking-tight text-ink hover:text-accent transition-colors"
            aria-label="Home"
          >
            M.G.
          </a>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = activeSection === link.sectionId;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-accent" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-3 right-3 -bottom-0.5 h-[2px] bg-accent rounded-full"
                    />
                  )}
                </a>
              );
            })}
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink-muted border border-line rounded-md hover:border-accent hover:text-accent transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Resume
            </a>
            <span aria-hidden className="w-px h-5 bg-line mx-2" />
            <ThemeToggle />
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download resume"
              className="p-2 rounded-md text-ink-muted hover:text-accent hover:bg-surface-1 transition-colors"
            >
              <Download className="w-5 h-5" />
            </a>
            <ThemeToggle />
            <button
              className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-surface-1 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-surface-0 border-t border-line shadow-sm">
            <div className="flex flex-col pt-2">
              {navLinks.map((link) => {
                const isActive = activeSection === link.sectionId;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2.5 text-sm font-medium border-l-2 transition-colors ${
                      isActive
                        ? "text-accent border-accent"
                        : "text-ink-muted border-transparent hover:text-ink hover:border-line"
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
