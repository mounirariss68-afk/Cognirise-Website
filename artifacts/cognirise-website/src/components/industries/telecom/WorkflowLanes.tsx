import React from "react";
import { CompactMetric } from "./CompactMetric";
import { useTelecomData, useTelecomWorkflow } from "./TelecomData";
import type { TelecomPov } from "@workspace/api-zod";

const stages = [
  ["detect", "Detect"], ["investigate", "Investigate"], ["propose", "Propose"],
  ["approveExecute", "Approve / execute"], ["verify", "Verify"],
] as const;
const metricLabels: Record<string, string> = { target: "Illustrative KPI target", unresolved: "KPI under review", reported: "Reported telco outcome" };

export function WorkflowLanes() {
  const pov = useTelecomData();
  const scenarios = pov.scenarios;
  const { id: scenarioId, select: setScenarioId } = useTelecomWorkflow();
  const [lockedStage, setLockedStage] = React.useState(0);
  const [previewStage, setPreviewStage] = React.useState<number | null>(null);
  React.useEffect(() => { setLockedStage(0); setPreviewStage(null); }, [scenarioId]);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const stageIndex = previewStage ?? lockedStage;
  const department = pov.departments.find((item) => item.id === scenario.departmentId);
  const stageData = stages.map(([key, label]) => ({ key, label, copy: scenario.stages[key] }));
  const keyStage = stages[stageIndex][0];
  const metricData = scenario.metricIds.map((id) => pov.metrics.find((metric) => metric.id === id)).filter((metric) => metric !== undefined);
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % stages.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + stages.length) % stages.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = stages.length - 1;
    else return;
    event.preventDefault();
    setLockedStage(next);
    document.getElementById(`lane-stage-${next}`)?.focus();
  };
  return <section className="tv tv-shell tv-lane-concept">
    <header className="tv-head">
      <div><div className="tv-kicker">Illustrative workflows · Ownership swimlanes</div><h3>One progression. Clear handovers.</h3><p>Follow the work through five stages while keeping evidence work, accountable decisions and authorised execution distinct.</p></div>
      <div className="tv-edition"><strong>Connected progression</strong>Hover to preview · select to hold a stage</div>
    </header>
    <nav className="tv-scenarios" aria-label="Choose one of eight telecom workflows">
      {scenarios.map((item) => <button key={item.id} data-testid={`button-scenario-telecom-flagships-${item.id}`} type="button" aria-pressed={scenario.id === item.id} onClick={() => { setScenarioId(item.id); setLockedStage(0); setPreviewStage(null); }}>{item.title}</button>)}
    </nav>
    <section className="tv-main" aria-label={`${scenario.title} ownership swimlanes`}>
      <div className="tv-route-map">
        <div className="tv-route-lanes" aria-hidden="true">
          <div className="tv-route-lane tv-route-lane--work"><strong>Workflow support</strong><span>Evidence · investigation · recommendation</span></div>
          <div className="tv-route-lane tv-route-lane--owner"><strong>Accountable owner</strong><span>{scenario.owner}</span></div>
          <div className="tv-route-lane tv-route-lane--handoff"><strong>Authorised handoff</strong><span>Only where action requires it</span></div>
        </div>
        <div className="tv-route-field">
          <svg className="tv-route-svg" viewBox="0 0 1000 250" preserveAspectRatio="none" role="img" aria-label="Connected route from Detect to Verify, crossing from workflow support to owner approval before any authorised handoff">
            <defs>
              <linearGradient id="lane-signal" x1="0" x2="1"><stop offset="0" stopColor="#7659df" /><stop offset=".55" stopColor="#db509e" /><stop offset="1" stopColor="#ff775d" /></linearGradient>
              <marker id="lane-arrow-muted" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#aeb8c9" /></marker>
              <marker id="lane-arrow-active" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="url(#lane-signal)" /></marker>
              <marker id="lane-arrow-handoff" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#ff775d" /></marker>
            </defs>
            <path className="tv-route-base" d="M100 50 L300 50 L500 50 C600 50 610 146 700 146 L900 146" />
            {[0,1,2,3].map((n) => <path key={n} markerEnd={`url(#lane-arrow-${stageIndex >= n ? "active" : "muted"})`} className={`tv-route-segment ${stageIndex > n ? "tv-route-segment--lit" : ""} ${stageIndex === n ? "tv-route-segment--focus" : ""}`} d={["M178 50 L222 50","M378 50 L422 50","M578 50 C604 50 594 146 622 146","M778 146 L822 146"][n]} />)}
            <path className="tv-route-conditional" markerEnd="url(#lane-arrow-handoff)" d="M700 146 C700 190 765 204 820 204" />
          </svg>
          <div className="tv-route-stage-grid" role="tablist" aria-label={`${scenario.title} connected workflow stages`}>
            {stageData.map((stage, index) => <button id={`lane-stage-${index}`} key={stage.key} type="button" role="tab" aria-selected={lockedStage === index} aria-controls="lane-selected-detail" tabIndex={lockedStage === index ? 0 : -1} className={`tv-route-stage ${index === stageIndex ? "tv-route-stage--preview" : ""} ${index <= stageIndex ? "tv-route-stage--route" : ""} ${index === 3 ? "tv-route-stage--gate" : ""}`} style={{ gridColumn: index + 1, gridRow: index < 3 ? 1 : 2 }} onClick={() => { setLockedStage(index); setPreviewStage(null); }} onMouseEnter={() => setPreviewStage(index)} onMouseLeave={() => setPreviewStage(null)} onFocus={() => setPreviewStage(index)} onBlur={() => setPreviewStage(null)} onKeyDown={(event) => keyboard(event, index)}>
              <span className="tv-stage-no">0{index + 1}</span><strong>{stage.label}</strong>{index === 3 && <span className="tv-gate-label">OWNER APPROVAL GATE</span>}
            </button>)}
            <div className="tv-route-handoff"><span>CONDITIONAL HANDOFF</span><strong>{scenario.id === "roaming-fraud-investigation" ? "Authorised NEP / NOC" : "Authorised execution interface"}</strong><small>Only where applicable, after approval</small></div>
          </div>
        </div>
      </div>
      <div className="tv-route-legend"><span><i className="tv-dot--work" /> Evidence work</span><span><i className="tv-dot--owner" /> Owner decision</span><span><i className="tv-dot--handoff" /> Conditional authorised handoff</span><em>Hover / focus previews · select to hold</em></div>
      <div className="tv-route-detail" id="lane-selected-detail" role="tabpanel" aria-live="polite">
        <div className="tv-route-detail-head"><div><span className="tv-kicker">{scenario.title} · {department?.title ?? scenario.departmentId}</span><h4>{stageData[stageIndex].label}</h4></div><p>{scenario.stages[keyStage]}</p></div>
        <div className="tv-route-detail-meta"><div><strong>Owner approval boundary</strong><span>{scenario.boundary}</span></div><div><strong>Audit &amp; recovery</strong><span>{scenario.auditRecovery}</span></div></div>
        {metricData.map(metric => <CompactMetric key={metric.id} id={metric.id} />)}
      </div>
    </section>
    <div className="tv-footnote"><strong>Authority stays with its owner.</strong> Approval is not automatic; network changes remain with authorised NEP / NOC teams.</div>
  </section>;
}
