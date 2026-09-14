import * as React from "react";
import { useState } from "react";
import { MarkdownInline } from "./MarkdownInline";

interface MethodInteractionProps {
  phases: Array<{ id: string; name: string; caption: string; steps: string[] }>;
}

export function MethodInteraction({ phases }: MethodInteractionProps) {
  const [pinned, setPinned] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const activeIdx = hovered !== null ? hovered : pinned;

  return (
    <div className="w-full font-sans bg-[var(--gf-rail-bg)] px-6 py-12 md:p-14 border-t-4 border-[var(--gf-accent)] text-[var(--gf-rail-ink)] shadow-sm">
      <div className="grid lg:grid-cols-3 gap-10">
        {phases.map((phase, pIdx) => {
          const isActive = activeIdx === pIdx;
          
          return (
            <div key={pIdx} className="flex flex-col">
              <h3 className={`mb-6 border-b border-[var(--gf-rail-border)] pb-4 font-display text-[length:var(--gf-display)] font-bold tracking-[var(--gf-tracking-heading)] text-[var(--gf-rail-ink)] transition-colors ${isActive || hovered === pIdx ? "underline decoration-[var(--gf-accent)]" : "no-underline"}`}>
                <button
                  data-guardrails-method={phase.id}
                  aria-pressed={pinned === pIdx}
                  onMouseEnter={() => setHovered(pIdx)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setPinned(pinned === pIdx ? null : pIdx)}
                  onFocus={() => setHovered(pIdx)}
                  onBlur={() => setHovered(null)}
                  className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] rounded-sm p-1 -ml-1"
                >
                  {phase.name}
                </button>
              </h3>
              <p className="text-[length:var(--gf-text-xs)] uppercase tracking-[var(--gf-tracking-wide)] font-bold text-[var(--gf-rail-ink-muted)] -mt-4 mb-6">{phase.caption}</p>
              
              <ol className="space-y-6 flex-1 px-1">
                {phase.steps.map((step, sIdx) => {
                  return (
                    <li key={sIdx} className={`flex gap-4 transition-colors ${isActive ? "font-medium" : ""}`}>
                      <span className={`text-[length:var(--gf-text-base)] font-bold mt-0.5 transition-colors ${isActive ? "text-[var(--gf-accent-coral)]" : "text-[var(--gf-rail-ink-muted)]"}`}>
                        0{sIdx + 1}
                      </span>
                      <p className={`text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] transition-colors ${isActive ? "text-[var(--gf-rail-ink)]" : "text-[var(--gf-rail-ink-muted)]"}`}>
                        <MarkdownInline text={step} strongClass="font-semibold text-[var(--gf-rail-ink)]" emClass="italic" />
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
