import React, { useState } from "react";
import { fsCredit } from "@/content/financial-services-launch";

type StepId = "receive" | "extract" | "check" | "gaps" | "draft" | "review" | "decision" | "execute" | "outcomes";
type Step = { id: StepId; n: string; title: string; owner: string; short: string; body: string; input: string; output: string; audit: string; x: number; y: number; tone?: string; task?: number };
const steps: Step[] = [
  { id: "receive", n: "01", title: "Receive documents", owner: "Systems", short: "Bring the case together", body: "The workflow starts with the credit file, not with a decision.", input: "Customer records and credit documents.", output: "Documents available for preparation.", audit: "Source documents retained with the case.", x: 0, y: 60, task: 0 },
  { id: "extract", n: "02", title: "Extract source-linked facts", owner: "AI + systems", short: "Evidence stays attached", body: "Each extracted fact links back to the document it came from so a reviewer can check the evidence.", input: "Received credit documents.", output: "Facts linked to their source documents.", audit: "Source links accompany the extracted facts.", x: 33.33, y: 60, task: 0 },
  { id: "check", n: "03", title: "Check completeness & policy", owner: "AI pre-check", short: "Gaps take the return path", body: "Pre-check the file against the bank’s policy. Missing or conflicting evidence goes to an analyst; corrected evidence returns here for checking.", input: "Source-linked facts and the bank’s policy.", output: "Pre-checks and flagged gaps; a checked file proceeds to drafting.", audit: "Source documents and policy version used for checking.", x: 66.66, y: 60, task: 2 },
  { id: "gaps", n: "↺", title: "Resolve evidence gaps", owner: "Analyst", short: "Return to completeness checks", body: "A person resolves missing or conflicting evidence. This is a return loop, not a way around policy checks or approval.", input: "Flagged gaps and conflicting source evidence.", output: "Corrected evidence returned to completeness and policy checking.", audit: "The case keeps the source evidence used for review.", x: 33.33, y: 205, tone: "exception", task: 1 },
  { id: "draft", n: "04", title: "Draft recommendation", owner: "AI", short: "A proposal, not a decision", body: "AI prepares a recommendation from the checked file. The draft has no authority to grant credit or trigger execution.", input: "Checked facts and relevant credit policy.", output: "Draft recommendation for analyst review.", audit: "Supporting sources and policy version remain linked.", x: 66.66, y: 330, task: 3 },
  { id: "review", n: "05", title: "Review recommendation", owner: "Analyst", short: "Confirm checks; edit the draft", body: "An analyst checks the evidence, confirms the policy pre-checks and edits the draft before it reaches the decision owner.", input: "Draft recommendation, source evidence and policy checks.", output: "Reviewed recommendation for a human decision.", audit: "Evidence and policy version are available to the reviewer.", x: 33.33, y: 330, task: 3 },
  { id: "decision", n: "06", title: "Approve, reject or escalate", owner: "Human decision", short: "Mandatory approval gate", body: "The credit committee or authorized analyst decides within the bank’s approval limits. Only an approval can lead to permitted execution.", input: "Reviewed recommendation and its supporting evidence.", output: "Approval, rejection or escalation. No machine grants credit.", audit: "Reviewer decision linked to sources and policy version.", x: 0, y: 330, tone: "gate", task: 4 },
  { id: "execute", n: "07", title: "Execute authorized steps", owner: "Systems", short: "Approved + permitted only", body: "Systems execute only the actions the human decision authorizes and the bank permits. There is no route to execution around the approval gate.", input: "Human approval and permitted action scope.", output: "Only the approved, permitted action is carried out.", audit: "Permitted action taken, linked to the reviewer decision.", x: 0, y: 525, tone: "execution" },
  { id: "outcomes", n: "—", title: "Reject or escalate", owner: "Human decision", short: "No execution on this branch", body: "A rejection ends this execution path. An escalation stays with people for further decision; it is not permission to execute.", input: "A human rejection or escalation.", output: "No execution. An escalation requires further human decision.", audit: "Reviewer decision recorded with the case evidence.", x: 33.33, y: 525, tone: "outcomes" },
];
const edges: { id: string; from: StepId; to: StepId; d: string; tone?: string }[] = [
  { id: "intake", from: "receive", to: "extract", d: "M211 108 H254" },
  { id: "facts", from: "extract", to: "check", d: "M471 108 H514" },
  { id: "checks", from: "check", to: "draft", d: "M650 155 V322" },
  { id: "gap-out", from: "check", to: "gaps", d: "M560 155 V250 H477", tone: "exception" },
  { id: "gap-return", from: "gaps", to: "check", d: "M390 205 V178 H490 V140 H514", tone: "exception" },
  { id: "draft-review", from: "draft", to: "review", d: "M520 376 H478", tone: "human" },
  { id: "review-decision", from: "review", to: "decision", d: "M260 376 H217", tone: "human" },
  { id: "approved", from: "decision", to: "execute", d: "M80 430 V517", tone: "human" },
  { id: "not-approved", from: "decision", to: "outcomes", d: "M165 430 V488 H390 V517", tone: "exception" },
];

export function FsConnectedWorkflow() {
  const [selected, setSelected] = useState<StepId>("decision");
  const [hovered, setHovered] = useState<StepId | null>(null);
  const [focused, setFocused] = useState<StepId | null>(null);
  const active = hovered ?? focused ?? selected;
  const step = steps.find((item) => item.id === active)!;
  const mapping = step.task === undefined ? undefined : fsCredit.transfer[step.task];
  return (
    <div className="cw-connected">
      <section id="fs-credit" aria-labelledby="fs-credit-title">
        <header className="cw-head">
          <div>
            <p className="cw-eyebrow">{fsCredit.label} / Credit & lending</p>
            <h2 className="cw-title" id="fs-credit-title">{fsCredit.title}</h2>
            <p className="cw-intro">{fsCredit.intro}</p>
          </div>
          <p className="cw-principle"><strong>AI prepares. A person decides.</strong>Execution starts only after human approval, within permitted limits.</p>
        </header>
        <div className="cw-instructions">
          <span>Hover or focus to explore. Click or tap to keep a stage selected.</span>
          <div className="cw-legend" aria-label="Route legend"><span><i />Preparation</span><span><i className="cw-human-key" />Human handover</span><span><i className="cw-loop-key" />Exception / return</span></div>
        </div>
        <div className="cw-workspace">
          <figure className="cw-graph" data-testid="diagram-fs-credit" aria-label="Connected credit preparation workflow: gaps return to checking; human approval gates all execution.">
            <svg className="cw-paths" viewBox="0 0 780 620" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                {["violet", "pink", "coral"].map((tone) => <marker key={tone} id={`cw-arrow-${tone}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill={`var(--${tone})`} /></marker>)}
              </defs>
              {edges.map((edge) => <path key={edge.id} data-edge={edge.id} className={`cw-edge ${edge.tone ?? ""} ${edge.from === active || edge.to === active ? "active" : ""}`} d={edge.d} markerEnd={`url(#cw-arrow-${edge.tone === "exception" ? "coral" : edge.tone === "human" ? "pink" : "violet"})`} />)}
            </svg>
            <span className="cw-route-label" style={{ left: "43%", top: 182 }}>Corrected evidence ↗</span>
            <span className="cw-route-label" style={{ left: "64%", top: 267 }}>Gaps → analyst</span>
            <span className="cw-route-label" style={{ left: "84%", top: 265 }}>Checked file ↓</span>
            <span className="cw-route-label" style={{ left: "1%", top: 477 }}>Approved ↓</span>
            <span className="cw-route-label" style={{ left: "29%", top: 462 }}>Rejected / escalated</span>
            {steps.map((item) => (
              <React.Fragment key={item.id}>
                {item.id === "outcomes" && <p className="cw-mobile-route">Alternative decision branch — not a next step ↓</p>}
                <button
                  type="button"
                  className={`cw-step ${item.tone ?? ""} ${active === item.id ? "is-active" : ""} ${selected === item.id ? "is-pinned" : ""}`}
                  style={{ "--x": `${item.x}%`, "--y": `${item.y}px` } as React.CSSProperties}
                  aria-pressed={selected === item.id}
                  aria-controls="cw-stage-detail"
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setFocused(item.id)}
                  onBlur={() => setFocused(null)}
                  onClick={() => { setSelected(item.id); setHovered(null); }}
                >
                  <span className="cw-meta"><span className="cw-number">{item.n}</span>{item.owner}</span>
                  <strong>{item.title}</strong><small>{item.short}</small>
                </button>
                {item.id === "check" && <p className="cw-mobile-route">If evidence is incomplete → analyst correction below.<br />Otherwise → draft recommendation.</p>}
                {item.id === "gaps" && <p className="cw-mobile-route">↵ Corrected evidence returns to step 03. No bypass.</p>}
                {item.id === "decision" && <p className="cw-mobile-route">Approved → authorized execution.<br />Rejected / escalated → no execution.</p>}
              </React.Fragment>
            ))}
          </figure>
          <aside className="cw-detail" id="cw-stage-detail" aria-label="Stage details" aria-live="polite" aria-atomic="true">
            <p className="cw-detail-status">{active === selected ? "Selected stage" : "Stage preview"} / {step.n}</p>
            <h3>{step.title}</h3>
            <p className="cw-detail-intro">{step.body}</p>
            <dl><dt>Owner</dt><dd>{step.owner}{step.id === "decision" ? " — credit committee or authorized analyst" : ""}</dd><dt>Input</dt><dd>{step.input}</dd><dt>Output</dt><dd>{step.output}</dd><dt>Audit link</dt><dd>{step.audit}</dd></dl>
            <div className="cw-ownership">
              <strong>Who does this work?</strong>
              {mapping ? <><p><b>Task:</b> {mapping.task}</p><p><b>Before:</b> {mapping.before}</p><p><b>After:</b> {mapping.after}</p></> : <p>{step.id === "execute" ? "Systems act within human approval and the bank’s permitted action scope." : "A person retains authority over the outcome."}</p>}
            </div>
          </aside>
        </div>
        <div className="cw-audit">
          <div><h3>One traceable case record</h3><p>Evidence, decision and action stay linked.</p></div>
          <ol>{fsCredit.audit.map((item) => <li key={item}>{item}</li>)}</ol>
        </div>
        <details>
          <summary>Who does each part of the work — full before / after comparison</summary>
          <table className="cw-comparison">
            <thead><tr><th scope="col">Task</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
            <tbody>{fsCredit.transfer.map((item) => <tr key={item.task}><th scope="row">{item.task}</th><td data-label="Before">{item.before}</td><td data-label="After">{item.after}</td></tr>)}</tbody>
          </table>
        </details>
      </section>
    </div>
  );
}
