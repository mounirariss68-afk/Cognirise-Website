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
    <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-8 lg:gap-16" data-guardrails-tool="four-layer-comparison">
      
      {/* Ladder Selection */}
      <div className="flex flex-col gap-3" role="tablist" aria-label="Enforcement Layers">
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
              className={`flex items-center gap-4 text-left p-4 md:p-5 rounded-lg border transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gf-accent)] ${selected ? "border-[var(--gf-border)] bg-[var(--gf-surface)] shadow-md" : "border-transparent bg-transparent hover:bg-[var(--gf-surface)]/50 hover:border-[var(--gf-border)]/50"}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[16px] font-bold shadow-sm" style={{ backgroundColor: selected ? style.accent : "var(--gf-bg)", color: selected ? "white" : "var(--gf-ink)", border: selected ? "none" : "1px solid var(--gf-border)" }}>
                {layer.strength}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--gf-ink-muted)] mb-1">Layer {layer.strength}</div>
                <h3 className={`font-display text-[18px] font-semibold leading-tight truncate ${selected ? "text-[var(--gf-ink)]" : "text-[var(--gf-ink-muted)] group-hover:text-[var(--gf-ink)]"}`}>
                  <MarkdownInline text={layer.title} />
                </h3>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < layer.strength ? "" : "opacity-20"}`} style={{ backgroundColor: i < layer.strength ? (selected ? style.accent : "var(--gf-ink-muted)") : "var(--gf-border)" }} aria-hidden="true" />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Scenario Illustration */}
      <div id="layer-detail-panel" role="tabpanel" aria-labelledby={`guardrails-layer-tab-${selectedLayer.id}`} aria-live="polite" className="relative bg-[var(--gf-surface)] border border-[var(--gf-border)] p-6 md:p-10 rounded-xl shadow-sm">

        <div className="mb-10">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-3">What it is</h4>
          <p className="text-[18px] leading-[1.6] text-[var(--gf-ink)] font-medium">
            <MarkdownInline text={selectedLayer.whatItIs} />
          </p>
        </div>

        <div className="bg-[var(--gf-bg)] border border-[var(--gf-border)] p-6 md:p-8 rounded-lg mb-8 shadow-sm">
          <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-2">Customer-data example</h4>
          <p className="text-[16px] leading-[1.65] text-[var(--gf-ink)]">
            <MarkdownInline text={selectedLayer.customerDataExample} />
          </p>
        </div>
        
        <figure className="relative" aria-labelledby="guardrails-dataflow-title">
          <figcaption id="guardrails-dataflow-title" className="mb-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] flex items-center gap-2 mb-2 text-[var(--gf-ink)]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedStyle.accent }} />
              Customer-data flow boundary
            </span>
            <p className="text-[15px] leading-[1.6] text-[var(--gf-ink-muted)] max-w-[45ch]">
              {selectedStyle.boundary}
            </p>
          </figcaption>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-[3rem] left-0 right-0 border-t-2 border-dashed border-[var(--gf-border)] hidden md:block" aria-hidden="true" />
            
            <div className="grid gap-6 md:grid-cols-3 relative z-10">
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
        </figure>

        <div className="mt-10 pt-8 border-t border-[var(--gf-border)] grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-2">What reaches AI</h4>
            <p className="text-[15px] leading-[1.6] text-[var(--gf-ink)] font-medium">{reachesAi}</p>
          </div>
          <div className="border-l-2 pl-5" style={{ borderColor: "var(--gf-accent-coral)" }}>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-accent-coral)] mb-2">Limitation</h4>
            <p className="text-[15px] leading-[1.6] text-[var(--gf-ink-muted)]">
              <MarkdownInline text={selectedLayer.limitation} />
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function FlowNode({ title, body, emphasis = false, label, accent }: { title: string; body: string; emphasis?: boolean; label?: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex-1 border p-5 rounded-lg transition-colors duration-300 ${emphasis ? "border-[var(--gf-ink)] bg-[var(--gf-bg)] shadow-md shadow-[var(--gf-ink)]/5" : "border-[var(--gf-border)] bg-[var(--gf-bg)] shadow-sm"}`}>
        <strong className="block text-[18px] font-display font-semibold tracking-tight text-[var(--gf-ink)] mb-2">{title}</strong>
        <span className="block text-[13px] leading-[1.6] text-[var(--gf-ink-muted)]">{body}</span>
      </div>
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-center md:text-right md:pr-4" style={{ color: accent || "var(--gf-ink-muted)" }}>
          {label} →
        </div>
      )}
    </div>
  );
}
