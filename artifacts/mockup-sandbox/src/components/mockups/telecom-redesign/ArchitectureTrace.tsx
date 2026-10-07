import React from "react";
import "./_group.css";
import "./architecture-trace.css";
import data from "./_shared/content.json";
import { MetricsContext, MetricList } from "./_shared/Extracted";

const pov = data.telecomPov;
const stageKeys = ["detect", "investigate", "propose", "approveExecute", "verify"] as const;
const stageNames = ["Detect", "Investigate", "Propose", "Approve / execute", "Verify"] as const;
const layerNames = [
  ["orchestration", "Domain-limited orchestration"],
  ["domains", "Business, Operations and Foundations"],
  ["foundation", "Data and integration foundation"],
  ["execution", "Authorised execution and handoffs"],
] as const;

export function ArchitectureTrace() {
  const [workflowId, setWorkflowId] = React.useState(pov.scenarios[0].id);
  const [stageIndex, setStageIndex] = React.useState(0);
  const [boundariesOpen, setBoundariesOpen] = React.useState(false);
  const workflow = pov.scenarios.find((scenario) => scenario.id === workflowId) ?? pov.scenarios[0];
  const department = pov.departments.find((item) => item.id === workflow.departmentId) ?? pov.departments[0];
  const metrics = new Map(pov.metrics.map((metric) => [metric.id, metric]));
  function selectWorkflow(id: string) { setWorkflowId(id); setStageIndex(0); }

  return <MetricsContext.Provider value={metrics}>
    <main className="telecom-exploration architecture-trace">
      <header className="at-head"><div><span className="at-kicker">Telecom application view / workflow trace</span><h1>Follow the decision.<br /><em>Keep the owner visible.</em></h1></div><p>One concrete case, from first signal to accepted evidence. The trace shows where permissioned integration supports work—and where approval remains human.</p></header>
      <div className="at-case">
        <aside className="at-case-index" aria-label="Choose a workflow to trace">
          <div className="at-index-top"><span>Choose a case</span><b>08</b></div>
          {pov.scenarios.map((item, index) => <button key={item.id} type="button" aria-pressed={workflowId === item.id} className={workflowId === item.id ? "active" : ""} onClick={() => selectWorkflow(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong><i aria-hidden="true" /></button>)}
        </aside>
        <section className="at-story" aria-live="polite">
          <div className="at-story-head"><div><span className="at-story-kicker">{department.domain} / {department.title}</span><h2>{workflow.title}</h2></div></div>
          <p className="at-opening">{department.challenge}</p>
          <div className="at-metrics"><span>Relevant measure</span><MetricList ids={workflow.metricIds} /></div>
          <div className="at-trace" role="tablist" aria-label={`${workflow.title} stages`}>
            {stageNames.map((label, index) => <button key={label} type="button" role="tab" aria-selected={stageIndex === index} tabIndex={stageIndex === index ? 0 : -1} className={stageIndex === index ? "active" : ""} onClick={() => setStageIndex(index)} onKeyDown={(event) => {
              let next = stageIndex;
              if (event.key === "ArrowRight") next = Math.min(stageNames.length - 1, stageIndex + 1);
              else if (event.key === "ArrowLeft") next = Math.max(0, stageIndex - 1);
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = stageNames.length - 1;
              else return;
              event.preventDefault(); setStageIndex(next);
              (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
            }}><span>{String(index + 1).padStart(2, "0")}</span><b>{label}</b></button>)}
          </div>
          <article className="at-stage" role="tabpanel">
            <div className="at-stage-marker"><span>STAGE {String(stageIndex + 1).padStart(2, "0")} / 05</span><i /></div>
            <div className="at-stage-copy"><span className="at-stage-title">{stageNames[stageIndex]}</span><p>{workflow.stages[stageKeys[stageIndex]]}</p>
              {stageIndex === 3 && <div className="at-approval-note"><strong>Approval is a boundary, not a machine step.</strong> {workflow.boundary}</div>}
            </div>
            <div className="at-stage-nav"><button type="button" disabled={stageIndex === 0} onClick={() => setStageIndex((n) => Math.max(0, n - 1))}>Previous</button><span>{String(stageIndex + 1).padStart(2, "0")} / 05</span><button type="button" disabled={stageIndex === 4} onClick={() => setStageIndex((n) => Math.min(4, n + 1))}>Next stage</button></div>
          </article>
          <div className="at-source-line"><span>Connected context</span><p>{department.systems}</p><b>{department.domain} domain</b></div>
        </section>
      </div>
      <section className="at-accountability">
        <div className="at-owner"><span>Named owner</span><h3>{workflow.owner}</h3><p>{department.title} owns the operating context; accountable owners retain consequential approvals.</p></div>
        <div className="at-boundary"><span>Approval &amp; authorised execution</span><p>{workflow.boundary}</p></div>
        <div className="at-audit"><span>Audit &amp; recovery</span><p>{workflow.auditRecovery}</p></div>
      </section>
      <section className={`at-architecture ${boundariesOpen ? "open" : ""}`}>
        <button type="button" aria-expanded={boundariesOpen} onClick={() => setBoundariesOpen((open) => !open)}><span>Architecture behind this trace</span><strong>{boundariesOpen ? "Hide system context −" : "Show system context +"}</strong></button>
        {boundariesOpen && <div className="at-architecture-body">{layerNames.map(([key, label], index) => <article key={key}><span>0{index + 1}</span><h3>{label}</h3><p>{pov.architecture[key]}</p></article>)}</div>}
      </section>
      <footer className="at-network"><strong>Network authority stays with its owners.</strong><span>Telemetry is an input only · NEP/NOC controls network changes · approved work is handed to authorised owners.</span></footer>
    </main>
  </MetricsContext.Provider>;
}
