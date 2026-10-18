// Canonical contact details.
//
// CLAUDE.md used to list three canonical copies of this (Footer.tsx, the .vcf,
// and resume.md). The chat assistant needs the same values — it hands off to
// them when a question falls outside the CV — and a fourth copy would guarantee
// they drift. So Footer.tsx now reads from here, and the chat Lambda imports
// this module directly rather than restating the email in a system prompt.
//
// Still duplicated, deliberately: `frontend/public/michael-groff.vcf` (a
// byte-format file, not JS) and the header of `resume.md` (the PDF's source).
// Change those two by hand when anything here changes.

export const contact = {
  name: "Michael Groff",
  headline: "AWS Sr. Solutions Architect",
  location: "San Antonio, TX",

  email: "mg1459.mg@gmail.com",
  /** Pre-fills a subject so inbound mail is easy to spot. */
  emailHref: "mailto:mg1459.mg@gmail.com?Subject=Career%20Opportunity",

  phone: "(830) 688-2830",
  phoneHref: "tel:+1-830-688-2830",

  linkedIn: "https://www.linkedin.com/in/michael-groff-8b367489",
  github: "https://github.com/mgroff2",
  twitter: "https://twitter.com/Groffskiii",

  vcf: "/michael-groff.vcf",
  resumePdf: "/resume.pdf",
  resumeMd: "/resume.md",
} as const;
