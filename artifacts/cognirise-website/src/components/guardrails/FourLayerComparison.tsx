import React, { useRef, useState } from "react";
import type { SetProveHoldGuardrailsContent } from "@workspace/api-zod";
import { MarkdownInline } from "./MarkdownInline";

type Layer = SetProveHoldGuardrailsContent["layers"]["rows"][number];

const layerStyle: Record<Layer["id"], { accent: string; boundary: string }> = {
  policy: { accent: "var(--gf-ink)", boundary: "A policy guides people. It does not create a technical boundary in this flow." },
  prompt: { accent: "var(--gf-layer-prompt)", boundary: "The instruction reaches the AI with the available context; the AI is asked to apply the rule." },
  runtime: { accent: "var(--gf-layer-runtime)", boundary: "The model can receive the available context. An independent runtime gate sits after the model and before delivery." },
  architecture: { accent: "var(--gf-layer-arch)", boundary: "Scoping is before the model: only task-needed, authorised records reach the AI." },
};

export function FourLayerComparison({ layers }: { layers: SetProveHoldGuardrailsContent["layers"] }) {
  const [selectedLayerId, setSelectedLayerId] = useState<Layer["id"]>(
    layers.rows.find((layer) => layer.id === "architecture")?.id ?? layers.rows[0]?.id ?? "policy",
  );
  const rowButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedLayer = layers.rows.find((layer) => layer.id === selectedLayerId) ?? layers.rows[0];

  if (!selectedLayer) return null;

  const moveSelection = (current: number, direction: number) => {
    const next = (current + direction + layers.rows.length) % layers.rows.length;
    setSelectedLayerId(layers.rows[next].id);
    rowButtons.current[next]?.focus();
  };
  
  const onLayerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(index, 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(index, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedLayerId(layers.rows[0].id);
      rowButtons.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      const last = layers.rows.length - 1;
      setSelectedLayerId(layers.rows[last].id);
      rowButtons.current[last]?.focus();
    }
  };

  const selectedStyle = layerStyle[selectedLayer.id];
  const reachesAi = selectedLayer.id === "architecture"
    ? "Only authorised, task-needed customer records reach the AI."
    : "The AI can receive the available customer context before this layer acts.";

  return (
    <div className="space-y-12" data-guardrails-tool="four-layer-comparison">
      <style>{`
        @media (min-width: 1024px) {
          .gf-layer-grid { grid-template-rows: repeat(2, auto); }
          .gf-layer-card {
            display: grid;
            grid-row: span 2;
            grid-template-rows: subgrid;
          }
        }
      `}</style>
      
      {/* 4-Column Interactive Selector (IDAO Spatial Hierarchy) */}
      <div className="gf-layer-grid grid items-start gap-x-8 gap-y-10 border-t border-[var(--gf-border)] pt-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-y-0" role="tablist" aria-label="Enforcement Layers">
        {layers.rows.map((layer, index) => {
          const selected = layer.id === selectedLayerId;
          const style = layerStyle[layer.id];
          
          return (
            <button
              key={layer.id}
              type="button"
              data-guardrails-layer={layer.id}
              id={`guardrails-layer-tab-${layer.id}`}
              tabIndex={selected ? 0 : -1}
              ref={(el) => { rowButtons.current[index] = el; }}
              role="tab"
              aria-selected={selected}
              aria-controls="layer-detail-panel"
              onClick={() => setSelectedLayerId(layer.id)}
              onKeyDown={(e) => onLayerKeyDown(e, index)}
              className={`gf-layer-card flex flex-col text-left group transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gf-accent)] py-6 border-b-2 ${selected ? "border-[var(--gf-accent)]" : "border-transparent hover:border-[var(--gf-border)]"}`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: style.accent }}>
                <span>{`Layer ${layer.strength}`}</span>
                <span className={`w-2 h-2 rounded-full transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-30"}`} style={{ backgroundColor: style.accent }} />
              </div>
              <h3 className="mt-4 font-display text-[26px] font-semibold leading-[1.05] tracking-tight text-[var(--gf-ink)] group-hover:text-[var(--gf-accent)] transition-colors">
                <MarkdownInline text={layer.title} />
              </h3>
            </button>
          );
        })}
      </div>

      {/* Detail and Broad Canvas Dataflow Panel */}
      <div id="layer-detail-panel" role="tabpanel" aria-labelledby={`guardrails-layer-tab-${selectedLayer.id}`} aria-live="polite" className="border-t border-[var(--gf-border)] pt-12 relative">
        
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-16">
          {/* Text Detail Column */}
          <div className="relative z-10 space-y-10">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--gf-bg)] font-display text-[16px] font-bold shadow-sm" style={{ borderColor: selectedStyle.accent, color: selectedStyle.accent }}>
                  {selectedLayer.strength}
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)]">Layer {selectedLayer.strength} of 4</p>
              </div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-3">What it is</h4>
              <p className="text-[18px] leading-[1.6] text-[var(--gf-ink)] font-medium">
                <MarkdownInline text={selectedLayer.whatItIs} />
              </p>
            </div>
            
            <div className="border-t border-[var(--gf-border)] pt-8">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-3">Customer-data example</h4>
              <p className="text-[16px] leading-[1.65] text-[var(--gf-ink-muted)]">
                <MarkdownInline text={selectedLayer.customerDataExample} />
              </p>
            </div>
            
            <div className="border-l-2 pl-5 py-1" style={{ borderColor: "var(--gf-accent-coral)" }}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-accent-coral)] mb-2">Limitation</h4>
              <p className="text-[15px] leading-[1.6] text-[var(--gf-ink-muted)]">
                <MarkdownInline text={selectedLayer.limitation} />
              </p>
            </div>
          </div>

          {/* Dataflow Broad Canvas */}
          <figure className="relative z-10 bg-[var(--gf-surface)] border border-[var(--gf-border)] p-8 md:p-12 shadow-sm flex flex-col justify-center" aria-labelledby="guardrails-dataflow-title">
            <figcaption id="guardrails-dataflow-title" className="mb-12">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] flex items-center gap-2 mb-3 text-[var(--gf-ink)]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedStyle.accent }} />
                Customer-data flow boundary
              </span>
              <p className="text-[16px] leading-[1.65] text-[var(--gf-ink-muted)] max-w-[45ch]">
                {selectedStyle.boundary}
              </p>
            </figcaption>
            
            <div className="relative">
              {/* Connection Line */}
              <div className="absolute top-[3.5rem] left-0 right-0 border-t-2 border-dashed border-[var(--gf-border)] hidden md:block" aria-hidden="true" />
              
              <div className="grid gap-8 md:grid-cols-3 relative z-10">
                <FlowNode 
                  title="Customer data" 
                  body={selectedLayer.id === "architecture" ? "Scoped records" : "Available records"} 
                  label={selectedLayer.id === "architecture" ? "scope" : "context"}
                />
                <FlowNode 
                  title="AI model" 
                  body={reachesAi} 
                  emphasis 
                  label={selectedLayer.id === "runtime" ? "check after model" : "response"}
                  accent={selectedLayer.id === "runtime" ? selectedStyle.accent : undefined}
                />
                <FlowNode 
                  title="Delivery" 
                  body={selectedLayer.id === "runtime" ? "Runtime gate before user" : "User or connected system"} 
                />
              </div>
            </div>
            
            <div className="mt-12 bg-[var(--gf-bg)] border border-[var(--gf-border)] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: selectedStyle.accent }} aria-hidden="true" />
              <strong className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-2">What reaches AI</strong>
              <p className="text-[15px] leading-[1.6] text-[var(--gf-ink)] font-medium">{reachesAi}</p>
            </div>
          </figure>
        </div>
      </div>
    </div>
  );
}

function FlowNode({ title, body, emphasis = false, label, accent }: { title: string; body: string; emphasis?: boolean; label?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className={`flex-1 border p-6 transition-colors duration-300 ${emphasis ? "border-[var(--gf-ink)] bg-[var(--gf-bg)] shadow-md shadow-[var(--gf-ink)]/5" : "border-[var(--gf-border)] bg-[var(--gf-bg)] shadow-sm"}`}>
        <strong className="block text-[20px] font-display font-semibold tracking-tight text-[var(--gf-ink)] mb-3">{title}</strong>
        <span className="block text-[14px] leading-[1.6] text-[var(--gf-ink-muted)]">{body}</span>
      </div>
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-center md:text-right md:pr-4" style={{ color: accent || "var(--gf-ink-muted)" }}>
          {label} →
        </div>
      )}
    </div>
  );
}