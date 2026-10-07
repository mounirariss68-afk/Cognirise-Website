import React from "react";
import "./_group.css";
import "./TelecomVariants.css";
import content from "./_shared/content.json";

const pov = content.telecomPov;
const stages = [
  ["detect", "Detect"], ["investigate", "Investigate"], ["propose", "Propose"],
  ["approveExecute", "Approve / execute"], ["verify", "Verify"],
] as const;
const scenarios = pov.scenarios;
const metricLabels: Record<string, string> = { target: "Illustrative KPI target", unresolved: "KPI under review", reported: "Reported telco outcome" };

function Metrics({ ids }: { ids: string[] }) {
  return <div className="tv-metric-band">{ids.map((id) => {
    const metric = pov.metrics.find((item) => item.id === id);
    if (!metric) return null;
    return <div className={`tv-metric tv-metric--${metric.classification}`} key={id}>
      <span className="tv-metric-name">{metric.name}</span>{metric.value && <strong className="tv-metric-value">{metric.value}</strong>}
      <span className="tv-metric-class">{metricLabels[metric.classification]} · {metric.classification === "unresolved" ? "Definition proposed; value withheld pending baseline and scope." : "Validate against the operator baseline; not an outcome or guarantee."}</span>
    </div>;
  })}</div>;
}

export function WorkflowCase() {
  const [scenarioId, setScenarioId] = React.useState("billing-dispute-investigation");
  const [selected, setSelected] = React.useState(0);
  const [preview, setPreview] = React.useState<number | null>(null);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const detailIndex = preview ?? selected;
  const currentKey = stages[detailIndex][0];
  const department = pov.departments.find((item) => item.id === scenario.departmentId);
  const chooseStage = (index: number) => { setSelected(index); setPreview(null); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % stages.length : event.key === "ArrowLeft" ? (index + stages.length - 1) % stages.length : event.key === "Home" ? 0 : event.key === "End" ? stages.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); chooseStage(next); document.getElementById(`case-stage-${next}`)?.focus();
  };
  return <main className="tv tv-shell tv-case-concept">
    <header className="tv-head">
      <div><div className="tv-kicker">Workflows B · Case walkthrough</div><h2>See the case move, not just the stages.</h2><p>A concrete source case anchors the work. Select a stage to inspect its current input, work and accountable boundary.</p></div>
      <div className="tv-edition"><strong>Illustrative workflow</strong>One case · five owner-aware stages</div>
    </header>
    <nav className="tv-scenarios" aria-label="Choose a telecom workflow case">
      {scenarios.map((item) => <button key={item.id} type="button" aria-pressed={scenario.id === item.id} onClick={() => { setScenarioId(item.id); setSelected(0); setPreview(null); }}>{item.title}</button>)}
    </nav>
    <section className="tv-case-strip">
      <aside className="tv-case-aside">
        <div className="tv-kicker">Case file / {department?.title ?? "Telecom"}</div>
        <h3>{scenario.title}</h3>
        <div className="tv-case-owner">Accountable owner · {scenario.owner}</div>
        <dl className="tv-case-meta">
          <div><dt>Approval boundary</dt><dd>{scenario.boundary}</dd></div>
          <div><dt>Audit &amp; recovery</dt><dd>{scenario.auditRecovery}</dd></div>
        </dl>
      </aside>
      <div className="tv-narrative">
        <div className="tv-input-band"><div className="tv-source-label">Case input · Detect</div><p>{scenario.stages.detect}</p></div>
        <div className="tv-walk-tabs" role="tablist" aria-label={`${scenario.title} case progression`}>
          {stages.map(([key, label], index) => <button key={key} id={`case-stage-${index}`} type="button" role="tab" aria-selected={selected === index} aria-controls="case-step-panel" tabIndex={selected === index ? 0 : -1} className="tv-stage" onClick={() => chooseStage(index)} onMouseEnter={() => setPreview(index)} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(index)} onBlur={() => setPreview(null)} onKeyDown={(event) => onKeyDown(event, index)}>
            <span className="tv-stage-no">0{index + 1}</span><strong>{label}</strong>
          </button>)}
        </div>
        <div id="case-step-panel" role="tabpanel" aria-live="polite">
          <div className="tv-detail-callout"><h4>{stages[detailIndex][1]} / current work</h4><p>{scenario.stages[currentKey]}</p></div>
          <div className="tv-boundary"><strong>{detailIndex === 3 ? "Owner approval boundary" : "Decision authority"}</strong>{detailIndex === 3 ? scenario.boundary : `The accountable process owner remains ${scenario.owner}. Consequential action waits for explicit approval at the appropriate boundary.`}</div>
          <div className="tv-recovery"><strong>Correction &amp; recovery:</strong> {scenario.auditRecovery}</div>
          <Metrics ids={scenario.metricIds} />
        </div>
      </div>
    </section>
  </main>;
}
