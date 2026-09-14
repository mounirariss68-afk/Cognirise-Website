import React, { useState, useRef } from "react";
import type { GuardrailsLegacyContent } from "@workspace/api-zod";
import { MarkdownInline } from "./MarkdownInline";

export function ExposureExplorer({ content }: { content: GuardrailsLegacyContent }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  const diagram = content.stoppingRule.diagram;
  const bands = diagram?.bands || [];
  
  if (bands.length === 0) return null;
  const activeBand = bands[activeIdx];
  const destination = diagram.destinations.find(d => d.id === activeBand.destination);
  const addition = diagram.additions.find(a => a.id === activeBand.additionId);
  const diagramSummaryId = "guardrails-exposure-diagram-summary";

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let newIdx = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') newIdx = (idx + 1) % bands.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') newIdx = (idx - 1 + bands.length) % bands.length;
    else if (e.key === 'Home') newIdx = 0;
    else if (e.key === 'End') newIdx = bands.length - 1;
    
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
        data-guardrails-print-summary="exposure"
        className="sr-only print:not-sr-only print:static print:block print:h-auto print:w-auto print:mb-6 print:overflow-visible print:whitespace-normal print:border-b print:border-[var(--gf-border)] print:pb-4 print:font-sans print:text-[12px] print:leading-relaxed"
      >
        <h3 className="font-bold">{diagram.title}</h3>
        <p><MarkdownInline text={diagram.description} /></p>
        <p>
          <strong><MarkdownInline text={diagram.kicker} /></strong>
          {" — "}
          <MarkdownInline text={diagram.heading} />
        </p>
        <p>
          <strong><MarkdownInline text={diagram.bandHeading} /></strong>
          {" / "}
          <strong><MarkdownInline text={diagram.destinationHeading} /></strong>
        </p>
        <ul>
          {bands.map((band) => {
            const bandDestination = diagram.destinations.find((item) => item.id === band.destination);
            const bandAddition = diagram.additions.find((item) => item.id === band.additionId);

            return (
              <li key={`accessible-${band.id}`} id={`exposure-band-${band.id}-accessible`}>
                <strong><MarkdownInline text={band.label} /></strong>
                {" — "}
                <MarkdownInline text={band.description} />
                {" "}
                <strong><MarkdownInline text={diagram.destinationHeading} /></strong>
                {": "}
                <MarkdownInline text={bandDestination?.label || ""} />
                {" — "}
                <MarkdownInline text={bandDestination?.description || ""} />
                {" "}
                <strong>Additional control:</strong>{" "}
                <MarkdownInline text={bandAddition?.label || "None"} />
              </li>
            );
          })}
        </ul>
        <p>
          <strong>Destinations:</strong>{" "}
          {diagram.destinations.map((item, index) => (
            <React.Fragment key={`destination-${item.id}`}>
              {index > 0 ? "; " : ""}
              <MarkdownInline text={item.label} />
              {" — "}
              <MarkdownInline text={item.description} />
            </React.Fragment>
          ))}
        </p>
        <p>
          <strong>Additions:</strong>{" "}
          {diagram.additions.map((item, index) => (
            <React.Fragment key={`addition-${item.id}`}>
              {index > 0 ? "; " : ""}
              <MarkdownInline text={item.label} />
            </React.Fragment>
          ))}
        </p>
        <p><MarkdownInline text={diagram.note} /></p>
        <p><MarkdownInline text={diagram.footer} /></p>
      </div>
      <div 
        role="group" 
        aria-label={diagram.heading}
        className="grid grid-cols-1 md:grid-cols-5 border-b border-[var(--gf-border)]"
      >
         {bands.map((band, i) => (
           <button 
             key={band.id}
             ref={(el) => { buttonRefs.current[i] = el; }}
             role="button"
             type="button"
             aria-pressed={activeIdx === i}
             aria-controls={`exposure-panel-${band.id}`}
              aria-describedby={`exposure-band-${band.id}-accessible`}
             id={`exposure-tab-${band.id}`}
             onClick={() => setActiveIdx(i)}
             onKeyDown={(e) => handleKeyDown(e, i)}
             className={`min-w-0 min-h-[48px] px-4 py-4 font-bold text-[length:var(--gf-text-sm)] tracking-[var(--gf-tracking-label)] whitespace-normal break-words motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-inset text-left md:text-center ${
               activeIdx === i 
                 ? 'text-[var(--gf-ink)] bg-[var(--gf-bg)] border-l-2 md:border-l-0 md:border-b-2 border-[var(--gf-accent)]' 
                 : 'text-[var(--gf-ink-muted)] hover:text-[var(--gf-ink)] hover:bg-[var(--gf-bg)]/50'
             }`}
           >
             {band.label}
           </button>
         ))}
      </div>
      <div 
        id={`exposure-panel-${activeBand.id}`}
        role="region"
        aria-labelledby={`exposure-tab-${activeBand.id}`}
        className="p-6 md:p-10 min-h-[240px] flex flex-col justify-center"
      >
         <h3 className="font-display text-[length:var(--gf-h3)] font-semibold text-[var(--gf-ink)] leading-tight mb-8">
           <MarkdownInline text={activeBand.description} />
         </h3>
         
         <div className="pl-6 border-l-2 border-[var(--gf-accent)] md:ml-4">
           <h4 className="text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] mb-3">
             {diagram.destinationHeading}
           </h4>
           <div className="text-[length:var(--gf-text-lg)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)] font-medium">
             <strong className="block text-[length:var(--gf-text-xl)] mb-1">{destination?.label}</strong>
             {destination?.description !== addition?.label && (
               <span className="text-[var(--gf-ink-muted)] block mb-3 font-normal"><MarkdownInline text={destination?.description || ""} /></span>
             )}
             {addition && (
               <div className="inline-flex items-center text-[length:var(--gf-text-sm)] font-bold text-[var(--gf-ink)] bg-[var(--gf-bg)] border border-[var(--gf-border)] px-3 py-1.5 rounded-sm">
                 <MarkdownInline text={addition.label} />
               </div>
             )}
           </div>
         </div>
      </div>
    </div>
  );
}