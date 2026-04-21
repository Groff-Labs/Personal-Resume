"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Terminal } from "lucide-react";

export default function NotFound() {
  const [path, setPath] = useState("/<unknown>");
  useEffect(() => {
    setPath(window.location.pathname || "/");
  }, []);

  return (
    <section className="min-h-[80vh] flex items-center justify-center bg-surface-0 px-4 pt-24">
      <div className="max-w-2xl w-full">
        <div className="card overflow-hidden p-0">
          {/* Terminal chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-surface-1">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-2 font-mono text-xs text-ink-subtle">
              ~ /recruiter/looking-for-michael
            </span>
          </div>

          {/* Terminal body */}
          <div className="p-6 md:p-8 font-mono text-sm leading-relaxed text-ink">
            <div className="flex items-start gap-2 mb-2">
              <Terminal className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span className="text-ink-subtle break-all">
                $ curl -I https://cv.michaelgroff.info{path}
              </span>
            </div>
            <p className="text-red-500/90 mb-1">HTTP/2 404 Not Found</p>
            <p className="text-ink-muted mb-6">
              x-message: these aren&apos;t the droids you&apos;re looking for
            </p>

            <div className="border-t border-line pt-6 space-y-3 text-ink-muted">
              <p>Whatever you typed, this URL isn&apos;t here. A few guesses:</p>
              <ul className="space-y-1 pl-4">
                <li>· The link is from an older version of the site.</li>
                <li>· You&apos;re testing edge cases (respect).</li>
                <li>· I haven&apos;t built that page yet.</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-line">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white font-sans font-medium hover:bg-accent-dark transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to the homepage
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-ink-subtle mt-6 font-mono">
          This 404 is also a static asset. No server was harmed serving it.
        </p>
      </div>
    </section>
  );
}
