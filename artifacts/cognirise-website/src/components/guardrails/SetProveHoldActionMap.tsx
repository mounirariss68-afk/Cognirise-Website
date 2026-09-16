import React, { useRef, useState } from "react";
import type { SetProveHoldGuardrailsContent } from "@workspace/api-zod";
import { MarkdownInline } from "./MarkdownInline";

type Action = SetProveHoldGuardrailsContent["actions"][number];
type Phase = SetProveHoldGuardrailsContent["overview"]["phases"][number];

const phaseStyle: Record<Action["phase"], { accent: string; label: string }> = {
  set: { accent: "var(--gf-accent-violet)", label: "Set" },
  prove: { accent: "var(--gf-accent)", label: "Prove" },
  hold: { accent: "var(--gf-accent-coral)", label: "Hold" },
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
    <div className="space-y-12" data-guardrails-tool="action-map">
      <div className="grid gap-10 lg:grid-cols-3" aria-label="Set, Prove and Hold action map">
        {phases.map((phase) => {
          const phaseActions = orderedActions(phase);
          const style = phaseStyle[phase.id];
          const isSet = phase.id === "set";
          const isProve = phase.id === "prove";
          const isHold = phase.id === "hold";

          return (
            <section
              key={phase.id}
              id={`guardrails-phase-${phase.id}`}
              className="relative min-w-0 scroll-mt-32"
              aria-labelledby={`guardrails-phase-title-${phase.id}`}
            >
              <div className="mb-6">
                <span
                  className="inline-block text-[11px] font-bold uppercase tracking-[0.16em] mb-2"
                  style={{ color: style.accent }}
                >
                  {phase.mode === "sequential" ? "In order" : phase.mode === "pre-launch-tests" ? "Four tests" : "In parallel"}
                </span>
                <h3 id={`guardrails-phase-title-${phase.id}`} className="font-display text-[28px] font-semibold tracking-tight text-[var(--gf-ink)] leading-none">
                  {phase.title}
                </h3>
                <p className="mt-2 text-[14px] font-medium text-[var(--gf-ink-muted)]">
                  {phase.caption}
                </p>
              </div>

              <div className={`relative ${isProve ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}`}>
                {isSet && (
                  <div className="absolute left-[19px] top-4 bottom-4 w-px bg-[var(--gf-border)]" aria-hidden="true" />
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
                      className={`group relative z-10 flex min-w-0 ${isProve ? "flex-col items-start p-4" : "items-center p-3"} text-left transition-all duration-300 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gf-accent)] focus-visible:outline-offset-2 overflow-hidden rounded-md ${selected ? "bg-[var(--gf-bg)] shadow-md border border-[var(--gf-border)]/50" : "bg-transparent hover:bg-[var(--gf-bg)]/50 border border-transparent"}`}
                    >
                      {selected && <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: style.accent }} aria-hidden="true" />}
                      {!selected && isHold && <div className="absolute left-0 top-3 bottom-3 w-[2px] opacity-30" style={{ backgroundColor: style.accent }} aria-hidden="true" />}

                      <div className={`flex items-center justify-center shrink-0 font-display text-[13px] font-bold ${isProve ? "mb-2 h-6 w-6 rounded-full bg-[var(--gf-surface)] border border-[var(--gf-border)] shadow-sm" : "w-10 h-10"}`}
                           style={{ color: selected ? style.accent : "var(--gf-ink-muted)" }}>
                        {action.order}
                      </div>

                      <span className={`min-w-0 font-medium leading-snug transition-colors ${isProve ? "text-[14px]" : "text-[15px]"} ${selected ? "text-[var(--gf-ink)]" : "text-[var(--gf-ink-muted)] group-hover:text-[var(--gf-ink)]"}`}>
                        <MarkdownInline text={action.title} />
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
        className="pt-10 border-t border-[var(--gf-border)] mt-12 bg-[var(--gf-surface)] p-8 md:p-12 shadow-sm rounded-xl border border-[var(--gf-border)]/50"
      >
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: phaseStyle[selectedAction.phase].accent }}>
            {phaseStyle[selectedAction.phase].label}
          </span>
          <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--gf-ink-muted)] border-l border-[var(--gf-border)] pl-3">
            {phaseStyle[selectedAction.phase].label} action {selectedAction.order} of 4
          </span>
        </div>

        <div className="grid gap-12 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <h3 id="guardrails-action-detail-title" className="font-display text-[32px] font-semibold leading-[1.1] tracking-tight text-[var(--gf-ink)] mb-6">
              <MarkdownInline text={selectedAction.title} />
            </h3>
            <p className="text-[20px] font-medium leading-[1.5] text-[var(--gf-ink)] text-balance">
              <MarkdownInline text={selectedAction.statement} />
            </p>
            <ul className="mt-8 space-y-4">
              {selectedAction.explanation.map((item) => (
                <li key={item} className="flex gap-4 text-[17px] leading-[1.6] text-[var(--gf-ink-muted)]">
                  <span className="mt-2.5 h-[5px] w-[5px] shrink-0 rounded-full" style={{ backgroundColor: phaseStyle[selectedAction.phase].accent }} aria-hidden="true" />
                  <MarkdownInline text={item} />
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-8 lg:pt-2 bg-[var(--gf-bg)] p-6 rounded-lg border border-[var(--gf-border)] shadow-sm">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">Owner</h4>
              <p className="mt-2 text-[16px] font-medium text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.owner} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-6">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">{selectedAction.outputOrCadence.label}</h4>
              <p className="mt-2 text-[16px] leading-[1.5] text-[var(--gf-ink)]"><MarkdownInline text={selectedAction.outputOrCadence.value} /></p>
            </div>
            <div className="border-t border-[var(--gf-border)] pt-6">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--gf-accent-coral)]">Failure condition</h4>
              <p className="mt-2 text-[15px] leading-[1.6] text-[var(--gf-ink-muted)]"><MarkdownInline text={selectedAction.failureCondition} /></p>
            </div>
            {selectedAction.callout && (
              <blockquote className="border-t border-[var(--gf-border)] pt-6 text-[15px] italic leading-[1.6] text-[var(--gf-ink-muted)]">
                <span className="mb-2 block text-[11px] not-italic font-bold uppercase tracking-[0.15em] text-[var(--gf-ink-muted)]">Callout</span>
                <MarkdownInline text={selectedAction.callout} />
              </blockquote>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
