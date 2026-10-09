import { useState } from "react";
import type { WorkflowLane, WorkflowStep } from "@/site/content/types";

const LANES: { id: WorkflowLane; label: string }[] = [
  { id: "system", label: "System" },
  { id: "ai", label: "AI" },
  { id: "person", label: "Person" },
];

/**
 * The who-does-what workflow: one worked example, five or six steps in three
 * lanes, the approval step highlighted. A click shows the step's owner, input,
 * output and what is logged. On a phone the steps list vertically with the lane
 * as a label. Everything is reachable by keyboard.
 */
export function Workflow({ steps, outro }: { steps: WorkflowStep[]; outro?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const columns = `repeat(${steps.length}, minmax(0, 1fr))`;

  return (
    <div className="mt-10">
      <style>{`
        .wf { --wf-ink:#102957; --wf-line:#cbd3e1; --wf-pink:#db509e; --wf-violet:#7659df; --wf-coral:#ff775d; }
        .wf-grid { display: grid; grid-template-columns: 92px 1fr; border: 1px solid var(--wf-ink); background: #fdfcfb; }
        .wf-lane-label { display: flex; align-items: center; padding: 14px 12px; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #6f7d94; border-bottom: 1px solid var(--wf-line); border-right: 1px solid var(--wf-line); }
        .wf-lane { display: grid; position: relative; border-bottom: 1px solid var(--wf-line); }
        .wf-lane:after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--wf-line); }
        .wf-cell { position: relative; z-index: 1; min-height: 92px; display: flex; align-items: center; justify-content: center; padding: 10px 8px; }
        .wf-step { appearance: none; border: 1px solid var(--wf-ink); background: #fff; color: var(--wf-ink); font: inherit; width: 100%; max-width: 150px; padding: 10px 10px 9px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 3px; transition: background .2s, color .2s; }
        .wf-step:hover { background: #f3f4f8; }
        .wf-step[aria-expanded="true"] { background: var(--wf-ink); color: #fff; }
        .wf-step:focus-visible { outline: 3px solid var(--wf-coral); outline-offset: 3px; }
        .wf-step span { font-size: 10px; letter-spacing: .1em; font-weight: 700; color: var(--wf-pink); }
        .wf-step strong { font: 600 15px/1.15 Comfortaa, sans-serif; letter-spacing: -.03em; }
        .wf-step.approval { border-width: 2px; border-color: var(--wf-pink); box-shadow: 0 0 0 4px rgba(219,80,158,.12); }
        .wf-step.approval span { color: var(--wf-pink); }
        .wf-step.approval em { font-style: normal; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--wf-pink); }
        .wf-step[aria-expanded="true"].approval em, .wf-step[aria-expanded="true"] span { color: #ffb3d6; }
        .wf-detail { margin-top: 18px; border: 1px solid var(--wf-ink); border-left: 4px solid var(--wf-pink); padding: 18px 20px; display: grid; gap: 12px 28px; grid-template-columns: repeat(2, minmax(0, 1fr)); background: #fff; }
        .wf-detail dt { font-size: 9px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #6f7d94; margin-bottom: 4px; }
        .wf-detail dd { margin: 0; font-size: 14px; line-height: 1.5; color: #30486d; }
        .wf-steps { margin: 22px 0 0; padding: 0; list-style: none; border-top: 1px solid var(--wf-ink); }
        .wf-steps li { border-bottom: 1px solid var(--wf-line); }
        .wf-steps-btn { appearance: none; background: transparent; border: 0; width: 100%; text-align: left; display: grid; grid-template-columns: 34px 1fr; gap: 8px; padding: 13px 6px; font: inherit; color: #30486d; cursor: pointer; }
        .wf-steps-btn:hover .wf-steps-text strong { color: var(--wf-pink); }
        .wf-steps-btn:focus-visible { outline: 3px solid var(--wf-coral); outline-offset: 2px; }
        .wf-steps li.is-open .wf-steps-btn { background: #f3f4f8; }
        .wf-steps-no { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--wf-pink); padding-top: 4px; }
        .wf-steps-text { font-size: 15px; line-height: 1.55; }
        .wf-steps-text strong { color: var(--wf-ink); font-weight: 650; }
        .wf-steps-text em { font-style: normal; color: #6f7d94; }
        @media (max-width: 767px) {
          .wf-grid { display: none; }
          .wf-detail { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="wf">
        <div className="wf-grid" role="group" aria-label="Worked example, by lane">
          {LANES.map((lane) => (
            <div key={lane.id} className="contents">
              <div className="wf-lane-label">{lane.label}</div>
              <div className="wf-lane" style={{ gridTemplateColumns: columns }}>
                {steps.map((step, index) => (
                  <div key={step.name} className="wf-cell">
                    {step.lane === lane.id && <StepButton step={step} index={index} open={open === index} onToggle={() => setOpen(open === index ? null : index)} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <ol className="wf-steps" aria-label="The steps">
          {steps.map((step, index) => (
            <li key={step.name} className={open === index ? "is-open" : ""}>
              <button type="button" className="wf-steps-btn" aria-expanded={open === index} aria-controls="wf-detail" onClick={() => setOpen(open === index ? null : index)}>
                <span className="wf-steps-no">{index + 1}.</span>
                <span className="wf-steps-text"><strong>{step.name}</strong> <em>({LANES.find((lane) => lane.id === step.lane)?.label.toLowerCase()})</em>. {step.text}</span>
              </button>
            </li>
          ))}
        </ol>

        {open !== null && (
          <dl className="wf-detail" id="wf-detail" aria-live="polite">
            <div><dt>Step</dt><dd>{steps[open].name}{steps[open].approval ? ". The approval step" : ""}</dd></div>
            <div><dt>Owner</dt><dd>{steps[open].owner}</dd></div>
            <div><dt>Input</dt><dd>{steps[open].input}</dd></div>
            <div><dt>Output</dt><dd>{steps[open].output}</dd></div>
            <div><dt>What is logged</dt><dd>{steps[open].logged}</dd></div>
          </dl>
        )}
      </div>
      {outro && <p className="mt-8 max-w-[680px] text-[15.5px] leading-[1.6] text-[#405777]">{outro}</p>}
    </div>
  );
}

function StepButton({ step, index, open, onToggle }: { step: WorkflowStep; index: number; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`wf-step ${step.approval ? "approval" : ""}`} aria-expanded={open} aria-controls="wf-detail" onClick={onToggle}>
      <span>0{index + 1}</span>
      <strong>{step.name}</strong>
      {step.approval && <em>Approval</em>}
    </button>
  );
}
