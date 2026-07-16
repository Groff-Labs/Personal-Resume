// ESLint flat config (ESLint 9+/10 dropped .eslintrc). eslint-config-next 16
// ships a native flat-config array, so we spread it directly — no FlatCompat
// bridge needed. Replaces the old .eslintrc.json ({ extends: next/core-web-vitals })
// and the `next lint` command removed in Next 16.
import next from "eslint-config-next";

const eslintConfig = [
  {
    // `eslint .` walks the whole tree; `next lint` only scanned source. Exclude
    // build output and the byte-preserved WordPress archives under public/
    // (public/blog, public/legacy) — minified vendor JS that must not be touched
    // or linted (see CLAUDE.md "Archives — don't regenerate").
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
    ],
  },
  ...next,
  {
    // Two components legitimately set state in an empty-dep effect to read
    // browser-only state after mount: ThemeToggle (SSR mount-guard, avoids a
    // theme-flash hydration mismatch) and not-found (reads window.location,
    // which is unavailable during static export). The new
    // react-hooks/set-state-in-effect rule flags this correct idiom, so scope
    // the rule off for just these files — it stays active everywhere else.
    files: ["components/ThemeToggle.tsx", "app/not-found.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
