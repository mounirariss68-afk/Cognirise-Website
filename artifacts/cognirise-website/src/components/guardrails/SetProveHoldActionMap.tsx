import React, { useRef, useState } from "react";
import type { SetProveHoldGuardrailsContent } from "@workspace/api-zod";
import { MarkdownInline } from "./MarkdownInline";

type Action = SetProveHoldGuardrailsContent["actions"][number];
type Phase = SetProveHoldGuardrailsContent["overview"]["phases"][number];

const phaseStyle: Record<Action["phase"], { accent: string; soft: string; label: string }> = {
  set: { accent: "var(--gf-accent-violet)", soft: "var(--gf-accent-violet-soft)", label: "Set" },
  prove: { accent: "var(--gf-accent)", soft: "color-mix(in srgb, var(--gf-accent) 12%, white)", label: "Prove" },
  hold: { accent: "var(--gf-accent-coral)", soft: "color-mix(in srgb, var(--gf-accent-coral) 12%, white)", label: "Hold" },
};

export function SetProveHoldActionMap({
  phases,
  actions,
}: {
  phases: SetProveHoldGuardrailsContent["overview"]["phases"];
  actions: Action[];
}) {
  const [selectedActionId, setSelectedActionId] = useState(actions[0]?.id ?? "");
  const actionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedAction = actions.find((action) => action.id === selectedActionId) ?? actions[0];

  if (!selectedAction) return null;

  const selectByIndex = (index: number) => {
    const next = (index + actions.length) % actions.length;
    setSelectedActionId(actions[next].id);
    actionRefs.current[next]?.focus();
  };

  const onActionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectByIndex(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectByIndex(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectByIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectByIndex(actions.length - 1);
    }
  };

  const orderedActions = (phase: Phase) =>
    phase.actionIds
      .map((id) => actions.find((action) => action.id === id))
      .filter((action): action is Action => Boolean(action));

  return (
    <div className="space-y-7" data-guardrails-tool="action-map">
      <div className="relative grid gap-6 lg:grid-cols-3" aria-label="Set, Prove and Hold action map">
        <div className="pointer-events-none absolute left-[31%] right-[31%] top-12 hidden border-t-2 border-dashed border-[var(--gf-border)] lg:block" aria-hidden="true" />
        {phases.map((phase) => {
          const phaseActions = orderedActions(phase);
          const style = phaseStyle[phase.id];
          const layoutClass = phase.mode === "pre-launch-tests"
            ? "grid grid-cols-2 gap-4"
            : "flex flex-col gap-4";

          return (
            <section
              key={phase.id}
              className="relative min-w-0 border border-[var(--gf-border)] bg-[var(--gf-surface)] p-6 md:p-8 shadow-sm transition-colors hover:border-[var(--gf-border)]/80"
              aria-labelledby={`guardrails-phase-${phase.id}`}
            >
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--gf-border)] pb-6 relative">
                <div className="absolute -top-6 -left-6 w-12 h-12 rounded-br-[2rem] bg-gradient-to-br from-transparent to-current opacity-[0.03]" style={{ color: style.accent }} aria-hidden="true" />
                <div className="relative z-10">
                  <h3 id={`guardrails-phase-${phase.id}`} className="font-display text-[40px] font-bold tracking-tight text-[var(--gf-ink)] leading-none">
                    {phase.title}
                  </h3>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">
                    {phase.caption}
                  </p>
                </div>
                <span
                  className="shrink-0 border px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider relative z-10 rounded-sm"
                  style={{ borderColor: style.accent, color: style.accent, backgroundColor: style.soft }}
                >
                  {phase.mode === "sequential" ? "In order" : phase.mode === "pre-launch-tests" ? "Four tests" : "In parallel"}
                </span>
              </div>

              <div className={`relative ${layoutClass}`}>
                {phase.mode === "sequential" && (
                  <span className="pointer-events-none absolute bottom-8 left-6 top-8 border-l-2 border-dashed border-[var(--gf-border)]" aria-hidden="true" />
                )}
                {phase.mode === "concurrent" && (
                  <span className="pointer-events-none absolute bottom-8 left-6 top-8 border-l-2 border-dotted" style={{ borderColor: style.accent }} aria-hidden="true" />
                )}
                {phaseActions.map((action) => {
                  const index = actions.findIndex((item) => item.id === action.id);
                  const selected = selectedAction.id === action.id;
                  return (
                    <button
                      key={action.id}
                      ref={(element) => { actionRefs.current[index] = element; }}
                      type="button"
                      data-guardrails-action={action.id}
                      aria-pressed={selected}
                      aria-controls="guardrails-action-detail"
                      onClick={() => setSelectedActionId(action.id)}
                      onKeyDown={(event) => onActionKeyDown(event, index)}
                      className={`group relative z-10 flex min-h-[4rem] min-w-0 ${phase.mode === "pre-launch-tests" ? "flex-col items-start gap-3" : "items-center gap-4"} border p-4 text-left transition-all duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-accent)] focus-visible:ring-offset-2 overflow-hidden`}
                      style={{
                        borderColor: selected ? style.accent : "var(--gf-border)",
                        backgroundColor: selected ? style.soft : "var(--gf-bg)",
                        boxShadow: selected ? `inset 4px 0 0 ${style.accent}, 0 4px 12px rgba(0,0,0,0.02)` : undefined,
                      }}
                    >
                      <span className={`absolute inset-0 bg-gradient-to-r from-transparent to-current opacity-0 transition-opacity duration-300 ${!selected ? "group-hover:opacity-[0.02]" : ""}`} style={{ color: style.accent }} aria-hidden="true" />
                      
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-[var(--gf-surface)] font-mono text-[12px] font-bold shadow-sm transition-transform duration-300 group-hover:scale-110"
                        style={{ borderColor: selected ? style.accent : "var(--gf-border)", color: selected ? style.accent : "var(--gf-ink-muted)" }}
                        aria-hidden="true"
                      >
                        {action.order}
                      </span>
                      <span className="min-w-0 text-[length:var(--gf-text-base)] font-bold leading-tight text-[var(--gf-ink)] group-hover:text-[var(--gf-accent)] transition-colors">
                        <MarkdownInline text={action.title} />
                        {selected && <span className="ml-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: style.accent }}>Selected</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section
        id="guardrails-action-detail"
        data-guardrails-action-detail={selectedAction.id}
        aria-live="polite"
        aria-labelledby="guardrails-action-detail-title"
        className="border border-[var(--gf-border)] bg-[var(--gf-surface)] p-8 md:p-12 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }} aria-hidden="true" />
        <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }} aria-hidden="true" />

        <div className="mb-8 flex flex-wrap items-center gap-4 relative z-10">
          <span className="px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white rounded-sm shadow-sm" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }}>
            {phaseStyle[selectedAction.phase].label}
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)] border-l-2 border-[var(--gf-border)] pl-4">Action {selectedAction.order} of 4</span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--gf-ink-muted)]">Selected action detail</span>
        </div>
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_22rem] relative z-10">
          <div className="min-w-0">
            <h3 id="guardrails-action-detail-title" className="font-display text-[length:var(--gf-h3)] font-bold leading-[1.1] tracking-tight text-[var(--gf-ink)] mb-8">
              <MarkdownInline text={selectedAction.title} />
            </h3>
            <p className="border-l-[3px] pl-6 py-1 text-[length:var(--gf-text-xl)] font-medium leading-relaxed text-[var(--gf-ink)]" style={{ borderColor: phaseStyle[selectedAction.phase].accent }}>
              <MarkdownInline text={selectedAction.statement} />
            </p>
            <ul className="mt-10 space-y-4">
              {selectedAction.explanation.map((item) => (
                <li key={item} className="flex gap-4 text-[length:var(--gf-text-lg)] leading-relaxed text-[var(--gf-ink-muted)] group">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }} aria-hidden="true" />
                  <MarkdownInline text={item} />
                </li>
              ))}
            </ul>
          </div>
          <aside className="space-y-6 border border-[var(--gf-border)] bg-[var(--gf-bg)] p-8 relative">
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[var(--gf-border)] -mt-px -mr-px bg-[var(--gf-surface)] pointer-events-none" aria-hidden="true" />
            
            <div>
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gf-ink-muted)]">Owner</h4>
              <p className="mt-2 font-display font-bold text-[length:var(--gf-text-lg)] tracking-tight text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.owner} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-6">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gf-ink-muted)]">{selectedAction.outputOrCadence.label}</h4>
              <p className="mt-2 text-[length:var(--gf-text-base)] font-medium leading-relaxed text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.outputOrCadence.value} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-6">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gf-accent-coral)]">Failure condition</h4>
              <p className="mt-2 text-[length:var(--gf-text-base)] leading-relaxed text-[var(--gf-ink-muted)]"><MarkdownInline text={selectedAction.failureCondition} /></p>
            </div>
            <blockquote className="border-t-2 border-[var(--gf-border)] border-dashed pt-6 text-[length:var(--gf-text-sm)] italic leading-relaxed text-[var(--gf-ink-muted)] bg-[var(--gf-surface)] -mx-8 -mb-8 p-8 mt-2">
              <span className="mb-3 block font-mono text-[10px] not-italic font-bold uppercase tracking-[0.2em] text-[var(--gf-ink-muted)]">Callout</span>
              <MarkdownInline text={selectedAction.callout} />
            </blockquote>
          </aside>
        </div>
      </section>
    </div>
  );
}