import React from "react";
import "./_group.css";
import "./workforce-explorer.css";
import data from "./_shared/content.json";
import { MetricsContext, MetricList } from "./_shared/Extracted";

const pov = data.telecomPov;
const domains = ["Business", "Operations", "Foundations"] as const;
const deptRoleCount = pov.departments.reduce((total, department) => total + department.roles.length, 0);

export function WorkforceExplorer() {
  const [domain, setDomain] = React.useState<typeof domains[number]>("Operations");
  const departments = pov.departments.filter((item) => item.domain === domain);
  const [selectedId, setSelectedId] = React.useState(departments[0].id);
  const selected = pov.departments.find((item) => item.id === selectedId && item.domain === domain) ?? departments[0];
  const [roleIndex, setRoleIndex] = React.useState(0);
  const role = selected.roles[roleIndex] ?? selected.roles[0];
  const [contextOpen, setContextOpen] = React.useState(false);
  const metrics = new Map(pov.metrics.map((metric) => [metric.id, metric]));

  function chooseDomain(next: typeof domains[number]) {
    setDomain(next);
    const first = pov.departments.find((item) => item.domain === next);
    if (first) setSelectedId(first.id);
    setRoleIndex(0);
    setContextOpen(false);
  }
  function chooseDepartment(id: string) {
    setSelectedId(id);
    setRoleIndex(0);
    setContextOpen(false);
  }
  return <MetricsContext.Provider value={metrics}>
    <main className="telecom-exploration workforce-explorer">
      <header className="we-head">
        <div><span className="we-kicker">Work design / explore by department</span><h1>Start with the work.<br /><em>Then meet the roles.</em></h1></div>
        <p>Choose a business domain, move through its departments, and open a functional role to understand the contribution and the owner-held guardrails.</p>
        <strong className="we-total"><b>{deptRoleCount}</b><span>functional role<br />patterns in scope</span></strong>
      </header>
      <nav className="we-domain-nav" aria-label="Select a workforce domain">
        {domains.map((item, index) => <button key={item} type="button" aria-pressed={domain === item} onClick={() => chooseDomain(item)} className={domain === item ? "active" : ""}><span>0{index + 1}</span>{item}<small>06 departments</small></button>)}
      </nav>
      <div className="we-explorer">
        <aside className="we-department-index" aria-label={`${domain} departments`}>
          <div className="we-index-heading"><span>{domain}</span><span>{departments.length} divisions</span></div>
          {departments.map((item, i) => <button key={item.id} type="button" aria-pressed={selected.id === item.id} onClick={() => chooseDepartment(item.id)} className={selected.id === item.id ? "active" : ""}>
            <span className="we-dept-num">{String(i + 1).padStart(2, "0")}</span><span className="we-dept-name">{item.title}</span><span className="we-dept-rolecount">{item.roles.length}</span>
          </button>)}
          <div className="we-index-foot"><span>Department challenge</span><p>{selected.challenge}</p></div>
        </aside>
        <section className="we-work" aria-live="polite">
          <div className="we-work-heading"><div><span>{selected.domain} / functional role map</span><h2>{selected.title}</h2></div></div>
          <p className="we-challenge">{selected.challenge}</p>
          <div className="we-metrics"><span>Relevant measure</span><MetricList ids={selected.metricIds} /></div>
          <div className="we-role-layout">
            <div className="we-role-index" role="listbox" aria-label={`Functional roles for ${selected.title}`}>
              {selected.roles.map((item, i) => <button key={item.title} type="button" role="option" aria-selected={i === roleIndex} className={i === roleIndex ? "active" : ""} onClick={() => setRoleIndex(i)} onMouseEnter={() => setRoleIndex(i)}>
                <span>{String(i + 1).padStart(2, "0")}</span><strong>{item.title}</strong><i aria-hidden="true" />
              </button>)}
              <div className="we-role-total">{selected.roles.length} role patterns · {deptRoleCount} organisation-wide</div>
            </div>
            <article className="we-role-focus">
              <div className="we-role-count">ROLE {String(roleIndex + 1).padStart(2, "0")} <span>/ {String(selected.roles.length).padStart(2, "0")}</span></div>
              <h3>{role.title}</h3><p>{role.body}</p>
              <div className="we-focus-rule"><span>Department</span><strong>{selected.title}</strong></div>
              <button type="button" className="we-context-toggle" aria-expanded={contextOpen} onClick={() => setContextOpen((open) => !open)}>{contextOpen ? "Close operating context" : "Open operating context"}<span aria-hidden="true">{contextOpen ? "−" : "+"}</span></button>
              {contextOpen && <div className="we-operating-context">
                <div><span>Systems</span><p>{selected.systems}</p></div>
                <div><span>Actions</span><p>{selected.actions}</p></div>
                <div className="we-controls"><span>Owner controls</span><p>{selected.controls}</p></div>
              </div>}
            </article>
          </div>
        </section>
      </div>
      <footer className="we-footer"><span className="we-footer-signal" /><p><strong>Roles are illustrative support patterns.</strong> Department owners retain approvals; network changes remain with authorised NEP/NOC teams.</p><span>Operational context stays attached to the role.</span></footer>
    </main>
  </MetricsContext.Provider>;
}
