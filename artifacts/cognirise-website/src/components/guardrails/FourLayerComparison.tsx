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
      <div className="grid gap-6 border border-[var(--gf-border)] bg-[var(--gf-surface)] p-5 shadow-sm lg:grid-cols-[minmax(0,1.25fr)_minmax(17rem,.75fr)] md:p-8">
        <figure className="min-w-0 border border-[var(--gf-border)] bg-[var(--gf-bg)] p-4 md:p-6" aria-labelledby="guardrails-dataflow-title">
          <figcaption id="guardrails-dataflow-title" className="mb-5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">Customer-data flow · selected boundary</span>
            <p className="mt-2 text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink-muted)]">{selectedStyle.boundary}</p>
          </figcaption>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <FlowNode title="Customer data" body={selectedLayer.id === "architecture" ? "Scoped records" : "Available records"} />
            <FlowArrow label={selectedLayer.id === "architecture" ? "scope" : "context"} />
            <FlowNode title="AI model" body={reachesAi} emphasis />
            <FlowArrow label={selectedLayer.id === "runtime" ? "check after model" : "response"} accent={selectedLayer.id === "runtime" ? selectedStyle.accent : undefined} />
            <FlowNode title="Delivery" body={selectedLayer.id === "runtime" ? "Runtime gate before user" : "User or connected system"} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border-l-4 bg-white p-3 text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink)]" style={{ borderColor: selectedStyle.accent }}>
              <strong className="block font-mono text-[9px] uppercase tracking-widest text-[var(--gf-ink-muted)]">What reaches AI</strong>
              {reachesAi}
            </div>
            <div className="border border-[var(--gf-border)] bg-white p-3 text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink-muted)]">
              <strong className="block font-mono text-[9px] uppercase tracking-widest text-[var(--gf-ink-muted)]">Limitation</strong>
              <MarkdownInline text={selectedLayer.limitation} />
            </div>
          </div>
        </figure>

        <aside id="guardrails-layer-detail" aria-live="polite" className="min-w-0 border border-[var(--gf-border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-[var(--gf-bg)] font-mono text-[11px] font-bold" style={{ borderColor: selectedStyle.accent, color: selectedStyle.accent }}>{selectedLayer.strength}</span>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">Selected enforcement layer</p>
          </div>
          <h3 className="mt-4 font-display text-[length:var(--gf-h3)] font-bold leading-tight text-[var(--gf-ink)]"><MarkdownInline text={selectedLayer.title} /></h3>
          <div className="mt-5 space-y-5 text-[length:var(--gf-text-sm)] leading-relaxed">
            <div><h4 className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">What it is</h4><p className="mt-1 text-[var(--gf-ink)]"><MarkdownInline text={selectedLayer.whatItIs} /></p></div>
            <div><h4 className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">Customer-data example</h4><p className="mt-1 text-[var(--gf-ink)]"><MarkdownInline text={selectedLayer.customerDataExample} /></p></div>
            <div className="border-l-4 bg-[var(--gf-bg)] p-3" style={{ borderColor: "var(--gf-accent-coral)" }}><h4 className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--gf-accent-coral)]">Limitation</h4><p className="mt-1 text-[var(--gf-ink-muted)]"><MarkdownInline text={selectedLayer.limitation} /></p></div>
          </div>
        </aside>
      </div>

      <div className="overflow-x-auto border border-[var(--gf-border)] bg-[var(--gf-surface)]" aria-label="Four-layer enforcement comparison">
        <table className="w-full min-w-[42rem] table-fixed border-collapse text-left text-[length:var(--gf-text-sm)] sm:min-w-0">
          <caption className="sr-only">Select a layer to update the customer-data flow and detail above.</caption>
          <thead>
            <tr className="border-b-2 border-[var(--gf-border)] bg-[var(--gf-bg)]">
              {layers.tableHeaders.map((header) => <th key={header} scope="col" className="p-3 align-bottom font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--gf-ink-muted)] md:p-4"><MarkdownInline text={header} /></th>)}
            </tr>
          </thead>
          <tbody>
            {layers.rows.map((layer, index) => {
              const selected = layer.id === selectedLayer.id;
              const style = layerStyle[layer.id];
              return (
                <tr key={layer.id} className="border-b border-[var(--gf-border)] last:border-0" style={{ backgroundColor: selected ? "var(--gf-bg)" : "white" }}>
                  <th scope="row" className="p-3 align-top md:p-4">
                    <button
                      ref={(element) => { rowButtons.current[index] = element; }}
                      type="button"
                      data-guardrails-layer={layer.id}
                      aria-pressed={selected}
                      aria-controls="guardrails-layer-detail"
                      onClick={() => setSelectedLayerId(layer.id)}
                      onKeyDown={(event) => onLayerKeyDown(event, index)}
                      className="w-full text-left font-bold leading-snug text-[var(--gf-ink)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)]"
                      style={{ textDecorationColor: selected ? style.accent : "transparent" }}
                    >
                      <MarkdownInline text={layer.title} />
                      {selected && <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider" style={{ color: style.accent }}>Selected</span>}
                    </button>
                  </th>
                  <td className="break-words p-3 align-top leading-relaxed text-[var(--gf-ink)] md:p-4"><MarkdownInline text={layer.whatItIs} /></td>
                  <td className="break-words p-3 align-top leading-relaxed text-[var(--gf-ink-muted)] md:p-4"><MarkdownInline text={layer.customerDataExample} /></td>
                  <td className="break-words p-3 align-top leading-relaxed text-[var(--gf-ink-muted)] md:p-4"><MarkdownInline text={layer.limitation} /></td>
                  <td className="p-3 align-top md:p-4"><span className="font-mono text-[11px] font-bold" style={{ color: style.accent }}>{layer.strength} of 4</span></td>
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
  return <div className={`min-w-0 border p-3 ${emphasis ? "border-[var(--gf-ink)] bg-white shadow-sm" : "border-[var(--gf-border)] bg-white"}`}><strong className="block text-[length:var(--gf-text-sm)] text-[var(--gf-ink)]">{title}</strong><span className="mt-1 block break-words text-[11px] leading-relaxed text-[var(--gf-ink-muted)]">{body}</span></div>;
}

function FlowArrow({ label, accent }: { label: string; accent?: string }) {
  return <div className="flex min-h-6 items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[var(--gf-ink-muted)] sm:flex-col">
    <span className="hidden h-8 border-l sm:block" style={{ borderColor: accent ?? "var(--gf-border)" }} aria-hidden="true" />
    <span className="sm:hidden" aria-hidden="true">↓</span>
    <span className="text-center">{label}</span>
  </div>;
}