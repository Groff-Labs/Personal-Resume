import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const SITE_URL = "https://cv.michaelgroff.info";
const TITLE = "Michael Groff · AWS Sr. Solutions Architect";
const DESCRIPTION =
  "AWS Sr. Solutions Architect at AllCloud. Building serverless, scalable, cost-optimized platforms for SMB to enterprise; serverless-first, IaC everything, security by default.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "AWS Solutions Architect",
    "Sr. Solutions Architect",
    "Cloud Architecture",
    "AWS Certified",
    "Serverless",
    "Infrastructure as Code",
    "AWS CDK",
    "Terraform",
    "Cloud migrations",
    "DoD FedRAMP",
    "Michael Groff",
    "San Antonio",
  ],
  authors: [{ name: "Michael Groff", url: SITE_URL }],
  creator: "Michael Groff",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "cv.michaelgroff.info",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Michael Groff — AWS Sr. Solutions Architect",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@Groffskiii",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/favicon-192.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD structured data so Google's knowledge graph can pick this up.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Michael Groff",
  url: SITE_URL,
  image: `${SITE_URL}/og-image.png`,
  jobTitle: "Sr. Solutions Architect",
  worksFor: {
    "@type": "Organization",
    name: "AllCloud",
    url: "https://allcloud.io",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "San Antonio",
    addressRegion: "TX",
    addressCountry: "US",
  },
  alumniOf: {
    "@type": "EducationalOrganization",
    name: "Texas State University",
    url: "https://www.txstate.edu",
  },
  knowsAbout: [
    "AWS",
    "Cloud Architecture",
    "Serverless",
    "Infrastructure as Code",
    "AWS CDK",
    "Terraform",
    "DevOps",
    "Cloud Migrations",
  ],
  sameAs: [
    "https://www.linkedin.com/in/michael-groff-8b367489",
    "https://github.com/mgroff2",
    "https://twitter.com/Groffskiii",
  ],
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      name: "AWS Certified Solutions Architect – Professional",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "Amazon Web Services" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "AWS Certified Solutions Architect – Associate",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "Amazon Web Services" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "AWS Certified SysOps Administrator – Associate",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "Amazon Web Services" },
    },
    {
      "@type": "EducationalOccupationalCredential",
      name: "CompTIA Security+",
      credentialCategory: "certification",
      recognizedBy: { "@type": "Organization", name: "CompTIA" },
    },
  ],
};

// Runs before React hydrates; avoids a flash of wrong theme.
const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');var sys=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var resolved=(s==='light'||s==='dark')?s:sys;if(resolved==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

// CloudFlare Web Analytics token. Register at
// https://dash.cloudflare.com → Web Analytics → Add Site, then paste the
// token from the auto-generated <script> snippet below. Empty string
// disables the analytics tag entirely.
const CLOUDFLARE_ANALYTICS_TOKEN = "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Navigation />
        <main>{children}</main>
        <Footer />
        {CLOUDFLARE_ANALYTICS_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={`{"token":"${CLOUDFLARE_ANALYTICS_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
