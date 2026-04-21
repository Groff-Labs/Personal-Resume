"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, getStoredTheme, setTheme, type Theme } from "@/lib/theme";

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export default function ThemeToggle() {
  const [theme, setCurrentTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredTheme();
    setCurrentTheme(stored);
    applyTheme(stored);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, []);

  const cycle = () => {
    const next = NEXT[theme];
    setCurrentTheme(next);
    setTheme(next);
  };

  const Icon = mounted ? ICONS[theme] : Monitor;
  const label = mounted ? `Theme: ${theme} (click to cycle)` : "Theme";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-line text-ink-muted hover:text-accent hover:border-accent transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
