import React from "react";
import "./_group.css";
import "./workforce-map.css";
import data from "./_shared/content.json";
import { MetricsContext, MetricList } from "./_shared/Extracted";

const pov = data.telecomPov;
const domains = ["Business", "Operations", "Foundations"] as const;

export function WorkforceMap() {
  const [selectedId, setSelectedId] = React.useState(pov.departments[0].id);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const department = pov.departments.find((item) => item.id === selectedId) ?? pov.departments[0];
  const preview = pov.departments.find((item) => item.id === (hoverId ?? selectedId)) ?? department;
  const departmentIndex = pov.departments.indexOf(department);
  const metrics = new Map(pov.metrics.map((metric) => [metric.id, metric]));

  return <MetricsContext.Provider value={metrics}>
    <main className="telecom-exploration workforce-map">
      <header className="wm-heading">
        <div><span className="wm-kicker">Enterprise workforce / operating map</span><h1>18 departments.<br /><i>Three domains.</i></h1></div>
        <p>Explore the work around the network. Select a department to see its functional roles, operating context and the controls that stay with its owners.</p>
        <div className="wm-count"><strong>115</strong><span>role patterns<br />across the organisation</span></div>
      </header>
      <div className="wm-layout">
        <section className="wm-map" aria-label="Three-domain organisation map">
          <div className="wm-map-top"><span>Organisation map</span><span>6 departments in each domain</span></div>
          <div className="wm-signal" aria-hidden="true"><span /><span /><span /></div>
          {domains.map((domain, domainIndex) => {
            const list = pov.departments.filter((item) => item.domain === domain);
            return <div className={`wm-domain wm-domain-${domainIndex}`} key={domain}>
              <div className="wm-domain-label"><b>0{domainIndex + 1}</b><h2>{domain}</h2><span>{list.length} departments</span></div>
              <div className="wm-nodes">
                {list.map((item) => <button key={item.id} type="button" aria-pressed={selectedId === item.id} className={`wm-node ${selectedId === item.id ? "is-selected" : ""} ${hoverId === item.id ? "is-preview" : ""}`}
                  onMouseEnter={() => setHoverId(item.id)} onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(item.id)} onBlur={() => setHoverId(null)}
                  onClick={() => setSelectedId(item.id)}>
                  <span className="wm-node-dot" aria-hidden="true" /><span className="wm-node-name">{item.title}</span><span className="wm-node-roles">{item.roles.length} roles</span>
                </button>)}
              </div>
            </div>;
          })}
          <div className="wm-preview" aria-live="polite"><span className="wm-preview-mark" /><div><span>Work preview{hoverId ? " · hover" : " · selected"}</span><p><strong>{preview.title}</strong> — {preview.challenge}</p></div></div>
        </section>
        <aside className="wm-detail" aria-live="polite" aria-label={`${department.title} department detail`}>
          <div className="wm-detail-top"><span>{department.domain} / selected department</span><span>{String(departmentIndex + 1).padStart(2, "0")} / 18</span></div>
          <h2>{department.title}</h2><p className="wm-challenge">{department.challenge}</p>
          <div className="wm-sectionline"><span>Functional roles</span><span>{department.roles.length} patterns</span></div>
          <ul className="wm-role-list">{department.roles.map((role, index) => <li key={role.title}><span className="wm-role-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{role.title}</strong><p>{role.body}</p></div></li>)}</ul>
          <div className="wm-context">
            <div><span>Systems</span><p>{department.systems}</p></div>
            <div><span>Actions</span><p>{department.actions}</p></div>
            <div className="wm-owner-control"><span>Owner controls</span><p>{department.controls}</p></div>
          </div>
          <div className="wm-metrics"><span>Relevant measures</span><MetricList ids={department.metricIds} /></div>
        </aside>
      </div>
    </main>
  </MetricsContext.Provider>;
}
