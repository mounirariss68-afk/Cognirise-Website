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
    <div className="space-y-7" data-guardrails-tool="four-layer-comparison">
      <div className="grid gap-8 border border-[var(--gf-border)] bg-[var(--gf-surface)] p-6 shadow-sm lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,.75fr)] md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gf-accent-coral)] opacity-[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
        
        <figure className="min-w-0 border border-[var(--gf-border)] bg-[var(--gf-bg)] p-6 md:p-8 relative z-10" aria-labelledby="guardrails-dataflow-title">
          <figcaption id="guardrails-dataflow-title" className="mb-8">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gf-ink-muted)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedStyle.accent }} />
              Customer-data flow · selected boundary
            </span>
            <p className="mt-3 text-[length:var(--gf-text-base)] leading-relaxed text-[var(--gf-ink-muted)] max-w-[50ch]">{selectedStyle.boundary}</p>
          </figcaption>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <FlowNode title="Customer data" body={selectedLayer.id === "architecture" ? "Scoped records" : "Available records"} />
            <FlowArrow label={selectedLayer.id === "architecture" ? "scope" : "context"} />
            <FlowNode title="AI model" body={reachesAi} emphasis />
            <FlowArrow label={selectedLayer.id === "runtime" ? "check after model" : "response"} accent={selectedLayer.id === "runtime" ? selectedStyle.accent : undefined} />
            <FlowNode title="Delivery" body={selectedLayer.id === "runtime" ? "Runtime gate before user" : "User or connected system"} />
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="border-l-[3px] bg-[var(--gf-surface)] p-5 text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink)] shadow-sm" style={{ borderColor: selectedStyle.accent }}>
              <strong className="block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)] mb-2">What reaches AI</strong>
              {reachesAi}
            </div>
            <div className="border border-[var(--gf-border)] border-dashed bg-[var(--gf-surface)] p-5 text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink-muted)]">
              <strong className="block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)] mb-2">Limitation</strong>
              <MarkdownInline text={selectedLayer.limitation} />
            </div>
          </div>
        </figure>

        <aside id="guardrails-layer-detail" aria-live="polite" className="min-w-0 border border-[var(--gf-border)] bg-[var(--gf-surface)] p-6 md:p-8 relative z-10 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--gf-bg)] font-mono text-[14px] font-bold shadow-sm transition-colors duration-300" style={{ borderColor: selectedStyle.accent, color: selectedStyle.accent }}>{selectedLayer.strength}</span>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">Selected enforcement layer</p>
          </div>
          <h3 className="mt-6 font-display text-[length:var(--gf-h3)] font-bold leading-tight tracking-tight text-[var(--gf-ink)]"><MarkdownInline text={selectedLayer.title} /></h3>
          <div className="mt-8 space-y-6 text-[length:var(--gf-text-base)] leading-relaxed">
            <div><h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)] mb-2">What it is</h4><p className="text-[var(--gf-ink)]"><MarkdownInline text={selectedLayer.whatItIs} /></p></div>
            <div className="border-t border-[var(--gf-border)] pt-6"><h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)] mb-2">Customer-data example</h4><p className="text-[var(--gf-ink)]"><MarkdownInline text={selectedLayer.customerDataExample} /></p></div>
            <div className="border-l-[3px] bg-[var(--gf-bg)] p-4 shadow-sm" style={{ borderColor: "var(--gf-accent-coral)" }}><h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--gf-accent-coral)] mb-1">Limitation</h4><p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)]"><MarkdownInline text={selectedLayer.limitation} /></p></div>
          </div>
        </aside>
      </div>

      <div className="overflow-x-auto border border-[var(--gf-border)] bg-[var(--gf-surface)] shadow-sm" aria-label="Four-layer enforcement comparison">
        <table className="w-full min-w-[50rem] table-fixed border-collapse text-left text-[length:var(--gf-text-sm)] sm:min-w-0">
          <caption className="sr-only">Select a layer to update the customer-data flow and detail above.</caption>
          <thead>
            <tr className="border-b-2 border-[var(--gf-border)] bg-[var(--gf-bg)]">
              {layers.tableHeaders.map((header) => <th key={header} scope="col" className="p-4 md:p-5 align-bottom font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)] whitespace-nowrap"><MarkdownInline text={header} /></th>)}
            </tr>
          </thead>
          <tbody>
            {layers.rows.map((layer, index) => {
              const selected = layer.id === selectedLayer.id;
              const style = layerStyle[layer.id];
              return (
                <tr key={layer.id} className="border-b border-[var(--gf-border)] last:border-0 transition-colors duration-300" style={{ backgroundColor: selected ? "var(--gf-bg)" : "var(--gf-surface)" }}>
                  <th scope="row" className="p-4 md:p-5 align-top relative">
                    <button
                      ref={(element) => { rowButtons.current[index] = element; }}
                      type="button"
                      data-guardrails-layer={layer.id}
                      aria-pressed={selected}
                      aria-controls="guardrails-layer-detail"
                      onClick={() => setSelectedLayerId(layer.id)}
                      onKeyDown={(event) => onLayerKeyDown(event, index)}
                      className="group w-full text-left font-display text-[length:var(--gf-text-lg)] font-bold leading-snug text-[var(--gf-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-offset-2 flex flex-col gap-2"
                    >
                      <span className="inline-block relative">
                        <MarkdownInline text={layer.title} />
                        <span className={`absolute -bottom-1 left-0 right-0 h-0.5 transition-all duration-300 ${selected ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100 opacity-50"}`} style={{ backgroundColor: style.accent, transformOrigin: "left" }} aria-hidden="true" />
                      </span>
                      {selected && <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: style.accent }}>Selected</span>}
                    </button>
                  </th>
                  <td className="break-words p-4 md:p-5 align-top leading-relaxed text-[var(--gf-ink)]"><MarkdownInline text={layer.whatItIs} /></td>
                  <td className="break-words p-4 md:p-5 align-top leading-relaxed text-[var(--gf-ink-muted)]"><MarkdownInline text={layer.customerDataExample} /></td>
                  <td className="break-words p-4 md:p-5 align-top leading-relaxed text-[var(--gf-ink-muted)]"><MarkdownInline text={layer.limitation} /></td>
                  <td className="p-4 md:p-5 align-top">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-[var(--gf-surface)] font-mono text-[10px] font-bold shadow-sm" style={{ borderColor: style.accent, color: style.accent }}>{layer.strength}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--gf-ink-muted)]">of 4</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FlowNode({ title, body, emphasis = false }: { title: string; body: string; emphasis?: boolean }) {
  return <div className={`min-w-0 border p-4 transition-colors duration-300 ${emphasis ? "border-[var(--gf-ink)] bg-[var(--gf-surface)] shadow-md shadow-[var(--gf-ink)]/5" : "border-[var(--gf-border)] bg-[var(--gf-surface)] shadow-sm"}`}><strong className="block text-[length:var(--gf-text-base)] font-display tracking-tight text-[var(--gf-ink)] mb-1">{title}</strong><span className="block break-words text-[12px] leading-relaxed text-[var(--gf-ink-muted)]">{body}</span></div>;
}

function FlowArrow({ label, accent }: { label: string; accent?: string }) {
  return <div className="flex min-h-6 items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--gf-ink-muted)] sm:flex-col relative">
    <span className="hidden h-10 border-l-[2px] sm:block relative z-10" style={{ borderColor: accent ?? "var(--gf-border)" }} aria-hidden="true">
      {accent && <span className="absolute inset-0 w-[2px] bg-current opacity-50" style={{ color: accent }} />}
    </span>
    <span className="sm:hidden" aria-hidden="true">→</span>
    <span className="text-center">{label}</span>
  </div>;
}