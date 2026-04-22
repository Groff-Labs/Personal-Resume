"use client";

import { useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { certifications, vendors, type Certification } from "@/lib/data/certifications";

const START_YEAR = 2017;
const END_YEAR = 2025;
const YEAR_SPAN = END_YEAR - START_YEAR;

// width/height in SVG viewBox units; scales responsively via CSS
const W = 1000;
const H = 260;
const AXIS_Y = 200;
const DOT_R = 8;
// Invisible hit target radius. Bigger = easier to click, but consecutive dots
// in a dense stack (e.g. 2017 VMware, 8 certs) share hit territory. 14 gives
// each dot ~28 px diameter and only ~6 px overlap with its stack neighbor.
const HIT_R = 14;
const STACK_STEP = 22;
// Grace period before the tooltip dismisses, so moving cursor dot → tooltip
// doesn't flicker the state away.
const HOVER_DISMISS_MS = 120;

const VENDOR_COLOR: Record<string, string> = {
  "Amazon Web Services (AWS)": "#0891b2", // cyan-600
  CompTIA: "#dc2626", // red-600
  "Dell EMC": "#2563eb", // blue-600
  ICAgile: "#16a34a", // green-600
  Microsoft: "#9333ea", // purple-600
  "Red Hat": "#ea580c", // orange-600
  VMware: "#334155", // slate-700
};

function parseYear(issueDate: string): number {
  // "2023-04" | "2017" → decimal year (e.g. 2023.25)
  const [y, m] = issueDate.split("-").map(Number);
  if (!m) return y;
  return y + (m - 1) / 12;
}

function xFor(issueDate: string): number {
  const yf = parseYear(issueDate);
  const clamped = Math.max(START_YEAR, Math.min(END_YEAR, yf));
  const margin = 40;
  return margin + ((clamped - START_YEAR) / YEAR_SPAN) * (W - margin * 2);
}

interface PositionedCert extends Certification {
  x: number;
  y: number;
  yearKey: string;
}

function position(certs: Certification[]): PositionedCert[] {
  // Only show certs within the visible window; older ones remain in the data
  // (and in the featured row / counts) but don't clutter the timeline.
  // Training badges (AWS Partner / AWS Knowledge completions) are rendered
  // separately in CertTrainingGrid to keep the timeline about real exams.
  const visible = certs.filter((c) => {
    if (c.type === "training") return false;
    const y = Number(c.issueDate.split("-")[0]);
    return y >= START_YEAR;
  });

  // Stack same-year certs vertically upward
  const byYear = new Map<string, Certification[]>();
  for (const c of visible) {
    const key = c.issueDate.split("-")[0];
    if (!byYear.has(key)) byYear.set(key, []);
    byYear.get(key)!.push(c);
  }
  const out: PositionedCert[] = [];
  for (const [yearKey, group] of byYear) {
    // keep deterministic order by original index
    group.forEach((c, i) => {
      out.push({
        ...c,
        yearKey,
        x: xFor(c.issueDate),
        y: AXIS_Y - DOT_R - 4 - i * STACK_STEP,
      });
    });
  }
  return out;
}

function statusLabel(cert: Certification): string {
  const year = Number(cert.issueDate.split("-")[0]);
  if (year >= 2022) return "Recent";
  if (year >= 2018) return "Established";
  return "Legacy";
}

export default function CertTimeline() {
  const [activeVendor, setActiveVendor] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHover = (id: string) => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    setHoveredId(id);
  };
  const scheduleDismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setHoveredId(null), HOVER_DISMISS_MS);
  };

  const positioned = useMemo(() => position(certifications), []);
  const yearTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = START_YEAR; y <= END_YEAR; y++) ticks.push(y);
    return ticks;
  }, []);

  const hovered = positioned.find((c) => c.id === hoveredId) ?? null;

  // Counts reflect only the visible window so chips match what's on screen.
  const vendorCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of positioned) m[c.vendor] = (m[c.vendor] ?? 0) + 1;
    return m;
  }, [positioned]);

  const visibleVendors = useMemo(
    () => vendors.filter((v) => (vendorCounts[v] ?? 0) > 0),
    [vendorCounts],
  );

  const isDimmed = (cert: Certification) =>
    activeVendor !== null && cert.vendor !== activeVendor;

  return (
    <div className="w-full">
      {/* Vendor filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveVendor(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            activeVendor === null
              ? "bg-accent border-accent text-white"
              : "border-line text-ink-muted hover:border-accent hover:text-accent"
          }`}
        >
          All <span className="opacity-70">({positioned.length})</span>
        </button>
        {visibleVendors.map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => setActiveVendor(activeVendor === v ? null : v)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeVendor === v
                ? "text-white"
                : "border-line text-ink-muted hover:border-accent hover:text-accent"
            }`}
            style={
              activeVendor === v
                ? { backgroundColor: VENDOR_COLOR[v], borderColor: VENDOR_COLOR[v] }
                : undefined
            }
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: VENDOR_COLOR[v] }}
            />
            {v.replace("Amazon Web Services (AWS)", "AWS")}
            <span className="opacity-70">({vendorCounts[v] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Desktop: horizontal SVG timeline */}
      <div className="hidden md:block relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Certification timeline"
        >
          {/* Axis line */}
          <line
            x1={30}
            x2={W - 30}
            y1={AXIS_Y}
            y2={AXIS_Y}
            stroke="rgb(var(--line))"
            strokeWidth={2}
          />

          {/* Year ticks (every year, since the window is now short) */}
          {yearTicks.map((y) => (
            <g key={y}>
              <line
                x1={xFor(String(y))}
                x2={xFor(String(y))}
                y1={AXIS_Y - 5}
                y2={AXIS_Y + 5}
                stroke="rgb(var(--line))"
                strokeWidth={1}
              />
              <text
                x={xFor(String(y))}
                y={AXIS_Y + 22}
                textAnchor="middle"
                className="fill-ink-muted"
                fontSize="12"
                fontFamily="var(--font-mono)"
              >
                {y}
              </text>
            </g>
          ))}

          {/* Dots */}
          {positioned.map((cert) => {
            const dim = isDimmed(cert);
            const color = VENDOR_COLOR[cert.vendor] ?? "#888";
            const isHovered = hoveredId === cert.id;
            return (
              <g key={cert.id}>
                {/* connector line from axis to dot */}
                <line
                  x1={cert.x}
                  x2={cert.x}
                  y1={AXIS_Y}
                  y2={cert.y + DOT_R}
                  stroke={color}
                  strokeWidth={1}
                  opacity={dim ? 0.15 : 0.4}
                />
                <a
                  href={cert.credlyUrl || cert.pdfUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => showHover(cert.id)}
                  onMouseLeave={scheduleDismiss}
                  onFocus={() => showHover(cert.id)}
                  onBlur={scheduleDismiss}
                  aria-label={`${cert.name}, ${cert.issueDate}`}
                >
                  <circle
                    cx={cert.x}
                    cy={cert.y}
                    r={isHovered ? DOT_R + 2 : DOT_R}
                    fill={color}
                    opacity={dim ? 0.2 : 1}
                    className="transition-all cursor-pointer"
                    stroke="rgb(var(--surface-0))"
                    strokeWidth={2}
                  />
                  {/* Invisible hit target — makes the dot easy to click even
                      when three certs are stacked on the same x-column. */}
                  <circle
                    cx={cert.x}
                    cy={cert.y}
                    r={HIT_R}
                    fill="transparent"
                    className="cursor-pointer"
                  />
                </a>
              </g>
            );
          })}
        </svg>

        {/* Tooltip — itself an anchor so the whole card is clickable, and
            keeps the hover state alive while the cursor is over it. */}
        {hovered && (
          <a
            href={hovered.credlyUrl || hovered.pdfUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => showHover(hovered.id)}
            onMouseLeave={scheduleDismiss}
            className="absolute block bg-surface-1 border border-line rounded-md shadow-lg px-3 py-2 text-sm z-10 hover:border-accent transition-colors"
            style={{
              left: `${(hovered.x / W) * 100}%`,
              top: `${(hovered.y / H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 14px))",
              maxWidth: "280px",
            }}
          >
            <div className="font-semibold text-ink leading-tight mb-0.5">
              {hovered.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span className="font-mono">{hovered.yearKey}</span>
              <span>·</span>
              <span>{statusLabel(hovered)}</span>
              {(hovered.credlyUrl || hovered.pdfUrl) && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-accent">
                    verify <ExternalLink className="w-3 h-3" />
                  </span>
                </>
              )}
            </div>
          </a>
        )}
      </div>

      {/* Mobile: vertical stacked list grouped by year */}
      <div className="md:hidden space-y-6">
        {[...new Set(positioned.map((c) => c.yearKey))]
          .sort((a, b) => Number(b) - Number(a))
          .map((yearKey) => {
            const group = positioned.filter((c) => c.yearKey === yearKey);
            return (
              <div key={yearKey}>
                <div className="font-mono text-sm text-ink-muted mb-2">{yearKey}</div>
                <div className="space-y-2 border-l-2 border-line pl-4">
                  {group.map((cert) => {
                    if (isDimmed(cert)) return null;
                    const color = VENDOR_COLOR[cert.vendor] ?? "#888";
                    return (
                      <a
                        key={cert.id}
                        href={cert.credlyUrl || cert.pdfUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 group"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink group-hover:text-accent transition-colors">
                            {cert.name}
                          </div>
                          <div className="text-xs text-ink-subtle">
                            {cert.vendor.replace("Amazon Web Services (AWS)", "AWS")} ·{" "}
                            {statusLabel(cert)}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
