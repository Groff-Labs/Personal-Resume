import { Github, Linkedin, Twitter, Mail, Phone } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: "https://www.linkedin.com/in/michael-groff-8b367489",
    },
    {
      name: "GitHub",
      icon: Github,
      url: "https://github.com/mgroff2",
    },
    {
      name: "Twitter",
      icon: Twitter,
      url: "https://twitter.com/Groffskiii",
    },
  ];

  const contactInfo = [
    {
      icon: Phone,
      text: "(830) 688-2830",
      href: "tel:+1-830-688-2830",
    },
    {
      icon: Mail,
      text: "mg1459.mg@gmail.com",
      href: "mailto:mg1459.mg@gmail.com?Subject=Career%20Opportunity",
    },
  ];

  return (
    <footer className="bg-surface-2 border-t border-line py-10 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-ink mb-2">Michael Groff</h3>
            <p className="text-sm text-ink-muted">
              AWS Sr. Solutions Architect · San Antonio, TX
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
          <p>&copy; {currentYear} Michael Groff. All rights reserved.</p>
          <p className="font-mono">
            Next.js · AWS · CDK · CloudFront · S3
          </p>
        </div>
      </div>
    </footer>
  );
}
