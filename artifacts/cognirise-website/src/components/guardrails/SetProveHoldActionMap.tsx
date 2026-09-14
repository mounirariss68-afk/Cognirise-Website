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
      <div className="relative grid gap-5 lg:grid-cols-3" aria-label="Set, Prove and Hold action map">
        <div className="pointer-events-none absolute left-[31%] right-[31%] top-12 hidden border-t border-dashed border-[var(--gf-border)] lg:block" aria-hidden="true" />
        {phases.map((phase) => {
          const phaseActions = orderedActions(phase);
          const style = phaseStyle[phase.id];
          const layoutClass = phase.mode === "pre-launch-tests"
            ? "grid grid-cols-2 gap-3"
            : "flex flex-col gap-3";

          return (
            <section
              key={phase.id}
              className="relative min-w-0 border border-[var(--gf-border)] bg-[var(--gf-surface)] p-5 shadow-sm md:p-6"
              aria-labelledby={`guardrails-phase-${phase.id}`}
            >
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--gf-border)] pb-4">
                <div>
                  <h3 id={`guardrails-phase-${phase.id}`} className="font-display text-[32px] font-bold text-[var(--gf-ink)]">
                    {phase.title}
                  </h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--gf-ink-muted)]">
                    {phase.caption}
                  </p>
                </div>
                <span
                  className="shrink-0 border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider"
                  style={{ borderColor: style.accent, color: style.accent, backgroundColor: style.soft }}
                >
                  {phase.mode === "sequential" ? "In order" : phase.mode === "pre-launch-tests" ? "Four tests" : "In parallel"}
                </span>
              </div>

              <div className={`relative ${layoutClass}`}>
                {phase.mode === "sequential" && (
                  <span className="pointer-events-none absolute bottom-7 left-5 top-7 border-l border-dashed border-[var(--gf-border)]" aria-hidden="true" />
                )}
                {phase.mode === "concurrent" && (
                  <span className="pointer-events-none absolute bottom-7 left-5 top-7 border-l-2 border-dotted" style={{ borderColor: style.accent }} aria-hidden="true" />
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
                      className="relative z-10 flex min-h-14 min-w-0 items-center gap-3 border p-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-offset-2"
                      style={{
                        borderColor: selected ? style.accent : "var(--gf-border)",
                        backgroundColor: selected ? style.soft : "white",
                        boxShadow: selected ? `inset 4px 0 0 ${style.accent}` : undefined,
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white font-mono text-[11px] font-bold"
                        style={{ borderColor: selected ? style.accent : "var(--gf-border)", color: style.accent }}
                        aria-hidden="true"
                      >
                        {action.order}
                      </span>
                      <span className="min-w-0 text-[length:var(--gf-text-sm)] font-bold leading-snug text-[var(--gf-ink)]">
                        <MarkdownInline text={action.title} />
                        {selected && <span className="ml-2 font-mono text-[9px] uppercase tracking-wider" style={{ color: style.accent }}>Selected</span>}
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
        className="border border-[var(--gf-border)] bg-[var(--gf-surface)] p-6 shadow-sm md:p-9"
        style={{ borderTop: `4px solid ${phaseStyle[selectedAction.phase].accent}` }}
      >
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }}>
            {phaseStyle[selectedAction.phase].label}
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">Action {selectedAction.order} of 4</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--gf-ink-muted)]">Selected action detail</span>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <h3 id="guardrails-action-detail-title" className="font-display text-[length:var(--gf-h3)] font-bold leading-tight text-[var(--gf-ink)]">
              <MarkdownInline text={selectedAction.title} />
            </h3>
            <p className="mt-4 border-l-4 pl-4 text-[length:var(--gf-text-lg)] font-medium leading-relaxed text-[var(--gf-ink)]" style={{ borderColor: phaseStyle[selectedAction.phase].accent }}>
              <MarkdownInline text={selectedAction.statement} />
            </p>
            <ul className="mt-6 space-y-3">
              {selectedAction.explanation.map((item) => (
                <li key={item} className="flex gap-3 text-[length:var(--gf-text-base)] leading-relaxed text-[var(--gf-ink-muted)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }} aria-hidden="true" />
                  <MarkdownInline text={item} />
                </li>
              ))}
            </ul>
          </div>
          <aside className="space-y-5 border border-[var(--gf-border)] bg-[var(--gf-bg)] p-5">
            <div>
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">Owner</h4>
              <p className="mt-2 font-bold text-[length:var(--gf-text-base)] text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.owner} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-5">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">{selectedAction.outputOrCadence.label}</h4>
              <p className="mt-2 text-[length:var(--gf-text-sm)] font-medium leading-relaxed text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.outputOrCadence.value} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-5">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-accent-coral)]">Failure condition</h4>
              <p className="mt-2 text-[length:var(--gf-text-sm)] leading-relaxed text-[var(--gf-ink-muted)]"><MarkdownInline text={selectedAction.failureCondition} /></p>
            </div>
            <blockquote className="border-t border-[var(--gf-border)] pt-5 text-[length:var(--gf-text-sm)] italic leading-relaxed text-[var(--gf-ink)]">
              <span className="mb-2 block font-mono text-[10px] not-italic font-bold uppercase tracking-widest text-[var(--gf-ink-muted)]">Callout</span>
              <MarkdownInline text={selectedAction.callout} />
            </blockquote>
          </aside>
        </div>
      </section>
    </div>
  );
}