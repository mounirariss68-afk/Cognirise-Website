import React from "react";
import "./_group.css";
import "./PriorityMap.css";
import content from "./_shared/content.json";

const data = content.telecomPov;
const fields = [
  ["Value hypothesis", "valueHypothesis"], ["Data readiness", "readiness"], ["Dependencies", "dependencies"],
  ["Action authority", "authority"], ["Validation needs", "validation"],
] as const;

export function PriorityMap() {
  const [selected, setSelected] = React.useState(0);
  const active = data.candidates[selected];
  return <main className="telecom-exploration pm">
    <header className="pm-head"><div><span className="pm-kicker">Telecom / prioritisation · 03 / 04</span><h1>Put the hypotheses<br />on the table.</h1></div><p>A qualitative discussion map to make trade-offs visible—not measured value, delivery readiness or a priority score.</p></header>
    <section className="pm-body">
      <div className="pm-field-wrap">
        <div className="pm-field-title"><span>DISCUSSION FIELD</span><span>Equal-weight markers · illustrative source positions</span></div>
        <div className="pm-field" role="group" aria-label="Qualitative discussion field: value hypothesis increases upward, feasibility increases rightward">
          <div className="pm-quadrant pm-q1"><b>Value / dependency discussion</b><span>Higher hypothesis · harder to test</span></div>
          <div className="pm-quadrant pm-q2"><b>Value / test-design discussion</b><span>Higher hypothesis · easier to test</span></div>
          <div className="pm-quadrant pm-q3"><b>Scope / dependency discussion</b><span>Lower hypothesis · harder to test</span></div>
          <div className="pm-quadrant pm-q4"><b>Scope / test-design discussion</b><span>Lower hypothesis · easier to test</span></div>
          <div className="pm-cross-x" aria-hidden="true" /><div className="pm-cross-y" aria-hidden="true" />
          <span className="pm-axis pm-axis-x"><b>Feasibility to test</b><i>Harder</i><em>Easier</em></span>
          <span className="pm-axis pm-axis-y"><b>Value hypothesis</b><i>Lower</i><em>Higher</em></span>
          {data.candidates.map((candidate, index) => <button key={candidate.id}
            type="button" className={`pm-point ${selected === index ? "selected" : ""}`}
            style={{ left: `${candidate.feasibilityPosition}%`, bottom: `${candidate.valuePosition}%` }}
            aria-pressed={selected === index} aria-controls="pm-brief"
            aria-label={`Select ${candidate.title}, a qualitative discussion position`}
            onClick={() => setSelected(index)} title={candidate.title}>
            <span className="pm-point-label">{candidate.title}</span><span className="pm-point-dot" />
          </button>)}
        </div>
        <div className="pm-field-foot"><span>Positions are carried from the source as discussion prompts.</span><span>No quantified scores are shown.</span></div>
      </div>
      <aside className="pm-brief" id="pm-brief" aria-live="polite">
        <div className="pm-brief-top"><span>SELECTED HYPOTHESIS</span><span>{String(selected + 1).padStart(2, "0")} / 08</span></div>
        <h2>{active.title}</h2>
        <p className="pm-brief-intro">What must be true before this opportunity can be assessed:</p>
        <dl>{fields.map(([label, key]) => <div key={key}><dt>{label}</dt><dd>{active[key]}</dd></div>)}</dl>
        <p className="pm-authority-note">Network telemetry can inform a workflow; network actions remain with authorised NEP/NOC owners.</p>
      </aside>
    </section>
  </main>;
}
