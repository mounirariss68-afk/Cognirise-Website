import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Kicker } from "./Kicker";

interface ExposureDiagram {
  title: string;
  description: string;
  kicker: string;
  heading: string;
  bandHeading: string;
  destinationHeading: string;
  bands: Array<{ id: string; label: string; description: string; destination: string; additionId: string }>;
  destinations: Array<{ id: string; label: string; description: string }>;
  additions: Array<{ id: string; label: string }>;
  footer: string;
  note: string;
}

export function ExposureInteraction({ diagram }: { diagram: ExposureDiagram }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const connectorRef = useRef<HTMLDivElement>(null);
  const [centres, setCentres] = useState<Array<{ from: number; to: number }>>([]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const activeId = hovered || pinned;
  useLayoutEffect(() => {
    const map = mapRef.current;
    const connector = connectorRef.current;
    if (!map || !connector) return;
    const measure = () => {
      const frame = connector.getBoundingClientRect();
      if (!frame.height) return;
      const center = (element: Element | null) => {
        const rect = element?.getBoundingClientRect();
        return rect ? ((rect.top + rect.height / 2 - frame.top) / frame.height) * 100 : 50;
      };
      const next = diagram.bands.map((band) => ({
        from: center(map.querySelector(`[data-guardrails-band="${band.id}"]`)),
        to: center(map.querySelector(`[data-guardrails-destination="${band.destination}"]`)),
      }));
      setCentres((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(map);
    for (const node of map.querySelectorAll("button,[data-guardrails-destination]")) observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [diagram]);

  const colorMap: Record<string, string> = {
    prompt: "var(--gf-layer-prompt)",
    runtime: "var(--gf-layer-runtime)",
    architecture: "var(--gf-layer-arch)",
  };

  return (
    <div className="w-full font-sans" role="region" aria-label={diagram.title} aria-describedby="guardrails-exposure-description">
      <p id="guardrails-exposure-description" className="sr-only">{diagram.description}</p>
      <div className="mb-6">
        <Kicker>{diagram.kicker}</Kicker>
        <h3 className="mt-4 font-display text-[length:var(--gf-h4)] font-bold text-[var(--gf-ink)]">{diagram.heading}</h3>
      </div>
      <div className="mb-8 flex justify-between items-end border-b border-[var(--gf-border)] pb-4">
        <span className="text-[length:var(--gf-text-xs)] font-bold tracking-[var(--gf-tracking-kicker)] text-[var(--gf-ink-muted)] uppercase">
          {diagram.bandHeading}
        </span>
        <span className="text-[length:var(--gf-text-xs)] font-bold tracking-[var(--gf-tracking-kicker)] text-[var(--gf-ink-muted)] uppercase hidden md:block">
          {diagram.destinationHeading}
        </span>
      </div>

      {/* Mobile view: Stacked explicitly */}
      <div className="md:hidden flex flex-col gap-4">
        {diagram.bands.map((band) => {
          const dest = diagram.destinations.find((d) => d.id === band.destination);
          const addition = diagram.additions.find((a) => a.id === band.additionId);
          const isActive = activeId === band.id;
          
          return (
            <button
              key={band.id}
              data-guardrails-band={band.id}
              aria-pressed={pinned === band.id}
              onClick={() => setPinned(pinned === band.id ? null : band.id)}
              className={`text-left p-5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] ${
                isActive ? "bg-[var(--gf-surface)] border-[var(--gf-ink)]" : "bg-transparent border-[var(--gf-border)]"
              }`}
            >
              <p className="font-semibold text-[length:var(--gf-text-base)] text-[var(--gf-ink)]">{band.label}</p>
              <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] mt-1 mb-4">{band.description}</p>
              <div className="pt-4 border-t border-[var(--gf-border)] flex flex-wrap items-baseline gap-2">
                <span className="font-display font-bold text-[length:var(--gf-text-base)] text-[var(--gf-ink)]">
                  {dest?.label}
                </span>
                {(addition || dest?.description) && (
                  <span className="text-[length:var(--gf-text-sm)] font-bold text-[var(--gf-ink)]">
                    {addition ? addition.label : dest?.description}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop view: Nodes and SVG Connectors */}
      <div ref={mapRef} className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(var(--gf-exposure-connector-min),0.28fr)_minmax(0,1fr)] gap-4 lg:gap-8 items-stretch relative min-h-[var(--gf-exposure-min-height)]">
        <div className="flex min-w-0 flex-col gap-4 py-6">
          {diagram.bands.map((band) => {
            const isActive = activeId === band.id;
            const targetColor = colorMap[band.destination] || "var(--gf-ink)";
            
            return (
              <button
                key={`left-${band.id}`}
                data-guardrails-band={band.id}
                aria-pressed={pinned === band.id}
                onClick={() => setPinned(pinned === band.id ? null : band.id)}
                onMouseEnter={() => setHovered(band.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(band.id)}
                onBlur={() => setHovered(null)}
                className={`text-left p-4 rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] ${
                  isActive ? "bg-[var(--gf-surface)] border-[var(--gf-ink)]" : "bg-transparent border-[var(--gf-border)] hover:border-[var(--gf-ink)]/40"
                }`}
                style={isActive ? { borderRightColor: targetColor, borderRightWidth: "4px" } : {}}
              >
                <p className="font-semibold text-[length:var(--gf-text-base)] text-[var(--gf-ink)]">{band.label}</p>
                <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] mt-1">{band.description}</p>
              </button>
            );
          })}
        </div>

        <div ref={connectorRef} className="relative min-w-0">
          <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            {diagram.bands.map((band, idx) => {
              const destIdx = diagram.destinations.findIndex(d => d.id === band.destination);
              const y1 = centres[idx]?.from ?? 10 + idx * 20;
              const y2 = centres[idx]?.to ?? (destIdx === 0 ? 16 : destIdx === 1 ? 50 : 84);
              
              const isActive = activeId === band.id;
              const strokeColor = isActive ? colorMap[band.destination] : 'var(--gf-border)';
              const strokeWidth = isActive ? 3 : 1.5;
              
              return (
                <path 
                  key={band.id}
                  data-guardrails-connector={band.id}
                  d={`M 0 ${y1} C 40 ${y1}, 60 ${y2}, 100 ${y2}`} 
                  fill="none" 
                  stroke={strokeColor} 
                  strokeWidth={strokeWidth} 
                  vectorEffect="non-scaling-stroke"
                  className="transition-colors duration-300"
                />
              );
            })}
          </svg>
        </div>

        <div className="flex min-w-0 flex-col justify-around gap-6 py-4">
          {diagram.destinations.map((dest) => {
            const activeBand = activeId ? diagram.bands.find(b => b.id === activeId) : null;
            const isActive = activeBand?.destination === dest.id;
            const nodeColor = colorMap[dest.id] || "var(--gf-ink)";
            
            return (
              <div 
                key={`right-${dest.id}`}
                data-guardrails-destination={dest.id}
                className={`p-5 rounded-sm border transition-colors ${
                  isActive ? "bg-[var(--gf-surface)] border-[var(--gf-ink)]" : "bg-transparent border-[var(--gf-border)]"
                }`}
                style={isActive ? { borderLeftColor: nodeColor, borderLeftWidth: "4px" } : {}}
              >
                <div className="flex items-baseline gap-2">
                  <h4 className="font-display text-[length:var(--gf-text-base)] font-bold text-[var(--gf-ink)]">{dest.label}</h4>
                  <span className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)]">{dest.description}</span>
                </div>
                
                <div className="mt-3 min-h-[var(--gf-selection-summary-min-height)]">
                  {isActive && activeBand?.additionId && (
                    <p className="text-[length:var(--gf-text-sm)] font-bold text-[var(--gf-ink)] pt-3 border-t border-[var(--gf-border)]">
                      {diagram.additions.find(a => a.id === activeBand.additionId)?.label}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="mt-6 grid gap-3 border-t border-[var(--gf-border)] pt-5 sm:grid-cols-2"
        aria-label="Static exposure to enforcement relationships"
      >
        {diagram.bands.map((band) => {
          const destination = diagram.destinations.find((item) => item.id === band.destination);
          const addition = diagram.additions.find((item) => item.id === band.additionId);
          return (
            <p
              key={band.id}
              data-guardrails-relationship={band.id}
              className="border-l-2 border-[var(--gf-border)] pl-3 text-[length:var(--gf-text-sm)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)]"
            >
              <strong>{band.label}</strong>{" → "}{destination?.label}
              {addition ? `, ${addition.label}` : ""}
            </p>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-[var(--gf-border)] pt-4">
        <p className="text-[length:var(--gf-text-sm)] font-semibold text-[var(--gf-ink)]">{diagram.footer}</p>
        <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)]">{diagram.note}</p>
        
        <div className="mt-2 min-h-[var(--gf-selection-summary-min-height)]" aria-live="polite" data-guardrails-live-summary>
          {pinned ? (
            <span>
              {diagram.bands.find((band) => band.id === pinned)?.label}
              {" → "}
              {diagram.destinations.find((destination) => destination.id === diagram.bands.find((band) => band.id === pinned)?.destination)?.label}
              {(() => {
                const activeBand = diagram.bands.find((band) => band.id === pinned);
                const addition = diagram.additions.find((item) => item.id === activeBand?.additionId);
                return addition ? `, ${addition.label}` : "";
              })()}
            </span>
          ) : null}
        </div>
        {pinned && (
          <div>
            <button 
              data-guardrails-reset="exposure"
              onClick={() => setPinned(null)} 
              className="text-[length:var(--gf-text-sm)] font-bold text-[var(--gf-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] p-1 rounded"
            >
              Clear selection to restore overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
