import * as React from "react";
import { useState } from "react";
import { Kicker } from "./Kicker";

interface LayersDiagram {
  title: string;
  description: string;
  kicker: string;
  rule: string;
  rows: Array<{
    id: string;
    label: string;
    description: string;
    example: string;
    bypassLabel: string;
    bypass: string;
    strength: number;
    strengthLabel: string;
  }>;
  thresholdAfter: string;
  thresholdLabel: string;
  footer: string;
}

export function LayersInteraction({ diagram }: { diagram: LayersDiagram }) {
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const activeId = hovered || pinned;

  const colorMap: Record<string, string> = {
    policy: "var(--gf-ink)",
    prompt: "var(--gf-layer-prompt)",
    runtime: "var(--gf-layer-runtime)",
    architecture: "var(--gf-layer-arch)",
  };

  return (
    <div className="w-full font-sans" role="region" aria-label={diagram.title} aria-describedby="guardrails-layers-description">
      <p id="guardrails-layers-description" className="sr-only">{diagram.description}</p>
      <div className="mb-6">
        <Kicker>{diagram.kicker}</Kicker>
        <h3 className="mt-4 font-display text-[length:var(--gf-h4)] font-bold text-[var(--gf-ink)]">
          {diagram.rule}
        </h3>
      </div>

      <div className="flex flex-col">
        {diagram.rows.map((row, idx) => {
          const isActive = activeId === row.id;
          const layerColor = colorMap[row.id] || "var(--gf-border)";
          
          return (
            <div key={row.id}>
              {idx > 0 && diagram.rows[idx - 1].id === diagram.thresholdAfter && (
                <div className="py-6 flex items-center justify-center relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[var(--gf-ink)]" />
                  <div className="bg-[var(--gf-bg)] px-4 text-[length:var(--gf-text-sm)] font-bold tracking-[var(--gf-tracking-label)] text-[var(--gf-ink)] relative z-10">
                    {diagram.thresholdLabel}
                  </div>
                </div>
              )}

              <button
                type="button"
                data-guardrails-layer={row.id}
                aria-pressed={pinned === row.id}
                onClick={() => setPinned(pinned === row.id ? null : row.id)}
                onMouseEnter={() => setHovered(row.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(row.id)}
                onBlur={() => setHovered(null)}
                className={`w-full text-left grid md:grid-cols-[1.5fr_2fr_1fr] lg:grid-cols-[200px_1fr_1fr] gap-6 p-6 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] ${
                  isActive ? "bg-[var(--gf-surface)] border-[var(--gf-ink)]" : "bg-transparent border-[var(--gf-border)] hover:border-[var(--gf-ink)]/50"
                }`}
              >
                <div className="border-l-4 pl-4" style={{ borderLeftColor: layerColor }}>
                  <h4 className="font-display text-[length:var(--gf-table-h)] font-bold text-[var(--gf-ink)]">{row.label}</h4>
                  <p className="mt-2 text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)]">{row.description}</p>
                  <p className="mt-4 text-[length:var(--gf-text-sm)] leading-snug text-[var(--gf-ink)]">{row.example}</p>
                </div>

                <div className="md:border-l md:border-[var(--gf-border)] md:pl-6">
                  <span className="text-[length:var(--gf-text-xs)] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] block mb-3">
                    {row.bypassLabel}
                  </span>
                  <p className="text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink)]">{row.bypass}</p>
                </div>

                <div className="md:text-right flex flex-col justify-end">
                  <div className="flex items-center gap-1 md:justify-end mt-4 md:mt-0">
                    <span className="mr-3 text-[length:var(--gf-text-sm)] font-bold text-[var(--gf-ink)]">
                      {row.strengthLabel}
                    </span>
                    {[1, 2, 3, 4].map((s) => (
                      <div
                        key={s}
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          borderColor: s <= row.strength ? layerColor : "var(--gf-border)",
                          backgroundColor: s <= row.strength ? layerColor : "transparent",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)]">{diagram.footer}</p>
    </div>
  );
}
