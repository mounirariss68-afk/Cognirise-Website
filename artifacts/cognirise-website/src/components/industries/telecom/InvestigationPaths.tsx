import React from "react";
import { CompactMetric } from "./CompactMetric";
import { useTelecomData } from "./TelecomData";
import type { TelecomPov } from "@workspace/api-zod";

const stages = [["detect","Detect"],["investigate","Investigate"],["propose","Propose"],["approveExecute","Approve / execute"],["verify","Verify"]] as const;
const classification: Record<string, string> = { target: "Illustrative KPI target", unresolved: "KPI under review", reported: "Reported telco outcome" };

function CasePath({ scenario, onStage }: { scenario: TelecomPov["scenarios"][number]; onStage: (id: string, index: number) => void }) {
  const [selected, setSelected] = React.useState(0);
  const [preview, setPreview] = React.useState<number | null>(null);
  const index = preview ?? selected;
  const key = stages[index][0];
  const choose = (n: number) => { setSelected(n); setPreview(null); onStage(scenario.id, n); };
  const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>, n: number) => {
    let next = n;
    if (event.key === "ArrowRight") next = (n + 1) % stages.length;
    else if (event.key === "ArrowLeft") next = (n + stages.length - 1) % stages.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = stages.length - 1;
    else return;
    event.preventDefault(); choose(next); document.getElementById(`${scenario.id}-path-${next}`)?.focus();
  };
  const fraud = scenario.id === "roaming-fraud-investigation";
  const metricIds = scenario.metricIds;
  return <article className={`tv-path ${fraud ? "tv-path--fraud" : ""}`}>
    <div className="tv-path-heading"><h4>{scenario.title}</h4><span>{fraud ? "Fraud investigation" : "Leakage reconciliation"}</span></div>
    <div className="tv-path-stages" role="tablist" aria-label={`${scenario.title} stages`}>
      {stages.map(([stage,label],n) => <button id={`${scenario.id}-path-${n}`} key={stage} type="button" role="tab" aria-selected={selected === n} aria-controls={`${scenario.id}-path-panel`} tabIndex={selected === n ? 0 : -1} className="tv-path-stage" onClick={() => choose(n)} onMouseEnter={() => setPreview(n)} onMouseLeave={() => setPreview(null)} onFocus={() => setPreview(n)} onBlur={() => setPreview(null)} onKeyDown={(event) => keyDown(event,n)}><b>0{n+1}</b><span>{label}</span></button>)}
    </div>
    <div className="tv-path-info" id={`${scenario.id}-path-panel`} role="tabpanel" aria-live="polite">
      <p><strong>{stages[index][1]}:</strong> {scenario.stages[key]}</p>
      <div className="tv-path-owner"><strong>Process owner:</strong> {scenario.owner}</div>
      <div className="tv-path-owner"><strong>Boundary:</strong> {scenario.boundary}</div>
      <div className="tv-path-owner"><strong>Audit &amp; recovery:</strong> {scenario.auditRecovery}</div>
      <div className="tv-path-metrics">{metricIds.map((id) => <CompactMetric key={id} id={id} />)}</div>
    </div>
  </article>;
}

export function InvestigationPaths() {
  const pov = useTelecomData();
  const cases = pov.scenarios.filter((item) => pov.rafm.scenarioIds.includes(item.id));
  const [focus, setFocus] = React.useState("revenue-leakage-reconciliation");
  const [focusStage, setFocusStage] = React.useState(0);
  const chooseStage = (id: string, stage: number) => { setFocus(id); setFocusStage(stage); };
  return <section className="tv tv-shell tv-paths-concept">
    <header className="tv-head">
      <div><div className="tv-kicker">Revenue &amp; fraud · Two investigation paths</div><h3>Two cases. Distinct actions and authority.</h3><p>Compare leakage reconciliation with roaming-fraud investigation. Evidence connects where permitted; decision rights do not collapse into one path.</p></div>
      <div className="tv-edition"><strong>Separate investigation paths</strong>Both paths retain all five stages</div>
    </header>
    <div className="tv-paths-head"><div className="tv-kicker">Select either case and any stage</div><p>Stage focus: {stages[focusStage][1]} · {cases.find((item) => item.id === focus)?.title}</p></div>
    <section className="tv-paths" aria-label="Separate revenue assurance and fraud workflows">
      {cases.map((scenario) => <CasePath key={scenario.id} scenario={scenario} onStage={chooseStage} />)}
    </section>
    <div className="tv-connector-note"><span aria-hidden="true" />Usage, billing and partner evidence may be correlated through permissioned case references in existing systems. This is not a shared data lake or a merged case.</div>
    <div className="tv-path-boundary"><strong>Authority is deliberately split.</strong> Leakage corrections require accountable owner approval and tested recovery. Fraud restrictions and partner steering require owner approval and authorised NEP / NOC handoff; no independent network control.</div>
  </section>;
}
