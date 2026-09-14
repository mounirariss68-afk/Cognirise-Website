import React, { useState, useRef } from "react";
import type { FrameworkContent } from "@workspace/api-zod";
import { MarkdownInline } from "./MarkdownInline";

type GuardrailsContent = Extract<FrameworkContent, { template: "guardrails" }>;

export function LayerExplorer({ content }: { content: GuardrailsContent }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  const diagram = content.layers.diagram;
  const headers = content.layers.tableHeaders;
  const rows = diagram.rows;
  
  if (!rows || rows.length === 0) return null;
  const activeRow = rows[activeIdx];
  const diagramSummaryId = "guardrails-layer-diagram-summary";

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let newIdx = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') newIdx = (idx + 1) % rows.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') newIdx = (idx - 1 + rows.length) % rows.length;
    else if (e.key === 'Home') newIdx = 0;
    else if (e.key === 'End') newIdx = rows.length - 1;
    
    if (newIdx !== idx) {
      e.preventDefault();
      setActiveIdx(newIdx);
      buttonRefs.current[newIdx]?.focus();
    }
  };

  return (
    <div
      className="bg-[var(--gf-surface)] border border-[var(--gf-border)] shadow-sm"
      role="region"
      aria-label={diagram.title}
      aria-describedby={diagramSummaryId}
    >
      <div
        id={diagramSummaryId}
        data-guardrails-print-summary="layers"
        className="sr-only print:not-sr-only print:static print:block print:h-auto print:w-auto print:mb-6 print:overflow-visible print:whitespace-normal print:border-b print:border-[var(--gf-border)] print:pb-4 print:font-sans print:text-[12px] print:leading-relaxed"
      >
        <h3 className="font-bold">{diagram.title}</h3>
        <p><MarkdownInline text={diagram.description} /></p>
        <p>
          <strong><MarkdownInline text={diagram.kicker} /></strong>
          {" — "}
          <MarkdownInline text={diagram.rule} />
        </p>
        <p>
          <strong>Threshold:</strong>{" "}
          <MarkdownInline text={diagram.thresholdLabel} />
        </p>
        <ul>
          {rows.map((row) => (
            <li key={`accessible-${row.id}`} id={`layer-row-${row.id}-accessible`}>
              <strong><MarkdownInline text={row.label} /></strong>
              {" — "}
              <MarkdownInline text={row.description} />
              {" Example: "}
              <MarkdownInline text={row.example} />
              {" "}
              <strong><MarkdownInline text={row.bypassLabel} /></strong>
              {": "}
              <MarkdownInline text={row.bypass} />
              {" Strength: "}
              <MarkdownInline text={row.strengthLabel} />
            </li>
          ))}
        </ul>
        <p><MarkdownInline text={diagram.footer} /></p>
      </div>
      <div 
        role="group" 
        aria-label={content.layers.heading}
        className="grid grid-cols-2 lg:grid-cols-5 border-b border-[var(--gf-border)]"
      >
         {rows.map((row, i) => {
           const isAfterThreshold = i > 0 && rows[i - 1].id === diagram.thresholdAfter;
           return (
             <React.Fragment key={row.id}>
               {isAfterThreshold && (
                  <div
                    role="separator"
                    aria-label={diagram.thresholdLabel}
                    data-guardrails-threshold
                  className="col-span-2 lg:col-span-1 min-w-0 flex items-center justify-center border-y lg:border-y-0 lg:border-x border-[var(--gf-border)] bg-[var(--gf-bg)] px-4 py-3"
                  >
                  <span className="min-w-0 max-w-full break-words text-center text-[10px] font-bold uppercase tracking-widest text-[var(--gf-accent-coral)] bg-[var(--gf-accent-coral)]/10 px-2 py-1 rounded-sm">
                     {diagram.thresholdLabel}
                   </span>
                 </div>
               )}
               <button 
                 ref={(el) => { buttonRefs.current[i] = el; }}
                 role="button"
                 type="button"
                 aria-pressed={activeIdx === i}
                 aria-controls={`layer-panel-${row.id}`}
                  aria-describedby={`layer-row-${row.id}-accessible`}
                 id={`layer-tab-${row.id}`}
                 onClick={() => setActiveIdx(i)}
                 onKeyDown={(e) => handleKeyDown(e, i)}
                  className={`min-w-0 w-full min-h-[48px] px-4 py-4 font-bold text-[length:var(--gf-text-sm)] uppercase tracking-[var(--gf-tracking-label)] whitespace-normal break-words transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-inset text-left md:text-center ${
                   activeIdx === i 
                     ? 'text-[var(--gf-ink)] bg-[var(--gf-bg)] border-l-2 md:border-l-0 md:border-b-2 border-[var(--gf-accent)]' 
                     : 'text-[var(--gf-ink-muted)] hover:text-[var(--gf-ink)] hover:bg-[var(--gf-bg)]/50'
                 }`}
               >
                 {row.label}
               </button>
             </React.Fragment>
           );
         })}
      </div>
      <div 
        id={`layer-panel-${activeRow.id}`}
        role="region"
        aria-labelledby={`layer-tab-${activeRow.id}`}
        className="p-6 md:p-10"
      >
         <h3 className="font-display text-[length:var(--gf-h3)] font-semibold text-[var(--gf-ink)] mb-10">
           {activeRow.label}
         </h3>
         
         <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
           <div>
             <h4 className="text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] mb-3">
               {headers[1] || "Definition"}
             </h4>
             <p className="text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)]">
               <MarkdownInline text={activeRow.description} />
             </p>
           </div>
           <div>
             <h4 className="text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] mb-3">
               {headers[2] || "Example"}
             </h4>
             <p className="text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)]">
               <MarkdownInline text={activeRow.example} />
             </p>
           </div>
           <div className="md:col-span-2 border-t border-[var(--gf-border)] pt-8 grid md:grid-cols-2 gap-12">
             <div>
               <h4 className="text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] mb-3">
                 {activeRow.bypassLabel || headers[3] || "What Gets Past It"}
               </h4>
               <p className="text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)]">
                 <MarkdownInline text={activeRow.bypass} />
               </p>
             </div>
             <div>
               <h4 className="text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] mb-3">
                 {headers[4] || "Strength"}
               </h4>
               <div className="inline-flex items-center text-[length:var(--gf-text-sm)] font-medium text-[var(--gf-accent-violet)] bg-[var(--gf-accent-violet-soft)] px-4 py-2 rounded-sm">
                 <MarkdownInline text={activeRow.strengthLabel} />
               </div>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
}