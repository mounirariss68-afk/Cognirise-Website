import { useState } from "react";
import { fsCredit } from "./_source/content";
import "./Casebook.css";

const phases = [
  { title: "Build the file", owner: "Systems + AI", label: "Receive → extract", heading: "Start with evidence, not a verdict.", body: "Systems receive the credit documents. AI extracts the facts and attaches a source link to each one, so an analyst can check where it came from." },
  { title: "Check & resolve", owner: "AI + analyst", label: "Check → return if needed", heading: "A gap is a handover. Not a shortcut.", body: "AI pre-checks completeness and the bank’s policy. Choose a route below to see how a complete file proceeds—or how missing evidence returns to an analyst." },
  { title: "Draft & review", owner: "AI → analyst", label: "Prepare → human review", heading: "A recommendation with no authority.", body: "AI drafts from the checked facts and relevant policy. An analyst checks the evidence, confirms the pre-checks and edits the recommendation before it reaches the decision owner." },
  { title: "Decide & act", owner: "Human → systems", label: "Decision → permitted outcome", heading: "The decision stays with a person.", body: "The credit committee or authorized analyst approves, rejects or escalates within the bank’s approval limits. Explore what each decision permits." },
];
type Decision = "Approve" | "Reject" | "Escalate" | null;

export function Casebook() {
  const [phase, setPhase] = useState(1);
  const [route, setRoute] = useState<"complete" | "gap">("complete");
  const [corrected, setCorrected] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const current = phases[phase];
  const reset = () => { setPhase(0); setRoute("complete"); setCorrected(false); setReviewed(false); setDecision(null); };
  const go = (index: number) => { setPhase(index); };
  return (
    <main className="credit-casebook">
      <div className="cb-top"><p className="cb-eyebrow">Financial services / Credit & lending</p><span className="cb-tag">{fsCredit.label}</span></div>
      <header className="cb-header">
        <div><h1>Follow the file.<br />Find the human handover.</h1><p className="cb-subtitle">An interactive walkthrough of credit preparation. Each bank defines its own steps, policy and approval limits.</p></div>
        <div className="cb-principle"><strong>AI prepares. A person decides.</strong><p>Nothing executes without human approval—and even then, only within permitted limits.</p></div>
      </header>
      <section className="cb-shell" aria-label="Illustrative credit case walkthrough">
        <div className="cb-toolbar"><strong>Credit preparation / Case walkthrough</strong><span>Explore a stage or follow the file</span><button className="cb-reset" onClick={reset}>Restart walkthrough ↺</button></div>
        <div className="cb-layout">
          <nav className="cb-nav" aria-label="Workflow chapters">
            <p>Four handovers</p>
            {phases.map((item, index) => <button key={item.title} className={`cb-phase ${index === phase ? "is-active" : ""}`} onClick={() => go(index)} aria-current={index === phase ? "step" : undefined}><span className="cb-phase-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.owner}</small></span></button>)}
            <div className="cb-nav-note">This is an explanation of the controls, not a live credit application. Try both the normal and exception routes.</div>
          </nav>
          <article className="cb-content" aria-live="polite">
            <div className="cb-stage-meta"><i className="cb-dot" />{current.label}</div>
            <h2>{current.heading}</h2><p className="cb-description">{current.body}</p>
            {phase === 0 && <><ul className="cb-checklist"><li><span>01</span>Receive customer records<small>Systems</small></li><li><span>02</span>Collect credit documents<small>Systems</small></li><li><span>03</span>Extract source-linked facts<small>AI + systems</small></li></ul><div className="cb-notice"><strong>The source stays attached.</strong><p>Facts without evidence do not become a basis for approval.</p></div><div className="cb-actionline"><span>Next: completeness & policy</span><button className="cb-primary" onClick={() => go(1)}>Check the file →</button></div></>}
            {phase === 1 && <><div className="cb-toggle" aria-label="Choose an illustrative evidence route"><button aria-pressed={route === "complete"} onClick={() => { setRoute("complete"); setCorrected(false); }}>Complete evidence</button><button aria-pressed={route === "gap"} onClick={() => { setRoute("gap"); setCorrected(false); }}>Missing evidence</button></div>
              <ul className="cb-checklist"><li><span>✓</span>Facts linked to source documents<small>Traceable</small></li><li><span>{route === "gap" && !corrected ? "↳" : "✓"}</span>Completeness pre-check<small>{route === "gap" && !corrected ? "Analyst needed" : "Ready for review"}</small></li><li><span>✓</span>Bank policy pre-check<small>Analyst confirms later</small></li></ul>
              {route === "gap" && <div className="cb-notice"><strong>{corrected ? "Corrected evidence returns to checking." : "Return to the analyst."}</strong><p>{corrected ? "The completeness and policy checks run again. The correction does not bypass any control." : "A person resolves the missing or conflicting evidence. Drafting waits until the corrected file is checked."}</p></div>}
              <div className="cb-actionline"><span>{route === "gap" && !corrected ? "Exception route · no bypass" : "Checked file → AI draft"}</span><button className="cb-primary" onClick={() => route === "gap" && !corrected ? setCorrected(true) : go(2)}>{route === "gap" && !corrected ? "Simulate correction & re-check ↺" : "Prepare recommendation →"}</button></div>
            </>}
            {phase === 2 && <><div className="cb-review"><strong>AI draft → analyst review</strong><p>The analyst checks the source evidence, confirms policy pre-checks and edits the draft. The AI recommendation cannot grant credit or trigger execution.</p></div><div className="cb-notice"><strong>{reviewed ? "Analyst review recorded in this walkthrough." : "Human review is required."}</strong><p>{reviewed ? "The reviewed recommendation may now reach an authorized human decision owner." : "Review and decision are separate controls. A draft alone cannot move the case to execution."}</p></div><div className="cb-actionline"><span>Illustrative handover only</span><button className="cb-primary" disabled={route === "gap" && !corrected} onClick={() => reviewed ? go(3) : setReviewed(true)}>{reviewed ? "Explore human decision →" : "Simulate analyst review →"}</button></div>{route === "gap" && !corrected && <p className="cb-caption">Resolve the evidence gap in chapter 02 before simulating review.</p>}</>}
            {phase === 3 && <><div className="cb-review"><strong>Mandatory human approval gate</strong><p>Only the bank’s authorized decision owner can make this decision. These choices demonstrate the route; they do not approve a real case.</p></div><div className="cb-decision-buttons">{(["Approve", "Reject", "Escalate"] as const).map(item => <button key={item} aria-pressed={decision === item} onClick={() => setDecision(item)}>{item}</button>)}</div>
              <div className="cb-outcome"><strong>{decision === "Approve" ? "Approval → authorized execution" : decision === "Reject" ? "Rejection → no execution" : decision === "Escalate" ? "Escalation → further human decision" : "Without approval, execution is blocked."}</strong><p>{decision === "Approve" ? "Systems carry out only the human-approved action that the bank permits. The action stays linked to the reviewer’s decision." : decision === "Reject" ? "This execution path ends. The decision remains recorded with the supporting case evidence." : decision === "Escalate" ? "The case stays with people for further decision. An escalation is not permission to execute." : "Select an illustrative human decision to see its permitted outcome."}</p></div><div className="cb-actionline"><span>No machine grants credit.</span><button className="cb-reset" onClick={reset}>Explore again ↺</button></div>
            </>}
          </article>
          <aside className="cb-evidence">
            <h3>The evidence travels with it.</h3><p>One traceable case record, through every handover.</p>
            <dl><div><dt>01 / Sources</dt><dd>Original documents & linked facts</dd></div><div><dt>02 / Policy</dt><dd>Version used for pre-checks</dd></div><div><dt>03 / Decision</dt><dd>{decision ? `${decision} — illustrative human outcome` : "Human reviewer decision"}</dd></div><div><dt>04 / Action</dt><dd>{decision === "Approve" ? "Approved & permitted steps only" : decision ? "No execution permitted" : "Recorded only if authorized"}</dd></div></dl>
            <div className="cb-evidence-note">Evidence → decision → action<br />The links remain intact.</div>
          </aside>
        </div>
        <footer className="cb-footer"><strong>Preparation can be automated. Authority cannot be inferred.</strong><span>Illustrative process · not a credit assessment</span></footer>
      </section>
      <section className="cb-bottom"><div><h3>What changes. What doesn’t.</h3><p>Less document preparation for analysts. The same human accountability for credit decisions.</p></div><details><summary>Compare ownership before and after AI</summary><table><thead><tr><th>Task</th><th>Before</th><th>After</th></tr></thead><tbody>{fsCredit.transfer.map(item => <tr key={item.task}><th scope="row">{item.task}</th><td>{item.before}</td><td>{item.after}</td></tr>)}</tbody></table></details></section>
    </main>
  );
}
