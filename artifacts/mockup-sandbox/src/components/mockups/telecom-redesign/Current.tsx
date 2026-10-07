import React from "react";
import "./_group.css";
import {pov,MetricsContext,MetricList,PriorityMatrix,Workforce,Architecture,ScenarioWalkthrough,extractedStyles} from "./_shared/Extracted";
const F="content.telecomPov";
const TELECOM_FIGURES_NOTE="Figures are sourced outcomes reported at other operators or illustrative KPI targets. They are not Cognirise delivery results or guarantees; applicability depends on operator context.";
export function Current(){const [workflowId,setWorkflowId]=React.useState(pov.scenarios[0].id); return <MetricsContext.Provider value={new Map(pov.metrics.map(m=>[m.id,m]))}><main className="industry telecom" style={{padding:"48px"}}><style>{extractedStyles}</style><section style={{background:"#071936",color:"white",padding:40}}><div className="tc-pools" id="telecom-value-pools" aria-labelledby="pools-title">
            <div className="tc-head"><div><div className="ind-kicker">Six value pools</div><h3 id="pools-title">Where the business around the network moves.</h3></div><p data-cms-field={`${F}.note`}>{pov.note}</p></div>
            <p className="tc-note" role="note">{TELECOM_FIGURES_NOTE}</p>
            <ol className="tc-pool-list">{pov.valuePools.map((pool, i) => <li key={pool.title} className="tc-pool" data-testid={`value-pool-${i}`}>
              <span className="tc-num">0{i + 1}</span>
              <div><h4 data-cms-field={`${F}.valuePools.${i}.title`}>{pool.title}</h4><p data-cms-field={`${F}.valuePools.${i}.body`}>{pool.body}</p></div>
              <div className="tc-rail" aria-hidden="true" />
              <MetricList ids={pool.metricIds} />
            </li>)}</ol>
            <p className="tc-small">Rails are qualitative and equal: the pools are not compared on a common numeric scale.</p>
          </div></section><PriorityMatrix candidates={pov.candidates}/><section className="ind-capabilities"><div className="ind-kicker">Enterprise workforce</div><h2>18 departments. Three domains.</h2><Workforce departments={pov.departments}/><Architecture pov={pov} workflowId={workflowId} setWorkflowId={setWorkflowId}/></section><section style={{paddingTop:50}}><h2>Bounded workflows, owned decisions.</h2><ScenarioWalkthrough id="current-workflows" scenarios={pov.scenarios} departments={pov.departments}/><h2>Revenue assurance &amp; fraud, connected by evidence</h2><ScenarioWalkthrough id="current-rafm" scenarios={pov.scenarios.filter(s=>s.id==="roaming-fraud-investigation" || s.id==="revenue-leakage-reconciliation")} departments={pov.departments}/></section></main></MetricsContext.Provider>; }
