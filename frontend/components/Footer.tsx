import { Mail, Phone, UserPlus, FileText } from "lucide-react";
import { Github, Linkedin, Twitter } from "@/components/BrandIcons";
import { contact } from "@/lib/data/contact";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // Values come from lib/data/contact.ts so the chat assistant and this footer
  // cannot disagree about how to reach him.
  const socialLinks = [
    { name: "LinkedIn", icon: Linkedin, url: contact.linkedIn },
    { name: "GitHub", icon: Github, url: contact.github },
    { name: "Twitter", icon: Twitter, url: contact.twitter },
  ];

  const contactInfo = [
    { icon: Phone, text: contact.phone, href: contact.phoneHref },
    { icon: Mail, text: contact.email, href: contact.emailHref },
  ];

  return (
    // id="contact" is the target for the nav + hero CTAs. A recruiter fed back
    // that contact details were only findable by scrolling here, so they now
    // have a link from the top of the page.
    <footer
      id="contact"
      className="bg-surface-2 border-t border-line py-10 no-print"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-ink mb-2">{contact.name}</h3>
            <p className="text-sm text-ink-muted">
              {contact.headline} · {contact.location}
            </p>
          </div>

          <div>
            <p className="eyebrow mb-3">Contact</p>
            <ul className="space-y-1.5">
              {contactInfo.map((item) => (
                <li key={item.text}>
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={contact.vcf}
              download
              className="mt-3 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Save contact (.vcf)
            </a>
            {/* Markdown alongside the PDF: some ATS and application forms take
                plain text more reliably than a PDF's extracted text layer. */}
            <a
              href={contact.resumeMd}
              download
              className="mt-2 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent transition-colors"
            >
              <FileText className="w-4 h-4" />
              Résumé (Markdown)
            </a>
          </div>

          <div>
            <p className="eyebrow mb-3">Connect</p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-line text-ink-muted hover:text-accent hover:border-accent transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-line flex flex-col sm:flex-row justify-between gap-2 text-xs text-ink-subtle">
          <p>&copy; {currentYear} {contact.name}. All rights reserved.</p>
          <p className="font-mono">
            Next.js · AWS · CDK · CloudFront · S3
          </p>
        </div>
      </div>
    </footer>
  );
}
