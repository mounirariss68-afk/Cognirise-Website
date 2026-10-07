import React from "react";
import "./_group.css";
import "./architecture-system.css";
import data from "./_shared/content.json";
import { MetricsContext, MetricList } from "./_shared/Extracted";

const pov = data.telecomPov;
const domains = ["Business", "Operations", "Foundations"] as const;
export function ArchitectureSystem() {
  const [workflowId, setWorkflowId] = React.useState(pov.scenarios[0].id);
  const selected = pov.scenarios.find((scenario) => scenario.id === workflowId) ?? pov.scenarios[0];
  const department = pov.departments.find((item) => item.id === selected.departmentId) ?? pov.departments[0];
  const metrics = new Map(pov.metrics.map((metric) => [metric.id, metric]));

  return <MetricsContext.Provider value={metrics}>
    <main className="telecom-exploration architecture-system">
      <header className="as-header"><div><span className="as-kicker">Telecom application architecture</span><h1>Four parts.<br /><em>Clear boundaries.</em></h1></div><p>Domain-limited coordination brings business, operations and foundations together with permissioned data integration and authorised execution—each within a clear owner boundary.</p></header>
      <section className="as-system" aria-label="Connected system view">
        <div className="as-system-intro"><span>Telecom application view</span><strong>One operating model, four distinct responsibilities</strong></div>
        <div className="as-map">
          <article className="as-node as-orchestration"><span className="as-node-id">01 / COORDINATE</span><h2>Domain-limited orchestration</h2><p>{pov.architecture.orchestration}</p><div className="as-tags"><span>Named tasks</span><span>Scoped identities</span><span>Explicit handoffs</span></div></article>
          <div className="as-link as-link-down"><span>delegates named tasks</span><i /></div>
          <article className="as-domains">
            <div className="as-domain-title"><span>02 / PARTICIPATE</span><strong>Business, Operations and Foundations</strong><small>{pov.architecture.domains}</small></div>
            <div className="as-domain-columns">
              {domains.map((domain, index) => <div key={domain} className={`as-domain-col ${department.domain === domain ? "is-active" : ""}`}>
                <span className="as-domain-code">0{index + 1}</span><h3>{domain}</h3><span>{pov.departments.filter((item) => item.domain === domain).length} departments</span>
                {department.domain === domain && <b className="as-selected-department">{department.title}<small>selected work owner</small></b>}
              </div>)}
            </div>
          </article>
          <div className="as-link as-link-split"><span>permissioned records · approved contracts</span><i /></div>
          <div className="as-lower">
            <article className="as-node as-foundation"><span className="as-node-id">03 / CONNECT</span><h2>Data and integration foundation</h2><p>{pov.architecture.foundation}</p></article>
            <div className="as-link as-cross"><span>supported integration</span><i /></div>
            <article className="as-node as-execution"><span className="as-node-id">04 / AUTHORISE</span><h2>Authorised execution &amp; handoffs</h2><p>{pov.architecture.execution}</p><div className="as-owner-line"><span>Network authority</span><strong>NEP / NOC retains network control</strong></div></article>
          </div>
        </div>
      </section>
      <section className="as-workflows" aria-label="Select a workflow">
        <div className="as-workflow-head"><div><span className="as-kicker">Application path</span><h2>Choose a real workflow to trace its owner boundary.</h2></div><span className="as-workflow-count">0{pov.scenarios.length} workflows</span></div>
        <div className="as-workflow-rail" role="group" aria-label="Available workflows">
          {pov.scenarios.map((scenario, index) => <button type="button" key={scenario.id} aria-pressed={workflowId === scenario.id} className={workflowId === scenario.id ? "active" : ""} onClick={() => setWorkflowId(scenario.id)}><span>0{index + 1}</span>{scenario.title}</button>)}
        </div>
        <div className="as-selected-context" aria-live="polite">
          <div className="as-context-primary"><span>Selected department · {department.domain}</span><h3>{department.title}</h3><p>{department.challenge}</p><div className="as-system-source"><small>Systems in scope</small><span>{department.systems}</span></div></div>
          <div className="as-context-owner"><span>Accountable owner</span><strong>{selected.owner}</strong><span className="as-boundary-label">Approval &amp; execution boundary</span><p>{selected.boundary}</p><div className="as-audit"><span>Audit and recovery</span><p>{selected.auditRecovery}</p></div><MetricList ids={selected.metricIds} /></div>
        </div>
        <p className="as-network-note">Network telemetry is input only. NEP/NOC controls network changes; authorised network owners receive approved handoffs.</p>
      </section>
    </main>
  </MetricsContext.Provider>;
}
