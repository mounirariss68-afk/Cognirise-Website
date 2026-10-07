import React from "react";
import "./_group.css";
import "./TelecomVariants.css";
import content from "./_shared/content.json";

const pov = content.telecomPov;
const scenarios = pov.scenarios.filter((item) => pov.rafm.scenarioIds.includes(item.id));
const stages = [["detect","Detect"],["investigate","Investigate"],["propose","Propose"],["approveExecute","Approve / execute"],["verify","Verify"]] as const;
const metricText: Record<string, string> = { target: "Illustrative KPI target", unresolved: "KPI under review", reported: "Reported telco outcome" };

function EvidenceMetric({ id }: { id: string }) {
  const metric = pov.metrics.find((item) => item.id === id);
  if (!metric) return null;
  return <div className={`tv-metric tv-metric--${metric.classification}`}><span className="tv-metric-name">{metric.name}</span>{metric.value && <strong className="tv-metric-value">{metric.value}</strong>}<span className="tv-metric-class">{metricText[metric.classification]} · {metric.classification === "unresolved" ? "Definition proposed; value withheld pending baseline and scope." : "Validate against operator baseline; not an outcome or guarantee."}</span></div>;
}

export function EvidenceMap() {
  const [scenarioId, setScenarioId] = React.useState(scenarios[0].id);
  const [selectedStage, setSelectedStage] = React.useState(0);
  const [previewStage, setPreviewStage] = React.useState<number | null>(null);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const currentIndex = previewStage ?? selectedStage;
  const currentKey = stages[currentIndex][0];
  const department = pov.departments.find((item) => item.id === scenario.departmentId);
  const toggleCase = (id: string) => { setScenarioId(id); setSelectedStage(0); setPreviewStage(null); };
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % stages.length;
    else if (event.key === "ArrowLeft") next = (index + stages.length - 1) % stages.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = stages.length - 1;
    else return;
    event.preventDefault(); setSelectedStage(next); document.getElementById(`map-stage-${next}`)?.focus();
  };
  return <main className="tv tv-shell tv-map-concept">
    <header className="tv-head">
      <div><div className="tv-kicker">Revenue &amp; fraud A · Connected evidence</div><h2>Shared evidence. Separate cases.</h2><p>{pov.rafm.body}</p></div>
      <div className="tv-edition"><strong>Evidence connectivity</strong>Permissioned references · no new data lake</div>
    </header>
    <section className="tv-map-layout">
      <div className="tv-map">
        <div className="tv-map-title"><h3>Permitted records can be correlated</h3><span>Evidence sources remain in existing systems</span></div>
        <div className="tv-evidence-graph" aria-label="Conceptual permissioned case-reference associations">
          <svg className="tv-evidence-links" viewBox="0 0 1000 340" preserveAspectRatio="none" role="img" aria-label="Non-directional association lines connect evidence sources with separate case references">
            <path className={`tv-evidence-link ${scenario.id === "revenue-leakage-reconciliation" ? "is-active" : ""}`} d="M360 58 C505 58 530 102 665 102" />
            <path className={`tv-evidence-link tv-evidence-link--fraud ${scenario.id === "roaming-fraud-investigation" ? "is-active" : ""}`} d="M360 58 C500 58 535 232 665 232" />
            <path className={`tv-evidence-link ${scenario.id === "revenue-leakage-reconciliation" ? "is-active" : ""}`} d="M360 169 C500 169 535 102 665 102" />
            <path className={`tv-evidence-link tv-evidence-link--fraud ${scenario.id === "roaming-fraud-investigation" ? "is-active" : ""}`} d="M360 169 C505 169 530 232 665 232" />
            <path className={`tv-evidence-link ${scenario.id === "revenue-leakage-reconciliation" ? "is-active" : ""}`} d="M360 280 C500 280 535 102 665 102" />
            <path className={`tv-evidence-link tv-evidence-link--fraud ${scenario.id === "roaming-fraud-investigation" ? "is-active" : ""}`} d="M360 280 C500 280 535 232 665 232" />
            <g className="tv-link-endpoints"><circle cx="360" cy="58" r="5"/><circle cx="360" cy="169" r="5"/><circle cx="360" cy="280" r="5"/><circle cx="665" cy="102" r="6"/><circle cx="665" cy="232" r="6"/></g>
          </svg>
          <div className="tv-evidence-source-list">
            <div className="tv-evidence-source"><span>01</span><div><strong>Usage &amp; telemetry</strong><small>Read-only evidence</small></div></div>
            <div className="tv-evidence-source"><span>02</span><div><strong>Billing records</strong><small>Ledger and rating evidence</small></div></div>
            <div className="tv-evidence-source"><span>03</span><div><strong>Partner evidence</strong><small>Contracts &amp; settlements</small></div></div>
          </div>
          <div className="tv-reference-label">Permissioned case refs<br/><small>conceptual, non-directional associations</small></div>
          <div className="tv-case-reference-list" aria-label="Choose a separate investigation">
            {scenarios.map((item) => <button key={item.id} className={`tv-case-reference ${item.id === "roaming-fraud-investigation" ? "tv-case-reference--fraud" : ""}`} type="button" aria-pressed={scenario.id === item.id} onClick={() => toggleCase(item.id)}>
              <span className="tv-ref-index">{item.id === "revenue-leakage-reconciliation" ? "A" : "B"}</span><span><strong>{item.title}</strong><small>{item.owner} · distinct case</small></span><span className="tv-ref-arrow" aria-hidden="true">↗</span>
            </button>)}
          </div>
        </div>
        <div className="tv-map-caveat">These lines show possible permissioned references, not proven data dependencies or direction of transfer. Records stay in existing systems; leakage and fraud remain separate cases.</div>
      </div>
      <div className="tv-map-detail">
        <div className="tv-kicker">Selected investigation</div><h3>{scenario.title}</h3><div className="tv-case-owner">{department?.title ?? "Operations"} · {scenario.owner}</div>
        <div className="tv-walk-tabs" role="tablist" aria-label={`${scenario.title} investigation stages`}>
          {stages.map(([key,label],index) => <button id={`map-stage-${index}`} key={key} type="button" role="tab" aria-selected={selectedStage === index} aria-controls="map-stage-panel" tabIndex={selectedStage === index ? 0 : -1} className="tv-stage" onClick={() => { setSelectedStage(index); setPreviewStage(null); }} onMouseEnter={() => setPreviewStage(index)} onMouseLeave={() => setPreviewStage(null)} onFocus={() => setPreviewStage(index)} onBlur={() => setPreviewStage(null)} onKeyDown={(event) => keyboard(event,index)}><span className="tv-stage-no">0{index+1}</span><strong>{label}</strong></button>)}
        </div>
        <div id="map-stage-panel" role="tabpanel" aria-live="polite">
          <div className="tv-detail-callout"><h4>{stages[currentIndex][1]}</h4><p>{scenario.stages[currentKey]}</p></div>
          <dl className="tv-case-meta"><div><dt>Boundary</dt><dd>{scenario.boundary}</dd></div><div><dt>Audit &amp; recovery</dt><dd>{scenario.auditRecovery}</dd></div></dl>
          <div className="tv-metric-band">
            {scenario.id === "revenue-leakage-reconciliation" ? <><EvidenceMetric id="leakage" /><EvidenceMetric id="recovery-value" /></> : <EvidenceMetric id="fraud-loss" />}
          </div>
        </div>
      </div>
    </section>
  </main>;
}
