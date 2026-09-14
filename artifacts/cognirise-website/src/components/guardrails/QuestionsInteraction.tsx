import * as React from "react";
import { useState } from "react";
import { MarkdownInline } from "./MarkdownInline";

interface QuestionsInteractionProps {
  panels: Array<{ id: string; title: string; body: string }>;
}

export function QuestionsInteraction({ panels }: QuestionsInteractionProps) {
  const [pinned, setPinned] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const activeIdx = hovered !== null ? hovered : pinned;

  return (
    <div className="grid md:grid-cols-3 gap-6 font-sans w-full" role="list">
      {panels.map((q, idx) => {
        const isActive = activeIdx === idx;
        
        return (
          <div
            key={idx}
            role="listitem"
            className={`text-left p-6 md:p-8 bg-[var(--gf-surface)] border transition-colors flex flex-col ${
              isActive ? "border-[var(--gf-accent)]" : "border-[var(--gf-border)] hover:border-[var(--gf-ink)]/40"
            }`}
          >
            <h3 className="font-display text-[length:var(--gf-text-xl)] font-bold text-[var(--gf-ink)] transition-colors">
              <button
                data-guardrails-question={q.id}
                aria-pressed={pinned === idx}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setPinned(pinned === idx ? null : idx)}
                onFocus={() => setHovered(idx)}
                onBlur={() => setHovered(null)}
                className={`text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] rounded-sm p-1 -ml-1 text-[var(--gf-ink)] transition-colors ${isActive ? "underline decoration-[var(--gf-accent)]" : "no-underline"}`}
              >
                {q.title}
              </button>
            </h3>
            <div className={`mt-5 text-[length:var(--gf-text-base)] leading-[var(--gf-leading-body)] transition-colors ${isActive ? "text-[var(--gf-ink)] font-medium" : "text-[var(--gf-ink-muted)]"}`}>
              <MarkdownInline text={q.body} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
